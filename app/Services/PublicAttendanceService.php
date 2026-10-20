<?php

namespace App\Services;

use App\Models\PublicAttendanceForm;
use App\Models\PublicAttendanceSubmission;
use App\Models\SchoolClass;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PublicAttendanceService
{
    /** @return list<string> */
    public function classOptions(): array
    {
        $defaults = [];
        foreach (['X', 'XI', 'XII'] as $grade) {
            foreach (range(1, 8) as $number) {
                $defaults[] = $grade.'-'.$number;
            }
        }

        return array_values(array_unique([...$defaults, ...SchoolClass::where('is_active', true)->orderBy('name')->pluck('name')->all()]));
    }

    /** @param array{title: string, duration_minutes: int} $data */
    public function create(User $teacher, array $data): PublicAttendanceForm
    {
        $start = now()->utc()->startOfSecond();

        return PublicAttendanceForm::create([
            'teacher_id' => $teacher->id,
            'title' => $data['title'],
            'duration_minutes' => $data['duration_minutes'],
            'public_token' => bin2hex(random_bytes(32)),
            'starts_at' => $start,
            'expires_at' => $start->copy()->addMinutes($data['duration_minutes']),
        ]);
    }

    /** @param array{student_name: string, class_name: string, subject_name: string, lesson_number: int, attendance_status: string, notes?: ?string, idempotency_key: string} $data */
    public function submit(PublicAttendanceForm $form, array $data): PublicAttendanceSubmission
    {
        $payload = [
            'student_name' => $data['student_name'], 'class_name' => $data['class_name'],
            'subject_name' => $data['subject_name'], 'lesson_number' => (int) $data['lesson_number'],
            'attendance_status' => $data['attendance_status'], 'notes' => $data['notes'] ?? null,
        ];
        $hash = hash('sha256', json_encode($payload, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE));

        return DB::transaction(function () use ($form, $data, $payload, $hash) {
            $locked = PublicAttendanceForm::lockForUpdate()->findOrFail($form->id);
            $existing = $locked->submissions()->where('idempotency_key', $data['idempotency_key'])->first();
            if ($existing) {
                if (! hash_equals($existing->payload_hash, $hash)) {
                    throw ValidationException::withMessages(['idempotency_key' => 'Permintaan ini sudah digunakan untuk data lain. Muat ulang halaman untuk memulai kembali.']);
                }

                return $existing;
            }
            $receivedAt = now()->utc();
            if ($receivedAt->lt($locked->starts_at) || $receivedAt->gte($locked->expires_at)) {
                throw ValidationException::withMessages(['submission' => 'Batas waktu pengisian absensi sudah selesai. Silakan hubungi guru.']);
            }

            return $locked->submissions()->create([
                ...$payload,
                'normalized_name' => mb_strtolower(preg_replace('/\s+/u', ' ', trim($data['student_name']))),
                'idempotency_key' => $data['idempotency_key'],
                'payload_hash' => $hash,
                'submitted_at' => $receivedAt,
            ]);
        }, 5);
    }

    /** @return array<string, mixed> */
    public function teacherData(PublicAttendanceForm $form): array
    {
        return [...$form->toArray(), 'is_active' => $form->isActive(), 'public_url' => $form->publicUrl(),
            'detail_url' => route('teacher.public-attendance.show', $form),
            'responses_url' => route('teacher.public-attendance.responses', $form),
            'report_url' => route('teacher.public-attendance.report', $form)];
    }
}
