<?php

namespace App\Http\Requests;

use App\Models\PublicAttendanceForm;
use Illuminate\Foundation\Http\FormRequest;

class StorePublicAttendanceFormRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create', PublicAttendanceForm::class) ?? false;
    }

    public function rules(): array
    {
        return ['title' => ['required', 'string', 'max:150', 'not_regex:/[<>\x00-\x1F\x7F]/u'],
            'duration_minutes' => ['required', 'integer', 'between:1,1440'],
            'teacher_id' => 'prohibited', 'public_token' => 'prohibited', 'starts_at' => 'prohibited', 'expires_at' => 'prohibited'];
    }

    public function messages(): array
    {
        return ['required' => ':attribute wajib diisi.', 'string' => ':attribute harus berupa teks.',
            'max' => ':attribute maksimal :max karakter.', 'integer' => ':attribute harus berupa bilangan bulat.',
            'between' => ':attribute harus antara :min dan :max menit.', 'not_regex' => ':attribute mengandung karakter yang tidak valid.',
            'prohibited' => ':attribute tidak boleh ditentukan dari formulir.'];
    }

    public function attributes(): array
    {
        return ['title' => 'Judul formulir', 'duration_minutes' => 'Durasi aktif',
            'teacher_id' => 'Guru pembuat', 'public_token' => 'Token publik',
            'starts_at' => 'Waktu mulai', 'expires_at' => 'Waktu kedaluwarsa'];
    }
}
