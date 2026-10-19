<?php

namespace Database\Factories;

use App\Models\AttendanceSession;
use App\Models\Student;
use Illuminate\Database\Eloquent\Factories\Factory;

class AttendanceRecordFactory extends Factory
{
    public function definition(): array
    {
        return ['attendance_session_id' => AttendanceSession::factory(), 'student_id' => Student::factory(),
            'student_name_snapshot' => fake()->name(), 'nisn_snapshot' => fake()->numerify('00########')];
    }
}
