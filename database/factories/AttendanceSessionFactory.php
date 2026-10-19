<?php

namespace Database\Factories;

use App\Models\SchoolClass;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class AttendanceSessionFactory extends Factory
{
    public function definition(): array
    {
        return ['teacher_id' => User::factory(), 'class_id' => SchoolClass::factory(), 'class_name_snapshot' => 'X-1',
            'subject_name' => 'Matematika', 'duration_minutes' => 5, 'starts_at' => now(), 'ends_at' => now()->addMinutes(5), 'status' => 'active'];
    }
}
