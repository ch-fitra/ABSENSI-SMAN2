<?php

namespace App\Http\Controllers;

use App\Http\Requests\SubmitPublicAttendanceRequest;
use App\Models\PublicAttendanceForm;
use App\Services\PublicAttendanceService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class PublicAttendanceController extends Controller
{
    public function show(Request $request, string $token, PublicAttendanceService $attendance): Response
    {
        $form = PublicAttendanceForm::where('public_token', $token)->firstOrFail();
        $receipt = $request->session()->get('public_attendance_receipt');
        $submittedAt = null;
        if (is_array($receipt) && ($receipt['form_id'] ?? null) === $form->id) {
            $submittedAt = $form->submissions()->where('idempotency_key', $receipt['key'])->first()?->submitted_at?->toIso8601String();
        }

        return Inertia::render('public-attendance/form', [
            'form' => $form->only('title', 'starts_at', 'expires_at', 'duration_minutes'),
            'isActive' => $form->isActive(), 'classes' => $submittedAt || ! $form->isActive() ? [] : $attendance->classOptions(),
            'subjects' => $attendance->subjectOptions(),
            'submitUrl' => route('public-attendance.store', ['token' => $token]),
            'idempotencyKey' => (string) Str::uuid(), 'submittedAt' => $submittedAt,
        ]);
    }

    public function store(SubmitPublicAttendanceRequest $request, string $token, PublicAttendanceService $attendance): RedirectResponse
    {
        $form = PublicAttendanceForm::where('public_token', $token)->firstOrFail();
        $submission = $attendance->submit($form, $request->validated());
        $request->session()->put('public_attendance_receipt', ['form_id' => $form->id, 'key' => $submission->idempotency_key]);

        return redirect()->route('public-attendance.show', ['token' => $token]);
    }
}
