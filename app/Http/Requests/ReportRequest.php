<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ReportRequest extends FormRequest
{
    public function authorize(): bool
    {
        return auth('web')->check() || auth('student')->check();
    }

    public function rules(): array
    {
        return ['from' => 'nullable|date_format:Y-m-d', 'to' => 'nullable|date_format:Y-m-d|after_or_equal:from',
            'class_id' => 'nullable|integer|exists:classes,id', 'subject' => 'nullable|string|max:120',
            'status' => 'nullable|in:active,review,confirmed', 'session_id' => 'nullable|integer',
            'student_id' => 'prohibited', 'teacher_id' => 'prohibited', 'page' => 'nullable|integer|min:1'];
    }
}
