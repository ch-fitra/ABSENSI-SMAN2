<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class PublicAttendanceReportRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('view', $this->route('form')) ?? false;
    }

    public function rules(): array
    {
        return ['search' => 'nullable|string|max:150', 'class_name' => 'nullable|string|max:40',
            'status' => ['nullable', Rule::in(['hadir', 'izin', 'sakit', 'alpa'])],
            'from' => 'nullable|date_format:Y-m-d', 'to' => 'nullable|date_format:Y-m-d|after_or_equal:from',
            'page' => 'nullable|integer|min:1', 'teacher_id' => 'prohibited'];
    }

    public function messages(): array
    {
        return ['string' => ':attribute harus berupa teks.', 'max' => ':attribute terlalu panjang.',
            'in' => 'Status kehadiran tidak valid.', 'date_format' => ':attribute harus berformat tahun-bulan-tanggal.',
            'after_or_equal' => 'Tanggal akhir tidak boleh mendahului tanggal awal.',
            'integer' => 'Nomor halaman harus berupa bilangan bulat.', 'min' => 'Nomor halaman minimal 1.',
            'prohibited' => 'Pemilik formulir tidak dapat diubah.'];
    }

    public function attributes(): array
    {
        return ['from' => 'Tanggal awal', 'to' => 'Tanggal akhir', 'search' => 'Pencarian nama',
            'class_name' => 'Kelas', 'status' => 'Status kehadiran', 'page' => 'Halaman', 'teacher_id' => 'Guru pembuat'];
    }
}
