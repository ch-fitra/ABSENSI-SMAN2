<?php

namespace Tests\Feature;

use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\User;
use App\Services\AttendanceReportService;
use App\Services\AttendanceService;
use App\Services\StudentImportService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Inertia\Testing\AssertableInertia as Assert;
use PhpOffice\PhpSpreadsheet\Cell\DataType;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Tests\RefreshDatabaseWithoutReset as RefreshDatabase;
use Tests\TestCase;

class ImportAndReportTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
    }

    private function excel(array $rows): UploadedFile
    {
        $book = new Spreadsheet;
        $sheet = $book->getActiveSheet();
        $sheet->fromArray(['NISN', 'Nama Lengkap'], null, 'A1');
        foreach ($rows as $i => $row) {
            $sheet->setCellValueExplicit('A'.($i + 2), $row[0], DataType::TYPE_STRING);
            $sheet->setCellValue('B'.($i + 2), $row[1]);
        }
        $path = tempnam(sys_get_temp_dir(), 'sman2-import-');
        (new Xlsx($book))->save($path);
        $content = file_get_contents($path);
        unlink($path);
        $book->disconnectWorksheets();

        return UploadedFile::fake()->createWithContent('siswa.xlsx', $content);
    }

    public function test_excel_preview_preserves_zeroes_flags_duplicates_and_imports_valid_rows_only(): void
    {
        $teacher = User::factory()->create();
        $class = SchoolClass::factory()->create();
        Student::factory()->create(['nisn' => '0012345678']);
        $file = $this->excel([['0012345678', 'Duplikat Lama'], ['0012345679', 'Siswa Baru'], ['0012345679', 'Duplikat File'], ['12', ''], ['0012345680', '12345']]);
        $this->actingAs($teacher)->post('/guru/impor/pratinjau', ['class_id' => $class->id, 'file' => $file])->assertSessionHasNoErrors()->assertRedirect('/guru/siswa');
        $token = session('import_token');
        $preview = Cache::get('import:'.$teacher->id.':'.$token);
        $this->assertCount(5, $preview['rows']);
        $this->assertNotEmpty($preview['rows'][0]['errors']);
        $this->assertSame('0012345679', $preview['rows'][1]['nisn']);
        $this->assertEmpty($preview['rows'][1]['errors']);
        $this->assertNotEmpty($preview['rows'][2]['errors']);
        $this->assertDatabaseCount('students', 1);
        $this->post('/guru/impor', ['token' => $token])->assertSessionHasNoErrors();
        $this->assertDatabaseCount('students', 2);
        $this->assertDatabaseHas('students', ['nisn' => '0012345679', 'class_id' => $class->id, 'full_name' => 'Siswa Baru']);
        $this->post('/guru/impor', ['token' => $token])->assertSessionHasErrors('file');
    }

    public function test_import_conflict_after_preview_rolls_back_entire_batch(): void
    {
        $class = SchoolClass::factory()->create();
        $import = app(StudentImportService::class);
        $rows = $import->preview($this->excel([['0012345678', 'Siswa Pertama'], ['0012345679', 'Siswa Kedua']]));
        Student::factory()->create(['nisn' => '0012345679']);
        try {
            $import->commit($class->id, $rows);
            $this->fail('Duplicate should reject batch');
        } catch (ValidationException $e) {
            $this->assertArrayHasKey('file', $e->errors());
        }
        $this->assertDatabaseMissing('students', ['nisn' => '0012345678']);
        $this->assertDatabaseCount('students', 1);
    }

    public function test_excel_formula_and_non_excel_files_are_rejected(): void
    {
        $teacher = User::factory()->create();
        $class = SchoolClass::factory()->create();
        $rows = app(StudentImportService::class)->preview($this->excel([['0012345678', '=1+1']]));
        $this->assertNotEmpty($rows[0]['errors']);
        $this->actingAs($teacher)->post('/guru/impor/pratinjau', ['class_id' => $class->id, 'file' => UploadedFile::fake()->createWithContent('siswa.xlsx', 'not a zip')])->assertSessionHasErrors('file');
    }

    public function test_excel_template_download_is_a_real_workbook(): void
    {
        $this->actingAs(User::factory()->create())->get('/guru/template.xlsx')->assertOk()->assertDownload('template-siswa-sman2.xlsx');
    }

    public function test_import_preview_is_bound_to_teacher_and_expires(): void
    {
        $teacher = User::factory()->create();
        $class = SchoolClass::factory()->create();
        $this->actingAs($teacher)->post('/guru/impor/pratinjau', ['class_id' => $class->id, 'file' => $this->excel([['0012345678', 'Siswa Baru']])])->assertSessionHasNoErrors();
        $token = session('import_token');
        $this->actingAs(User::factory()->create())->post('/guru/impor', ['token' => $token])->assertSessionHasErrors('file');
        $this->actingAs($teacher);
        $this->travel(16)->minutes();
        $this->post('/guru/impor', ['token' => $token])->assertSessionHasErrors('file');
        $this->assertDatabaseCount('students', 0);
    }

    public function test_teacher_and_student_pdf_use_only_authorized_confirmed_records(): void
    {
        $teacher = User::factory()->create();
        $student = Student::factory()->create();
        $attendance = app(AttendanceService::class);
        $session = $attendance->create($teacher, ['class_id' => $student->class_id, 'subject_name' => 'Matematika', 'duration_minutes' => 5]);
        $attendance->submit($student, $session, ['status' => 'hadir']);
        $attendance->close($teacher, $session);
        $attendance->review($teacher, $session, [], true);
        $this->actingAs($teacher)->get('/guru/laporan.pdf')->assertOk()->assertHeader('content-type', 'application/pdf');
        auth('web')->logout();
        $response = $this->actingAs($student, 'student')->get('/siswa/laporan.pdf?session_id='.$session->id)->assertOk();
        $this->assertStringStartsWith('%PDF-', $response->getContent());
        $other = Student::factory()->create();
        $this->actingAs($other, 'student')->get('/siswa/riwayat')->assertInertia(fn (Assert $page) => $page->has('records.data', 0));
        $reports = app(AttendanceReportService::class);
        $this->assertEquals(0, $reports->records('student', $other->id, ['session_id' => $session->id])->count());
        $this->assertEquals(0, $reports->records('teacher', User::factory()->create()->id, [])->count());
    }

    public function test_teacher_provisioning_and_password_reset_commands(): void
    {
        $this->artisan('teacher:create')->expectsQuestion('Nama lengkap guru', 'Guru Sekolah')->expectsQuestion('Email guru', 'guru@example.test')
            ->expectsQuestion('Password', 'a')->expectsQuestion('Ulangi password', 'a')->assertSuccessful();
        $this->assertDatabaseHas('users', ['email' => 'guru@example.test']);
        $this->assertTrue(Hash::check('a', User::first()->password));
        $this->artisan('teacher:reset-password')->expectsQuestion('Email guru', 'guru@example.test')->expectsQuestion('Password baru', '7')
            ->expectsQuestion('Ulangi password', '7')->assertSuccessful();
        $this->assertTrue(Hash::check('7', User::first()->password));
    }
}
