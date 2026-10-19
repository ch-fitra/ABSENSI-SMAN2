<?php

use App\Services\AttendanceService;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('attendance:expire', function (AttendanceService $attendance) {
    $attendance->expireDue();
    $this->info('Sesi yang melewati batas waktu telah ditutup.');
})->purpose('Tutup sesi absensi kedaluwarsa secara idempoten');
Schedule::command('attendance:expire')->everyMinute()->withoutOverlapping();
