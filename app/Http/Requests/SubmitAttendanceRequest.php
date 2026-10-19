<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SubmitAttendanceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return auth('student')->check();
    }

    public function rules(): array
    {
        return ['status' => 'required|in:hadir,izin,sakit', 'notes' => 'nullable|string|max:500'];
    }
}
