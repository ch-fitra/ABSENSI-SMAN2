<?php

namespace App\Http\Requests;

use App\Services\PublicAttendanceService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SubmitPublicAttendanceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if (is_string($this->input('student_name'))) {
            $this->merge(['student_name' => preg_replace('/\s+/u', ' ', trim($this->input('student_name')))]);
        }
        if (is_string($this->input('idempotency_key'))) {
            $this->merge(['idempotency_key' => strtolower($this->input('idempotency_key'))]);
        }
    }

    public function rules(): array
    {
        return [
            'student_name' => ['required', 'string', 'max:150', "regex:/\A(?=.*\p{L})[\p{L}\p{M}\s.'\x{2019}\-]+\z/u"],
            'class_name' => ['required', 'string', 'max:40', Rule::in(app(PublicAttendanceService::class)->classOptions())],
            'subject_name' => ['required', 'string', 'max:120', Rule::in(app(PublicAttendanceService::class)->subjectOptions())],
            'lesson_number' => ['required', 'integer', 'between:1,20'],
            'attendance_status' => ['required', Rule::in(['hadir', 'izin', 'sakit', 'alpa'])],
            'notes' => ['nullable', 'string', 'max:500'],
            'idempotency_key' => ['required', 'uuid'], 'website' => ['nullable', 'string', 'max:0'],
        ];
    }

    public function messages(): array
    {
        return ['required' => ':attribute wajib diisi.', 'string' => ':attribute harus berupa teks.',
            'max' => ':attribute maksimal :max karakter.', 'regex' => ':attribute tidak valid. Gunakan teks yang sesuai.',
            'not_regex' => ':attribute mengandung karakter yang tidak valid.', 'integer' => ':attribute harus berupa bilangan bulat.',
            'between' => ':attribute harus antara :min dan :max.', 'in' => 'Pilih :attribute yang tersedia.',
            'uuid' => 'Permintaan tidak valid. Muat ulang halaman dan coba kembali.', 'website.max' => 'Permintaan tidak dapat diproses.'];
    }

    public function attributes(): array
    {
        return ['student_name' => 'Nama lengkap siswa', 'class_name' => 'kelas', 'subject_name' => 'Mata pelajaran',
            'lesson_number' => 'Les ke-', 'attendance_status' => 'status kehadiran', 'notes' => 'Keterangan',
            'idempotency_key' => 'Kode permintaan'];
    }
}
