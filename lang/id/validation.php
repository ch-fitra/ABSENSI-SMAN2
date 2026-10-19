<?php

return [
    'required' => ':attribute wajib diisi.', 'present' => ':attribute harus disertakan.',
    'email' => ':attribute harus berupa alamat email yang valid.', 'string' => ':attribute harus berupa teks.',
    'integer' => ':attribute harus berupa bilangan bulat.', 'boolean' => ':attribute tidak valid.',
    'unique' => ':attribute sudah terdaftar.', 'exists' => ':attribute tidak ditemukan atau sudah tidak aktif.',
    'in' => 'Pilihan :attribute tidak valid.', 'regex' => 'Format :attribute tidak valid.',
    'confirmed' => 'Konfirmasi :attribute tidak sama.', 'current_password' => 'Password saat ini tidak sesuai.',
    'date_format' => 'Format :attribute harus :format.', 'after_or_equal' => ':attribute harus sama atau setelah :date.',
    'prohibited' => ':attribute tidak diizinkan.', 'distinct' => ':attribute berisi data duplikat.',
    'file' => ':attribute harus berupa berkas.', 'mimes' => ':attribute harus berupa berkas :values.',
    'min' => ['string' => ':attribute minimal :min karakter.', 'numeric' => ':attribute minimal :min.'],
    'max' => ['string' => ':attribute maksimal :max karakter.', 'numeric' => ':attribute maksimal :max.', 'file' => ':attribute maksimal :max KB.', 'array' => ':attribute maksimal :max data.'],
    'size' => ['string' => ':attribute harus :size karakter.'],
    'password' => ['letters' => ':attribute harus mengandung huruf.', 'numbers' => ':attribute harus mengandung angka.'],
    'attributes' => ['name' => 'Nama', 'full_name' => 'Nama lengkap', 'email' => 'Email', 'password' => 'Password', 'nisn' => 'NISN',
        'class_id' => 'Kelas', 'grade_level' => 'Tingkat', 'subject_name' => 'Mata pelajaran', 'duration_minutes' => 'Durasi',
        'status' => 'Status', 'notes' => 'Keterangan', 'file' => 'File Excel', 'from' => 'Tanggal awal', 'to' => 'Tanggal akhir', 'records' => 'Data kehadiran', 'current_password' => 'Password saat ini'],
];
