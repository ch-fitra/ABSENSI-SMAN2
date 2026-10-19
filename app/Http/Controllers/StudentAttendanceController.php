<?php

namespace App\Http\Controllers;

use App\Http\Requests\ReportRequest;
use App\Http\Requests\SubmitAttendanceRequest;
use App\Models\AttendanceRecord;
use App\Models\AttendanceSession;
use App\Services\AttendanceReportService;
use App\Services\AttendanceService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class StudentAttendanceController extends Controller
{
    public function __construct(private AttendanceService $attendance, private AttendanceReportService $reports) {}

    public function dashboard(Request $request)
    {
        $id = $request->user()->id;
        $this->attendance->expireDue(studentId: $id);

        return Inertia::render('student/dashboard', [
            'available' => AttendanceRecord::where('student_id', $id)->whereHas('attendanceSession', fn ($q) => $q->whereNull('confirmed_at'))
                ->with('attendanceSession.teacher:id,name')->latest()->get(),
            'recent' => $this->reports->records('student', $id, [])->with('attendanceSession.teacher:id,name')->latest()->limit(5)->get(),
            'summary' => $this->reports->summary($this->reports->records('student', $id, [])),
        ]);
    }

    public function show(Request $request, AttendanceSession $session)
    {
        $record = $session->records()->where('student_id', $request->user()->id)->firstOrFail();
        $session = $this->attendance->reconcile($session);
        $record->refresh();
        // The closed placeholder status is provisional until teacher confirmation.
        if (! $session->confirmed_at && ! $record->submitted_at) {
            $record->status = null;
            $record->notes = null;
        }

        return Inertia::render('student/attendance', [
            'session' => $session->load('teacher:id,name'), 'record' => $record,
        ]);
    }

    public function submit(SubmitAttendanceRequest $request, AttendanceSession $session)
    {
        $this->attendance->submit($request->user(), $session, $request->validated());

        return back()->with('success', 'Absensi berhasil dikirim. Menunggu konfirmasi guru.');
    }

    public function history(ReportRequest $request)
    {
        $filters = $request->validated();
        $query = $this->reports->records('student', $request->user()->id, $filters);

        return Inertia::render('student/history', [
            'records' => (clone $query)->with('attendanceSession.teacher:id,name')->latest()->paginate(20)->withQueryString(),
            'filters' => $filters, 'summary' => $this->reports->summary($query),
        ]);
    }
}
