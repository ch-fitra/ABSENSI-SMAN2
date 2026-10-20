<?php

namespace Tests;

use Illuminate\Foundation\Testing\RefreshDatabase;

/** Migrate isolated test databases additively, then roll back each test's transaction. */
trait RefreshDatabaseWithoutReset
{
    use RefreshDatabase;

    protected function migrateDatabases(): void
    {
        $this->artisan('migrate', ['--force' => true]);
    }
}
