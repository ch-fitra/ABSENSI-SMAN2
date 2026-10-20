<?php

namespace App\Services;

use App\Models\PublicAttendanceForm;
use App\Models\PublicAttendanceSubmission;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;

class PublicAttendanceReportService
{
    /** @param array{search?: ?string, class_name?: ?string, status?: ?string, from?: ?string, to?: ?string} $filters */
    public function submissions(PublicAttendanceForm $form, array $filters): Builder
    {
        return $form->submissions()->getQuery()
            ->when($filters['search'] ?? null, fn ($q, $search) => $q->whereRaw("student_name LIKE ? ESCAPE '!'", ['%'.str_replace(['!', '%', '_'], ['!!', '!%', '!_'], $search).'%']))
            ->when($filters['class_name'] ?? null, fn ($q, $name) => $q->where('class_name', $name))
            ->when($filters['status'] ?? null, fn ($q, $status) => $q->where('attendance_status', $status))
            ->when($filters['from'] ?? null, fn ($q, $date) => $q->where('submitted_at', '>=', CarbonImmutable::parse($date, 'Asia/Jakarta')->startOfDay()->utc()))
            ->when($filters['to'] ?? null, fn ($q, $date) => $q->where('submitted_at', '<=', CarbonImmutable::parse($date, 'Asia/Jakarta')->endOfDay()->utc()));
    }

    /** @return array{total: int, hadir: int, izin: int, sakit: int, alpa: int} */
    public function summary(Builder $query): array
    {
        $counts = (clone $query)->reorder()->selectRaw('attendance_status, COUNT(*) as total')->groupBy('attendance_status')->pluck('total', 'attendance_status');
        $result = [];
        foreach (['hadir', 'izin', 'sakit', 'alpa'] as $status) {
            $result[$status] = (int) ($counts[$status] ?? 0);
        }

        return ['total' => array_sum($result), ...$result];
    }

    public function withDuplicateIndicator(Builder $query): Builder
    {
        return $query->select('public_attendance_submissions.*')->selectSub(
            PublicAttendanceSubmission::query()->from('public_attendance_submissions as duplicates')
                ->selectRaw('COUNT(*) > 1')
                ->whereColumn('duplicates.public_attendance_form_id', 'public_attendance_submissions.public_attendance_form_id')
                ->whereColumn('duplicates.normalized_name', 'public_attendance_submissions.normalized_name')
                ->whereColumn('duplicates.class_name', 'public_attendance_submissions.class_name'),
            'possible_duplicate',
        );
    }

    /** @param array<string, mixed> $filters */
    public function download(PublicAttendanceForm $form, array $filters): Response
    {
        $query = $this->submissions($form, $filters);
        if ((clone $query)->count() > 5000) {
            throw ValidationException::withMessages(['report' => 'Maksimal 5.000 respons per PDF. Persempit filter tanggal atau kelas.']);
        }
        try {
            return Pdf::loadView('reports.public-attendance', [
                'form' => $form->load('teacher:id,name'), 'records' => $query->latest('submitted_at')->latest('id')->get(),
                'summary' => $this->summary($this->submissions($form, $filters)), 'filters' => $filters,
                'generatedAt' => now()->timezone('Asia/Jakarta')->format('d/m/Y H:i').' WIB',
            ])->setPaper('a4', 'landscape')->setOptions(['isRemoteEnabled' => false, 'isPhpEnabled' => false])
                ->download('rekap-'.(Str::slug($form->title) ?: 'absensi-via-link').'-'.now()->timezone('Asia/Jakarta')->format('Y-m-d').'.pdf');
        } catch (\Throwable $error) {
            report($error);
            throw ValidationException::withMessages(['report' => 'PDF belum dapat dibuat. Coba filter lebih singkat atau hubungi pengelola server.']);
        }
    }
}
