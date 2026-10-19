<?php

use App\Models\AttendanceSession;
use App\Models\Student;
use App\Services\AttendanceService;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Validation\ValidationException;

require __DIR__.'/../../vendor/autoload.php';
$app = require __DIR__.'/../../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();
if (! str_ends_with(config('database.connections.mysql.database'), '_test')) {
    throw new RuntimeException('Test database required');
}
[$script, $action, $sessionId, $studentId, $barrier, $worker] = $argv;
touch($barrier.'.'.$worker);
$deadline = microtime(true) + 10;
while (! file_exists($barrier.'.go')) {
    if (microtime(true) > $deadline) {
        exit(2);
    } usleep(5000);
}
$attendance = app(AttendanceService::class);
$session = AttendanceSession::findOrFail($sessionId);
try {
    if ($action === 'submit') {
        $attendance->submit(Student::findOrFail($studentId), $session, ['status' => 'hadir']);
        echo 'submitted';
    } elseif ($action === 'close') {
        $attendance->close($session->teacher, $session);
        echo 'closed';
    } else {
        $attendance->reconcile($session);
        echo 'expired';
    }
} catch (ValidationException $e) {
    echo 'rejected';
}
