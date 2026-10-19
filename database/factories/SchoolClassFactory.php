<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

class SchoolClassFactory extends Factory
{
    public function definition(): array
    {
        return ['name' => 'X-'.fake()->unique()->numberBetween(1, 99999), 'grade_level' => 'X', 'is_active' => true];
    }
}
