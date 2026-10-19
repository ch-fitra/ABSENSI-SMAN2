<?php

namespace Tests\Feature;

// use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class ExampleTest extends TestCase
{
    /**
     * A basic test example.
     */
    public function test_public_welcome_page_has_no_student_directory_data(): void
    {
        $this->withoutVite();
        $response = $this->get('/');

        $response->assertStatus(200)->assertInertia(fn (AssertableInertia $page) => $page
            ->component('auth/welcome')->missing('students')->where('auth.role', null));
    }
}
