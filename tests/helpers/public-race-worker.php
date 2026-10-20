<?php

use App\Models\PublicAttendanceForm;
use App\Services\PublicAttendanceService;
use Illuminate\Contracts\Console\Kernel;

require __DIR__.'/../../vendor/autoload.php';
$app = require __DIR__.'/../../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();
if (! str_ends_with(config('database.connections.mysql.database'), '_test')) {
    throw new RuntimeException('Test database required');
}
[$script, $formId, $key, $barrier, $worker] = $argv;
touch($barrier.'.'.$worker);
$deadline = microtime(true) + 10;
while (! file_exists($barrier.'.go')) {
    if (microtime(true) > $deadline) {
        exit(2);
    }
    usleep(5000);
}
$submission = app(PublicAttendanceService::class)->submit(PublicAttendanceForm::findOrFail($formId), [
    'student_name' => 'Alya Putri', 'class_name' => 'X-1', 'subject_name' => 'Matematika',
    'lesson_number' => 1, 'attendance_status' => 'hadir', 'idempotency_key' => $key,
]);
echo $submission->id;
