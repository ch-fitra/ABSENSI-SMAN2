<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class ResetTeacherPassword extends Command
{
    protected $signature = 'teacher:reset-password';

    protected $description = 'Atur ulang password guru melalui terminal server';

    public function handle(): int
    {
        $teacher = User::where('email', strtolower(trim($this->ask('Email guru') ?? '')))->first();
        if (! $teacher) {
            $this->error('Akun guru tidak ditemukan.');

            return self::FAILURE;
        }
        $data = ['password' => $this->secret('Password baru'), 'password_confirmation' => $this->secret('Ulangi password')];
        $validator = Validator::make($data, ['password' => ['required', 'confirmed', 'string']]);
        if ($validator->fails()) {
            foreach ($validator->errors()->all() as $error) {
                $this->error($error);
            }

            return self::FAILURE;
        }
        $teacher->update(['password' => $data['password'], 'remember_token' => Str::random(60)]);
        $this->info('Password diperbarui. Sesi guru lama akan diminta masuk kembali.');

        return self::SUCCESS;
    }
}
