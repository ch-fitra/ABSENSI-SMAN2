<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class PublicAttendanceFormFactory extends Factory
{
    public function definition(): array
    {
        return ['teacher_id' => User::factory(), 'title' => 'Absensi PJJ Matematika',
            'public_token' => bin2hex(random_bytes(32)), 'duration_minutes' => 30,
            'starts_at' => now()->startOfSecond(), 'expires_at' => now()->startOfSecond()->addMinutes(30)];
    }

    public function expired(): static
    {
        return $this->state(fn () => ['starts_at' => now()->subHour(), 'expires_at' => now()->subMinutes(30)]);
    }
}
