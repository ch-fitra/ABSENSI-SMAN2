<?php

namespace Tests\Concurrency;

use App\Models\AttendanceSession;
use App\Models\Student;
use App\Models\User;
use App\Services\AttendanceService;
use Illuminate\Foundation\Testing\DatabaseMigrations;
use Symfony\Component\Process\Process;
use Tests\TestCase;

class AttendanceConcurrencyTest extends TestCase
{
    use DatabaseMigrations;

    private function race(string $firstAction, string $secondAction, AttendanceSession $session, Student $student): array
    {
        $barrier = sys_get_temp_dir().'/sman2-race-'.bin2hex(random_bytes(8));
        $connection = config('database.connections.mysql');
        $env = ['APP_ENV' => 'testing', 'DB_CONNECTION' => 'mysql', 'DB_HOST' => $connection['host'], 'DB_PORT' => (string) $connection['port'],
            'DB_DATABASE' => $connection['database'], 'DB_USERNAME' => $connection['username'], 'DB_PASSWORD' => $connection['password'], 'CACHE_STORE' => 'array'];
        $processes = [];
        foreach ([$firstAction, $secondAction] as $i => $action) {
            $processes[] = $process = new Process([PHP_BINARY, base_path('tests/helpers/race-worker.php'), $action, (string) $session->id, (string) $student->id, $barrier, (string) $i], base_path(), $env, timeout: 15);
            $process->start();
        }
        try {
            $deadline = microtime(true) + 10;
            while (! (file_exists($barrier.'.0') && file_exists($barrier.'.1'))) {
                if (microtime(true) > $deadline) {
                    $this->fail('Race workers failed to start: '.$processes[0]->getErrorOutput().$processes[1]->getErrorOutput());
                }
                usleep(10000);
            }
            touch($barrier.'.go');
            foreach ($processes as $process) {
                $process->wait();
                $this->assertTrue($process->isSuccessful(), $process->getErrorOutput());
            }

            return array_map(fn ($p) => trim($p->getOutput()), $processes);
        } finally {
            foreach ($processes as $process) {
                if ($process->isRunning()) {
                    $process->stop();
                }
            }
            foreach (['.0', '.1', '.go'] as $suffix) {
                if (is_file($barrier.$suffix)) {
                    unlink($barrier.$suffix);
                }
            }
        }
    }

    private function fixture(): array
    {
        $student = Student::factory()->create();
        $teacher = User::factory()->create();
        $session = app(AttendanceService::class)->create($teacher, ['class_id' => $student->class_id, 'subject_name' => 'Fisika', 'duration_minutes' => 5]);

        return [$session, $student];
    }

    public function test_two_parallel_submissions_accept_exactly_one(): void
    {
        [$session, $student] = $this->fixture();
        $results = $this->race('submit', 'submit', $session, $student);
        sort($results);
        $this->assertSame(['rejected', 'submitted'], $results);
        $this->assertEquals(1, $session->records()->count());
        $this->assertEquals('hadir', $session->records()->first()->status);
    }

    public function test_parallel_manual_closure_and_submission_cannot_corrupt_records(): void
    {
        [$session, $student] = $this->fixture();
        $this->race('submit', 'close', $session, $student);
        $this->assertSame('review', $session->fresh()->status);
        $this->assertEquals(1, $session->records()->count());
        $record = $session->records()->first();
        $this->assertContains($record->status, ['hadir', 'alpa']);
        $this->assertSame($record->status === 'hadir', $record->submitted_at !== null);
        if ($record->submitted_at) {
            $this->assertTrue($record->submitted_at->lte($session->fresh()->closed_at));
        }
    }

    public function test_parallel_expiration_jobs_and_submission_preserve_timely_record(): void
    {
        [$session, $student] = $this->fixture();
        app(AttendanceService::class)->submit($student, $session, ['status' => 'izin']);
        $session->update(['ends_at' => now()->subSecond()]);
        $this->race('expire', 'expire', $session, $student);
        $this->assertSame('review', $session->fresh()->status);
        $this->assertSame('izin', $session->records()->first()->status);
        $this->assertEquals(1, $session->records()->count());
    }
}
