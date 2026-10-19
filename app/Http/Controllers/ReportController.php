<?php

namespace App\Http\Controllers;

use App\Http\Requests\ReportRequest;
use App\Models\AttendanceSession;
use App\Services\AttendanceReportService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;

class ReportController extends Controller
{
    public function __invoke(ReportRequest $request, AttendanceReportService $reports)
    {
        $role = $request->is('guru/*') ? 'teacher' : 'student';
        $filters = $request->validated();
        if ($role === 'teacher' && ! empty($filters['session_id'])) {
            Gate::authorize('view', AttendanceSession::findOrFail($filters['session_id']));
        }
        $query = $reports->records($role, $request->user()->id, $filters);
        if ((clone $query)->count() > 5000) {
            throw ValidationException::withMessages(['from' => 'Pilih periode lebih singkat. Maksimal 5.000 catatan per laporan PDF.']);
        }
        try {
            return Pdf::loadView('reports.attendance', [
                'records' => $query->with('attendanceSession.teacher:id,name')->orderBy('attendance_session_id')->orderBy('student_name_snapshot')->get(),
                'summary' => $reports->summary($query), 'role' => $role, 'owner' => $request->user(), 'filters' => $filters,
                'generatedAt' => now()->timezone('Asia/Jakarta')->translatedFormat('d F Y, H:i').' WIB',
            ])->setPaper('a4')->setOptions(['isRemoteEnabled' => false, 'isPhpEnabled' => false])
                ->download('laporan-absensi-'.now()->format('Y-m-d').'.pdf');
        } catch (\Throwable $e) {
            report($e);
            throw ValidationException::withMessages(['report' => 'Laporan belum dapat dibuat. Coba periode lebih singkat atau hubungi pengelola server.']);
        }
    }
}
