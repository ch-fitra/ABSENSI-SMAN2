<?php

namespace Database\Factories;

use App\Models\PublicAttendanceForm;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class PublicAttendanceSubmissionFactory extends Factory
{
    public function definition(): array
    {
        $name = fake()->name();

        return ['public_attendance_form_id' => PublicAttendanceForm::factory(), 'student_name' => $name,
            'normalized_name' => mb_strtolower($name), 'class_name' => 'X-1', 'subject_name' => 'Matematika',
            'lesson_number' => 1, 'attendance_status' => 'hadir', 'notes' => null,
            'idempotency_key' => (string) Str::uuid(), 'payload_hash' => hash('sha256', $name), 'submitted_at' => now()];
    }
}
