<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\RosterController;
use App\Http\Controllers\SettingsController;
use App\Http\Controllers\StudentAttendanceController;
use App\Http\Controllers\TeacherAttendanceController;
use Illuminate\Support\Facades\Route;

Route::get('/', [AuthController::class, 'welcome'])->name('home');
Route::get('/guru/masuk', [AuthController::class, 'teacherLogin'])->name('login');
Route::post('/guru/masuk', [AuthController::class, 'authenticateTeacher'])->middleware('throttle:login');
Route::get('/siswa/masuk', [AuthController::class, 'studentLogin']);
Route::post('/siswa/masuk', [AuthController::class, 'authenticateStudent'])->middleware('throttle:login');
Route::post('/keluar', [AuthController::class, 'logout']);

Route::prefix('guru')->middleware(['role:teacher', 'auth.session'])->group(function () {
    Route::get('/', [TeacherAttendanceController::class, 'dashboard']);
    Route::get('/absensi/buat', [TeacherAttendanceController::class, 'create']);
    Route::post('/absensi', [TeacherAttendanceController::class, 'store']);
    Route::get('/absensi/{session}', [TeacherAttendanceController::class, 'show']);
    Route::post('/absensi/{session}/tutup', [TeacherAttendanceController::class, 'close']);
    Route::put('/absensi/{session}/tinjau', [TeacherAttendanceController::class, 'review']);
    Route::get('/riwayat', [TeacherAttendanceController::class, 'history']);
    Route::get('/laporan.pdf', ReportController::class)->middleware('throttle:reports');
    Route::get('/siswa', [RosterController::class, 'index']);
    Route::post('/kelas', [RosterController::class, 'createClass']);
    Route::post('/siswa', [RosterController::class, 'store']);
    Route::put('/siswa/{student}', [RosterController::class, 'update']);
    Route::get('/template.xlsx', [RosterController::class, 'template']);
    Route::post('/impor/pratinjau', [RosterController::class, 'preview'])->middleware('throttle:imports');
    Route::post('/impor', [RosterController::class, 'import']);
    Route::delete('/impor', [RosterController::class, 'cancelImport']);
    Route::get('/pengaturan', [SettingsController::class, 'edit']);
    Route::put('/pengaturan', [SettingsController::class, 'update']);
});
Route::prefix('siswa')->middleware('role:student')->group(function () {
    Route::get('/', [StudentAttendanceController::class, 'dashboard']);
    Route::get('/absensi/{session}', [StudentAttendanceController::class, 'show']);
    Route::post('/absensi/{session}', [StudentAttendanceController::class, 'submit'])->middleware('throttle:submissions');
    Route::get('/riwayat', [StudentAttendanceController::class, 'history']);
    Route::get('/laporan.pdf', ReportController::class)->middleware('throttle:reports');
});
