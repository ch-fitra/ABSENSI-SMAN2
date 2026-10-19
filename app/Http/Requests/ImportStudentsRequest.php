<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ImportStudentsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return auth('web')->check();
    }

    public function rules(): array
    {
        return ['class_id' => ['required', 'integer', Rule::exists('classes', 'id')->where('is_active', true)],
            'file' => 'required|file|mimes:xlsx|max:2048'];
    }
}
