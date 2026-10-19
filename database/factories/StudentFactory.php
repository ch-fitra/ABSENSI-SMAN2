<?php

namespace Database\Factories;

use App\Models\SchoolClass;
use Illuminate\Database\Eloquent\Factories\Factory;

class StudentFactory extends Factory
{
    public function definition(): array
    {
        return ['nisn' => fake()->unique()->numerify('00########'), 'full_name' => fake()->name(), 'class_id' => SchoolClass::factory(), 'is_active' => true];
    }
}
