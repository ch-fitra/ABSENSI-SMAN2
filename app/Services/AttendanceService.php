<?php

namespace App\Services;

use App\Models\AttendanceChangeLog;
use App\Models\AttendanceSession;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;

class AttendanceService
{
    public function create(User $teacher, array $data): AttendanceSession
    {
        return DB::transaction(function () use ($teacher, $data) {
            // Roster mutations acquire this same class lock before changing membership.
            $class = SchoolClass::where('is_active', true)->lockForUpdate()->findOrFail($data['class_id']);
            $students = $class->students()->where('is_active', true)->orderBy('id')->get();
            if ($students->isEmpty()) {
                throw ValidationException::withMessages(['class_id' => 'Kelas ini belum memiliki siswa aktif. Tambahkan siswa terlebih dahulu.']);
            }
            $start = now();
            $session = AttendanceSession::create([
                ...$data,
                'teacher_id' => $teacher->id,
                'class_name_snapshot' => $class->name,
                'starts_at' => $start,
                'ends_at' => $start->copy()->addMinutes($data['duration_minutes']),
                'status' => 'active',
            ]);
            $session->records()->createMany($students->map(fn ($s) => [
                'student_id' => $s->id, 'student_name_snapshot' => $s->full_name, 'nisn_snapshot' => $s->nisn,
            ])->all());

            return $session;
        }, 5);
    }

    // Always acquire the session row before any participant rows in every workflow.
    // Expiration is persisted even if a late submission is subsequently rejected.
    public function reconcile(AttendanceSession $session): AttendanceSession
    {
        return DB::transaction(function () use ($session) {
            $locked = AttendanceSession::lockForUpdate()->findOrFail($session->id);
            $this->expireLocked($locked);

            return $locked;
        }, 5);
    }

    public function expireDue(?int $teacherId = null, ?int $studentId = null): void
    {
        AttendanceSession::where('status', 'active')->where('ends_at', '<=', now())
            ->when($teacherId, fn ($q) => $q->where('teacher_id', $teacherId))
            ->when($studentId, fn ($q) => $q->whereHas('records', fn ($r) => $r->where('student_id', $studentId)))
            ->select('id')->chunkById(100, function ($sessions) {
                foreach ($sessions as $session) {
                    $this->reconcile($session);
                }
            });
    }

    private function expireLocked(AttendanceSession $session): void
    {
        if ($session->status === 'active' && now()->gte($session->ends_at)) {
            // Effective automatic closure is the deadline, even when the job runs late.
            $this->closeLocked($session, $session->ends_at);
        }
    }

    private function closeLocked(AttendanceSession $session, $closedAt): void
    {
        $session->records()->whereNull('status')->update(['status' => 'alpa', 'submission_source' => 'automatic', 'updated_at' => now()]);
        $session->update(['status' => 'review', 'closed_at' => $closedAt]);
    }

    public function close(User $teacher, AttendanceSession $session): void
    {
        Gate::forUser($teacher)->authorize('update', $session);
        DB::transaction(function () use ($session) {
            $locked = AttendanceSession::lockForUpdate()->findOrFail($session->id);
            $this->expireLocked($locked);
            if ($locked->status === 'active') {
                $this->closeLocked($locked, now());
            }
        }, 5);
    }

    public function submit(Student $student, AttendanceSession $session, array $data): void
    {
        $error = DB::transaction(function () use ($student, $session, $data) {
            $locked = AttendanceSession::lockForUpdate()->findOrFail($session->id);
            $record = $locked->records()->where('student_id', $student->id)->lockForUpdate()->first();
            abort_unless($record && $student->fresh()->is_active, 403);
            $this->expireLocked($locked);
            if ($locked->status !== 'active') {
                return 'Sesi absensi sudah ditutup. Silakan hubungi guru.';
            }
            if ($record->submitted_at || $record->status !== null) {
                return 'Anda sudah mengirim absensi untuk sesi ini.';
            }
            // Read the clock after obtaining locks; waiting for a lock cannot extend the deadline.
            if (now()->gte($locked->ends_at)) {
                $this->closeLocked($locked, $locked->ends_at);

                return 'Waktu pengisian absensi sudah berakhir.';
            }
            $record->update([...$data, 'submitted_at' => now(), 'submission_source' => 'student']);

            return null;
        }, 5);
        if ($error) {
            throw ValidationException::withMessages(['status' => $error]);
        }
    }

    public function review(User $teacher, AttendanceSession $session, array $rows, bool $confirm): void
    {
        Gate::forUser($teacher)->authorize('update', $session);
        $this->reconcile($session);
        DB::transaction(function () use ($teacher, $session, $rows, $confirm) {
            $locked = AttendanceSession::lockForUpdate()->findOrFail($session->id);
            if ($locked->status === 'active') {
                throw ValidationException::withMessages(['records' => 'Tutup sesi sebelum memeriksa kehadiran.']);
            }
            $records = $locked->records()->orderBy('id')->lockForUpdate()->get()->keyBy('id');
            foreach ($rows as $row) {
                $record = $records->get($row['id']);
                abort_unless($record, 403);
                $notes = $row['notes'] ?? null;
                if ($record->status === $row['status'] && $record->notes === $notes) {
                    continue;
                }
                if (! $locked->correctionAllowed()) {
                    throw ValidationException::withMessages(['records' => 'Masa koreksi tujuh hari telah berakhir. Data hanya dapat dibaca.']);
                }
                AttendanceChangeLog::create([
                    'attendance_record_id' => $record->id, 'teacher_id' => $teacher->id,
                    'old_status' => $record->status, 'new_status' => $row['status'],
                    'old_notes' => $record->notes, 'new_notes' => $notes, 'changed_at' => now(),
                ]);
                $record->update(['status' => $row['status'], 'notes' => $notes, 'submission_source' => 'teacher']);
            }
            if ($confirm && ! $locked->confirmed_at) {
                $locked->update(['status' => 'confirmed', 'confirmed_at' => now()]);
            }
        }, 5);
    }
}
