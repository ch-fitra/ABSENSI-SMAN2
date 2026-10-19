<?php

namespace App\Services;

use App\Models\AttendanceRecord;
use App\Models\AttendanceSession;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;

class AttendanceReportService
{
    public function sessions(int $teacherId, array $filters): Builder
    {
        return $this->filterSessions(AttendanceSession::where('teacher_id', $teacherId), $filters);
    }

    public function filterSessions(Builder $query, array $filters): Builder
    {
        return $query
            ->when($filters['from'] ?? null, fn ($q, $date) => $q->where('starts_at', '>=', CarbonImmutable::parse($date, 'Asia/Jakarta')->startOfDay()->utc()))
            ->when($filters['to'] ?? null, fn ($q, $date) => $q->where('starts_at', '<=', CarbonImmutable::parse($date, 'Asia/Jakarta')->endOfDay()->utc()))
            ->when($filters['class_id'] ?? null, fn ($q, $id) => $q->where('class_id', $id))
            ->when($filters['subject'] ?? null, fn ($q, $name) => $q->where('subject_name', 'like', '%'.$name.'%'))
            ->when($filters['status'] ?? null, fn ($q, $status) => $q->where('status', $status))
            ->when($filters['session_id'] ?? null, fn ($q, $id) => $q->whereKey($id));
    }

    public function records(string $role, int $id, array $filters): Builder
    {
        return AttendanceRecord::query()->whereHas('attendanceSession', function ($q) use ($role, $id, $filters) {
            $q->whereNotNull('confirmed_at');
            if ($role === 'teacher') {
                $q->where('teacher_id', $id);
            }
            $this->filterSessions($q, $filters);
        })->when($role === 'student', fn ($q) => $q->where('student_id', $id));
    }

    public function summary(Builder $records): array
    {
        $counts = (clone $records)->reorder()->selectRaw('status, COUNT(*) as total')->groupBy('status')->pluck('total', 'status');
        $result = array_fill_keys(['hadir', 'izin', 'sakit', 'alpa'], 0);
        foreach ($result as $key => $value) {
            $result[$key] = (int) ($counts[$key] ?? 0);
        }

        return ['total' => array_sum($result), ...$result];
    }

    public function sessionData(AttendanceSession $session): array
    {
        return [...$session->toArray(), 'correction_allowed' => $session->correctionAllowed(),
            'correction_deadline' => $session->closed_at?->addDays(7)->toIso8601String()];
    }
}
