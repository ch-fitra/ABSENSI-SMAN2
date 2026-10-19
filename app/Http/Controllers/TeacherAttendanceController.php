<?php

namespace App\Http\Controllers;

use App\Http\Requests\ReportRequest;
use App\Http\Requests\ReviewAttendanceRequest;
use App\Http\Requests\StoreSessionRequest;
use App\Models\AttendanceSession;
use App\Models\SchoolClass;
use App\Services\AttendanceReportService;
use App\Services\AttendanceService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;

class TeacherAttendanceController extends Controller
{
    public function __construct(private AttendanceService $attendance, private AttendanceReportService $reports) {}

    public function dashboard(Request $request)
    {
        $id = $request->user()->id;
        $this->attendance->expireDue(teacherId: $id);
        $query = AttendanceSession::where('teacher_id', $id);

        return Inertia::render('teacher/dashboard', [
            'sessions' => (clone $query)->where('status', '!=', 'confirmed')->withCount(['records', 'records as submitted_count' => fn ($q) => $q->whereNotNull('submitted_at')])->latest()->get(),
            'recent' => (clone $query)->where('status', 'confirmed')->withCount('records')->latest()->limit(5)->get(),
            'sessionCount' => $query->count(), 'summary' => $this->reports->summary($this->reports->records('teacher', $id, [])),
        ]);
    }

    public function create(Request $request)
    {
        return Inertia::render('teacher/create-session', [
            'classes' => SchoolClass::where('is_active', true)->withCount(['students' => fn ($q) => $q->where('is_active', true)])->orderBy('name')->get(),
            'subjects' => AttendanceSession::where('teacher_id', $request->user()->id)->distinct()->pluck('subject_name'),
        ]);
    }

    public function store(StoreSessionRequest $request)
    {
        $session = $this->attendance->create($request->user(), $request->validated());

        return redirect('/guru/absensi/'.$session->id)->with('success', 'Sesi absensi berhasil dibuka.');
    }

    public function show(AttendanceSession $session)
    {
        Gate::authorize('view', $session);
        $session = $this->attendance->reconcile($session);
        $session->load(['teacher:id,name', 'records' => fn ($q) => $q->orderBy('student_name_snapshot'), 'records.changeLogs.teacher:id,name']);

        return Inertia::render('teacher/session', ['session' => $this->reports->sessionData($session)]);
    }

    public function close(Request $request, AttendanceSession $session)
    {
        $this->attendance->close($request->user(), $session);

        return back()->with('success', 'Sesi ditutup. Periksa hasil sebelum dikonfirmasi.');
    }

    public function review(ReviewAttendanceRequest $request, AttendanceSession $session)
    {
        $this->attendance->review($request->user(), $session, $request->validated('records'), $request->boolean('confirm'));

        return back()->with('success', $request->boolean('confirm') ? 'Absensi dikonfirmasi. Hasil resmi tersedia untuk siswa.' : 'Koreksi absensi berhasil disimpan.');
    }

    public function history(ReportRequest $request)
    {
        $this->attendance->expireDue(teacherId: $request->user()->id);
        $filters = $request->validated();

        return Inertia::render('teacher/history', [
            'sessions' => $this->reports->sessions($request->user()->id, $filters)->withCount('records')->latest('starts_at')->paginate(15)->withQueryString(),
            'classes' => SchoolClass::orderBy('name')->get(), 'filters' => $filters,
            'summary' => $this->reports->summary($this->reports->records('teacher', $request->user()->id, $filters)),
        ]);
    }
}
