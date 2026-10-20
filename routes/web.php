<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\PublicAttendanceController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\RosterController;
use App\Http\Controllers\SettingsController;
use App\Http\Controllers\StudentAttendanceController;
use App\Http\Controllers\TeacherAttendanceController;
use App\Http\Controllers\TeacherPublicAttendanceController;
use App\Http\Middleware\PublicAttendanceHeaders;
use Illuminate\Support\Facades\Route;

Route::get('/', [AuthController::class, 'welcome'])->name('home');
Route::get('/guru/masuk', [AuthController::class, 'teacherLogin'])->name('login');
Route::post('/guru/masuk', [AuthController::class, 'authenticateTeacher'])->middleware('throttle:login');
Route::get('/siswa/masuk', [AuthController::class, 'studentLogin']);
Route::post('/siswa/masuk', [AuthController::class, 'authenticateStudent'])->middleware('throttle:login');
Route::post('/keluar', [AuthController::class, 'logout']);

Route::middleware(PublicAttendanceHeaders::class)->group(function () {
    Route::get('/form-absensi/{token}', [PublicAttendanceController::class, 'show'])
        ->where('token', '[a-f0-9]{64}')->name('public-attendance.show');
    Route::post('/form-absensi/{token}', [PublicAttendanceController::class, 'store'])
        ->where('token', '[a-f0-9]{64}')->middleware('throttle:public-attendance')->name('public-attendance.store');
});

Route::prefix('guru')->middleware(['role:teacher', 'auth.session'])->group(function () {
    Route::get('/absensi-link', [TeacherPublicAttendanceController::class, 'index'])->name('teacher.public-attendance.index');
    Route::get('/absensi-link/buat', [TeacherPublicAttendanceController::class, 'create'])->name('teacher.public-attendance.create');
    Route::post('/absensi-link', [TeacherPublicAttendanceController::class, 'store'])->name('teacher.public-attendance.store');
    Route::get('/absensi-link/{form}', [TeacherPublicAttendanceController::class, 'show'])->whereNumber('form')->name('teacher.public-attendance.show');
    Route::get('/absensi-link/{form}/respons', [TeacherPublicAttendanceController::class, 'responses'])->whereNumber('form')->name('teacher.public-attendance.responses');
    Route::get('/absensi-link/{form}/laporan.pdf', [TeacherPublicAttendanceController::class, 'report'])->whereNumber('form')->middleware('throttle:reports')->name('teacher.public-attendance.report');
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
