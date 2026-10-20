<?php

use App\Models\PublicAttendanceForm;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\User;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\Artisan;
use PhpOffice\PhpSpreadsheet\Cell\DataType;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

require __DIR__.'/../../vendor/autoload.php';
$app = require __DIR__.'/../../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();
if (! str_ends_with(config('database.connections.mysql.database'), '_test')) {
    throw new RuntimeException('Test database required');
}
$database = config('database.connections.mysql.database');
if (! preg_match('/\A[a-zA-Z0-9_]+_test\z/', $database)) {
    throw new RuntimeException('Invalid test database name');
}
$connection = config('database.connections.mysql');
if (($argv[1] ?? null) === '--expire-public-form') {
    $id = $argv[2] ?? '';
    if (! ctype_digit($id) || PublicAttendanceForm::whereKey((int) $id)->update(['expires_at' => now()->subSecond()]) !== 1) {
        throw new RuntimeException('A single existing test form is required');
    }
    echo 'Test form expired';
    exit(0);
}
$pdo = new PDO('mysql:host='.$connection['host'].';port='.$connection['port'], $connection['username'], $connection['password']);
$pdo->exec('CREATE DATABASE IF NOT EXISTS `'.$database.'` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
Artisan::call('migrate', ['--force' => true]);
if (User::exists() || Student::exists()) {
    throw new RuntimeException('Browser tests require an empty, isolated test database. No data was reset.');
}
User::factory()->create(['name' => 'Ibu Ratna', 'email' => 'browser.teacher@example.test', 'password' => getenv('E2E_PASSWORD')]);
$class = SchoolClass::create(['name' => 'X-1', 'grade_level' => 'X']);
foreach (['Alya Putri', 'Bima Pratama', 'Citra Lestari'] as $i => $name) {
    Student::create(['nisn' => '001234567'.($i + 1), 'full_name' => $name, 'class_id' => $class->id]);
}
echo 'Browser fixtures ready';
foreach (['desktop' => '0012345690', 'mobile' => '0012345691'] as $device => $nisn) {
    $book = new Spreadsheet;
    $sheet = $book->getActiveSheet();
    $sheet->fromArray(['NISN', 'Nama Lengkap'], null, 'A1');
    $sheet->setCellValueExplicit('A2', $nisn, DataType::TYPE_STRING);
    $sheet->setCellValue('B2', 'Siswa Impor Browser');
    $sheet->setCellValueExplicit('A3', '0012345671', DataType::TYPE_STRING);
    $sheet->setCellValue('B3', 'Siswa Duplikat');
    (new Xlsx($book))->save(base_path('.runtime/browser-import-'.$device.'.xlsx'));
    $book->disconnectWorksheets();
}
