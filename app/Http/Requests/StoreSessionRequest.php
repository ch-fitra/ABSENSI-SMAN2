<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreSessionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return auth('web')->check();
    }

    public function rules(): array
    {
        return ['class_id' => ['required', 'integer', Rule::exists('classes', 'id')->where('is_active', true)],
            'subject_name' => 'required|string|max:120', 'duration_minutes' => 'required|integer|min:1|max:120'];
    }
}
