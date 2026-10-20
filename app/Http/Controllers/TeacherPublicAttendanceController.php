<?php

namespace App\Http\Controllers;

use App\Http\Requests\PublicAttendanceReportRequest;
use App\Http\Requests\StorePublicAttendanceFormRequest;
use App\Models\PublicAttendanceForm;
use App\Models\PublicAttendanceSubmission;
use App\Services\PublicAttendanceReportService;
use App\Services\PublicAttendanceService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\Response as HttpResponse;

class TeacherPublicAttendanceController extends Controller
{
    public function __construct(private PublicAttendanceService $attendance, private PublicAttendanceReportService $reports) {}

    public function index(Request $request): Response
    {
        $query = PublicAttendanceForm::where('teacher_id', $request->user()->id);
        $active = (clone $query)->where('starts_at', '<=', now())->where('expires_at', '>', now())->count();
        $total = (clone $query)->count();

        return Inertia::render('teacher/public-attendance/index', [
            'forms' => (clone $query)->withCount('submissions')->latest('id')->paginate(12)->through(fn ($form) => $this->attendance->teacherData($form)),
            'statistics' => ['total' => $total, 'active' => $active, 'expired' => $total - $active,
                'responses' => PublicAttendanceSubmission::whereHas('publicAttendanceForm', fn ($forms) => $forms->where('teacher_id', $request->user()->id))->count()],
            'createUrl' => route('teacher.public-attendance.create'),
        ]);
    }

    public function create(): Response
    {
        Gate::authorize('create', PublicAttendanceForm::class);

        return Inertia::render('teacher/public-attendance/create', ['storeUrl' => route('teacher.public-attendance.store')]);
    }

    public function store(StorePublicAttendanceFormRequest $request): RedirectResponse
    {
        $form = $this->attendance->create($request->user(), $request->validated());

        return redirect()->route('teacher.public-attendance.show', $form)->with('success', 'Link absensi dan QR Code berhasil dibuat.');
    }

    public function show(PublicAttendanceForm $form): Response|RedirectResponse
    {
        Gate::authorize('view', $form);

        if (now()->gte($form->expires_at)) {
            return redirect()->route('teacher.public-attendance.responses', $form);
        }

        return Inertia::render('teacher/public-attendance/show', ['form' => $this->attendance->teacherData($form->loadCount('submissions'))]);
    }

    public function responses(PublicAttendanceReportRequest $request, PublicAttendanceForm $form): Response
    {
        $filters = $request->safe()->except('page');
        $query = $this->reports->submissions($form, $filters);

        return Inertia::render('teacher/public-attendance/responses', [
            'form' => $this->attendance->teacherData($form->loadCount('submissions')),
            'submissions' => $this->reports->withDuplicateIndicator(clone $query)->latest('submitted_at')->latest('id')->paginate(15)->withQueryString(),
            'summary' => $this->reports->summary($query), 'filters' => $filters,
            'classes' => $form->submissions()->distinct()->orderBy('class_name')->pluck('class_name'),
        ]);
    }

    public function report(PublicAttendanceReportRequest $request, PublicAttendanceForm $form): HttpResponse
    {
        Gate::authorize('downloadReport', $form);

        return $this->reports->download($form, $request->safe()->except('page'));
    }
}
