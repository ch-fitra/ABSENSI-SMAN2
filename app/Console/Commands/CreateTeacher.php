<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Validator;

class CreateTeacher extends Command
{
    protected $signature = 'teacher:create';

    protected $description = 'Buat akun guru melalui akses terminal server';

    public function handle(): int
    {
        $data = ['name' => $this->ask('Nama lengkap guru'), 'email' => strtolower(trim($this->ask('Email guru') ?? '')),
            'password' => $this->secret('Password'), 'password_confirmation' => $this->secret('Ulangi password')];
        $validator = Validator::make($data, ['name' => 'required|string|max:150', 'email' => 'required|email|max:255|unique:users',
            'password' => ['required', 'confirmed', 'string']]);
        if ($validator->fails()) {
            foreach ($validator->errors()->all() as $error) {
                $this->error($error);
            }

            return self::FAILURE;
        }
        User::create(collect($data)->only('name', 'email', 'password')->all());
        $this->info('Akun guru berhasil dibuat.');

        return self::SUCCESS;
    }
}
