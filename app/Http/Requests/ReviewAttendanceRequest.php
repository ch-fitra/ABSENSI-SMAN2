<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ReviewAttendanceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user('web')?->can('update', $this->route('session')) ?? false;
    }

    public function rules(): array
    {
        return ['records' => 'present|array|max:2000', 'records.*.id' => 'required|integer|distinct',
            'records.*.status' => 'required|in:hadir,izin,sakit,alpa', 'records.*.notes' => 'nullable|string|max:500',
            'confirm' => 'required|boolean'];
    }
}
