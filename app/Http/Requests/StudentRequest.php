<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StudentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return auth('web')->check();
    }

    public function rules(): array
    {
        return [
            'nisn' => ['required', 'string', 'regex:/^[0-9]{10}$/', Rule::unique('students')->ignore($this->route('student'))],
            'full_name' => ['required', 'string', 'max:150', 'regex:/[\p{L}]/u'],
            'class_id' => ['required', 'integer', Rule::exists('classes', 'id')->where('is_active', true)],
            'is_active' => 'sometimes|boolean',
        ];
    }
}
