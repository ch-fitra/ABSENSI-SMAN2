<?php

namespace Tests\Feature;

use App\Models\PublicAttendanceForm;
use App\Models\PublicAttendanceSubmission;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\User;
use App\Policies\PublicAttendanceFormPolicy;
use App\Services\PublicAttendanceReportService;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\RefreshDatabaseWithoutReset;
use Tests\TestCase;

class PublicAttendanceTest extends TestCase
{
    use RefreshDatabaseWithoutReset;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
    }

    private function payload(array $changes = []): array
    {
        return [...['student_name' => "D'Arman Siregar", 'class_name' => 'X-1', 'subject_name' => 'Matematika',
            'lesson_number' => 2, 'attendance_status' => 'hadir', 'notes' => null,
            'idempotency_key' => (string) Str::uuid()], ...$changes];
    }

    private function endpoint(PublicAttendanceForm $form): string
    {
        return '/form-absensi/'.$form->public_token;
    }

    public function test_teacher_creates_a_unique_link_using_server_time_and_ownership(): void
    {
        $this->travelTo(CarbonImmutable::parse('2026-10-19 01:00:00', 'UTC'));
        $teacher = User::factory()->create();
        $other = PublicAttendanceForm::factory()->create();

        $response = $this->actingAs($teacher)->post('/guru/absensi-link', ['title' => '  Absensi PJJ Matematika  ', 'duration_minutes' => 30]);

        $form = $teacher->publicAttendanceForms()->sole();
        $response->assertRedirect('/guru/absensi-link/'.$form->id);
        $this->assertSame('Absensi PJJ Matematika', $form->title);
        $this->assertSame('2026-10-19 01:00:00', $form->starts_at->format('Y-m-d H:i:s'));
        $this->assertSame('2026-10-19 01:30:00', $form->expires_at->format('Y-m-d H:i:s'));
        $this->assertMatchesRegularExpression('/\A[a-f0-9]{64}\z/', $form->public_token);
        $this->assertNotSame($other->public_token, $form->public_token);
        $this->assertDatabaseCount('attendance_sessions', 0);
    }

    public static function invalidCreation(): array
    {
        return ['missing title' => [['title' => ''], 'title'], 'long title' => [['title' => str_repeat('a', 151)], 'title'],
            'zero duration' => [['duration_minutes' => 0], 'duration_minutes'], 'too long' => [['duration_minutes' => 1441], 'duration_minutes'],
            'fraction' => [['duration_minutes' => 1.5], 'duration_minutes'], 'missing duration' => [['duration_minutes' => null], 'duration_minutes'],
            'forged owner' => [['teacher_id' => 2], 'teacher_id'], 'forged expiry' => [['expires_at' => '2099-01-01'], 'expires_at']];
    }

    #[DataProvider('invalidCreation')]
    public function test_invalid_creation_is_rejected_without_saving(array $changes, string $field): void
    {
        $teacher = User::factory()->create();

        $this->actingAs($teacher)->post('/guru/absensi-link', [...['title' => 'Absensi PJJ', 'duration_minutes' => 30], ...$changes])->assertSessionHasErrors($field);

        $this->assertDatabaseCount('public_attendance_forms', 0);
    }

    public function test_guest_opens_active_form_without_students_and_receives_no_private_responses(): void
    {
        $form = PublicAttendanceForm::factory()->create();
        PublicAttendanceSubmission::factory()->for($form)->create();
        SchoolClass::factory()->create(['name' => 'X-1']);
        SchoolClass::factory()->create(['name' => 'XI-9']);

        $this->get($this->endpoint($form))->assertOk()->assertHeader('X-Robots-Tag', 'noindex, nofollow, noarchive')
            ->assertHeader('Referrer-Policy', 'no-referrer')
            ->assertInertia(fn (Assert $page) => $page->component('public-attendance/form')->where('isActive', true)
                ->has('classes', 25)->where('classes.0', 'X-1')->where('classes.24', 'XI-9')
                ->where('subjects', ['Agama', 'Bahasa Arab', 'Bahasa Indonesia', 'Bahasa Inggris', 'Bahasa Inggris TL',
                    'Geografi', 'Matematika', 'Penjaskes', 'PKN', 'Prakarya', 'Sejarah', 'Seni Budaya', 'Sosiologi', 'UPB'])
                ->missing('submissions')->missing('summary')->missing('form.teacher_id')->missing('form.public_token')->where('submittedAt', null));
        $this->assertDatabaseCount('students', 0);
        $this->assertGuest();
    }

    public function test_public_submission_saves_without_account_and_ignores_forged_date_and_ids(): void
    {
        $this->travelTo(CarbonImmutable::parse('2026-10-19 17:45:00', 'UTC'));
        $form = PublicAttendanceForm::factory()->create();

        $this->post($this->endpoint($form), $this->payload(['student_name' => '  Nur   Aisyah  ', 'submitted_at' => '2000-01-01',
            'date' => '2000-01-01', 'teacher_id' => 999, 'student_id' => 999, 'public_attendance_form_id' => 999]))->assertRedirect($this->endpoint($form));

        $this->assertDatabaseHas('public_attendance_submissions', ['public_attendance_form_id' => $form->id, 'student_name' => 'Nur Aisyah',
            'normalized_name' => 'nur aisyah', 'submitted_at' => '2026-10-19 17:45:00']);
        $this->assertDatabaseCount('students', 0);
        $this->assertDatabaseCount('attendance_records', 0);
        $this->assertGuest('student');
        $this->get($this->endpoint($form))->assertInertia(fn (Assert $page) => $page->where('submittedAt', '2026-10-19T17:45:00+00:00')->has('classes', 0));
    }

    public static function scheduledSubjects(): array
    {
        return [
            ['Agama'], ['Bahasa Arab'], ['Bahasa Indonesia'], ['Bahasa Inggris'], ['Bahasa Inggris TL'],
            ['Geografi'], ['Matematika'], ['Penjaskes'], ['PKN'], ['Prakarya'], ['Sejarah'], ['Seni Budaya'], ['Sosiologi'], ['UPB'],
        ];
    }

    #[DataProvider('scheduledSubjects')]
    public function test_scheduled_subject_is_accepted_and_saved(string $subject): void
    {
        $form = PublicAttendanceForm::factory()->create();

        $this->post($this->endpoint($form), $this->payload(['subject_name' => $subject]))
            ->assertSessionHasNoErrors()->assertRedirect($this->endpoint($form));

        $this->assertDatabaseHas('public_attendance_submissions', [
            'public_attendance_form_id' => $form->id, 'subject_name' => $subject,
        ]);
    }

    public function test_unknown_subject_returns_a_selection_error_without_saving(): void
    {
        $form = PublicAttendanceForm::factory()->create();

        $this->post($this->endpoint($form), $this->payload(['subject_name' => 'Mata Pelajaran Palsu']))
            ->assertSessionHasErrors(['subject_name' => 'Pilih Mata pelajaran yang tersedia.']);

        $this->assertDatabaseCount('public_attendance_submissions', 0);
    }

    public static function invalidSubmissions(): array
    {
        return ['missing name' => [['student_name' => ''], 'student_name'], 'no letters' => [['student_name' => '1234'], 'student_name'],
            'html name' => [['student_name' => '<script>Nama</script>'], 'student_name'], 'long name' => [['student_name' => str_repeat('N', 151)], 'student_name'],
            'missing class' => [['class_name' => ''], 'class_name'], 'unknown class' => [['class_name' => 'Kelas Palsu'], 'class_name'],
            'missing subject' => [['subject_name' => ''], 'subject_name'], 'long subject' => [['subject_name' => str_repeat('M', 121)], 'subject_name'],
            'array subject' => [['subject_name' => ['Matematika']], 'subject_name'],
            'missing lesson' => [['lesson_number' => null], 'lesson_number'], 'lesson zero' => [['lesson_number' => 0], 'lesson_number'],
            'lesson twenty one' => [['lesson_number' => 21], 'lesson_number'], 'fraction lesson' => [['lesson_number' => 1.5], 'lesson_number'],
            'missing status' => [['attendance_status' => ''], 'attendance_status'], 'invalid status' => [['attendance_status' => 'lulus'], 'attendance_status'],
            'long notes' => [['notes' => str_repeat('a', 501)], 'notes'], 'missing key' => [['idempotency_key' => ''], 'idempotency_key'],
            'invalid key' => [['idempotency_key' => '1'], 'idempotency_key'], 'honeypot' => [['website' => 'spam.example'], 'website']];
    }

    #[DataProvider('invalidSubmissions')]
    public function test_invalid_public_fields_do_not_save(array $changes, string $field): void
    {
        $form = PublicAttendanceForm::factory()->create();

        $this->post($this->endpoint($form), $this->payload($changes))->assertSessionHasErrors($field);

        $this->assertDatabaseCount('public_attendance_submissions', 0);
    }

    public function test_submission_just_before_expiration_is_accepted(): void
    {
        $this->travelTo(CarbonImmutable::parse('2026-10-19 01:00:00', 'UTC'));
        $form = PublicAttendanceForm::factory()->create();
        $this->travelTo($form->expires_at->subSecond());

        $this->post($this->endpoint($form), $this->payload())->assertRedirect($this->endpoint($form));

        $this->assertDatabaseCount('public_attendance_submissions', 1);
    }

    public static function lateOffsets(): array
    {
        return ['exact deadline' => [0], 'after deadline' => [1]];
    }

    #[DataProvider('lateOffsets')]
    public function test_submission_at_or_after_deadline_is_rejected_even_if_opened_before(int $seconds): void
    {
        $this->freezeTime();
        $form = PublicAttendanceForm::factory()->create();
        $this->get($this->endpoint($form))->assertOk();
        $this->travelTo($form->expires_at->addSeconds($seconds));

        $this->post($this->endpoint($form), $this->payload())->assertSessionHasErrors('submission');

        $this->assertDatabaseCount('public_attendance_submissions', 0);
        $this->get($this->endpoint($form))->assertInertia(fn (Assert $page) => $page->where('isActive', false)->has('classes', 0));
    }

    public function test_successful_retry_does_not_duplicate_even_after_expiration(): void
    {
        $this->freezeTime();
        $form = PublicAttendanceForm::factory()->create();
        $payload = $this->payload();
        $this->post($this->endpoint($form), $payload)->assertRedirect();
        $this->travelTo($form->expires_at);

        $this->post($this->endpoint($form), $payload)->assertRedirect($this->endpoint($form));

        $this->assertDatabaseCount('public_attendance_submissions', 1);
    }

    public function test_idempotency_key_cannot_replace_previously_saved_payload(): void
    {
        $form = PublicAttendanceForm::factory()->create();
        $payload = $this->payload();
        $this->post($this->endpoint($form), $payload)->assertRedirect();

        $this->post($this->endpoint($form), [...$payload, 'attendance_status' => 'alpa'])->assertSessionHasErrors('idempotency_key');

        $this->assertDatabaseCount('public_attendance_submissions', 1);
        $this->assertDatabaseHas('public_attendance_submissions', ['attendance_status' => 'hadir']);
    }

    public function test_matching_names_remain_allowed_but_are_flagged_for_teacher_review(): void
    {
        $form = PublicAttendanceForm::factory()->create();
        $this->post($this->endpoint($form), $this->payload(['student_name' => ' Nur  Aisyah ']))->assertRedirect();
        $this->post($this->endpoint($form), $this->payload(['student_name' => 'NUR AISYAH']))->assertRedirect();

        $this->actingAs($form->teacher)->get('/guru/absensi-link/'.$form->id.'/respons')->assertOk()
            ->assertInertia(fn (Assert $page) => $page->has('submissions.data', 2)->where('submissions.data.0.possible_duplicate', true)
                ->where('submissions.data.1.possible_duplicate', true)->missing('submissions.data.0.payload_hash')->missing('submissions.data.0.idempotency_key'));
    }

    public function test_teacher_listing_statistics_and_responses_are_isolated_from_other_teachers(): void
    {
        $form = PublicAttendanceForm::factory()->create();
        $other = PublicAttendanceForm::factory()->create();
        PublicAttendanceSubmission::factory()->count(2)->for($form)->create();
        PublicAttendanceSubmission::factory()->count(3)->for($other)->create();

        $this->actingAs($form->teacher)->get('/guru/absensi-link')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->has('forms.data', 1)->where('forms.data.0.id', $form->id)->where('statistics.total', 1)->where('statistics.responses', 2));
        $this->get('https://sekolah.example.test/guru/absensi-link/'.$form->id)->assertOk()->assertInertia(fn (Assert $page) => $page
            ->where('form.public_url', 'https://sekolah.example.test/form-absensi/'.$form->public_token)->where('form.submissions_count', 2));
        $this->assertSame($form->public_token, $form->fresh()->public_token);
    }

    public static function protectedSuffixes(): array
    {
        return ['detail' => [''], 'responses' => ['/respons'], 'PDF' => ['/laporan.pdf']];
    }

    #[DataProvider('lateOffsets')]
    public function test_expired_share_page_redirects_owner_to_responses_without_removing_submissions(int $seconds): void
    {
        $this->freezeTime();
        $form = PublicAttendanceForm::factory()->create();
        PublicAttendanceSubmission::factory()->for($form)->create();
        $this->travelTo($form->expires_at->addSeconds($seconds));

        $this->actingAs($form->teacher)->get('/guru/absensi-link/'.$form->id)
            ->assertRedirectToRoute('teacher.public-attendance.responses', $form);

        $this->assertDatabaseCount('public_attendance_submissions', 1);
    }

    public function test_expired_share_page_still_rejects_other_teachers_before_redirecting(): void
    {
        $form = PublicAttendanceForm::factory()->expired()->create();

        $this->actingAs(User::factory()->create())->get('/guru/absensi-link/'.$form->id)->assertForbidden();
    }

    #[DataProvider('protectedSuffixes')]
    public function test_other_teacher_cannot_read_a_form_or_report(string $suffix): void
    {
        $form = PublicAttendanceForm::factory()->create();

        $this->actingAs(User::factory()->create())->get('/guru/absensi-link/'.$form->id.$suffix)->assertForbidden();
    }

    #[DataProvider('protectedSuffixes')]
    public function test_guest_cannot_read_private_form_routes(string $suffix): void
    {
        $form = PublicAttendanceForm::factory()->create();

        $this->get('/guru/absensi-link/'.$form->id.$suffix)->assertRedirect('/guru/masuk');
    }

    public function test_student_cannot_create_public_forms_or_read_private_reports(): void
    {
        $student = Student::factory()->create();
        $form = PublicAttendanceForm::factory()->create();

        $this->actingAs($student, 'student')->post('/guru/absensi-link', ['title' => 'Palsu', 'duration_minutes' => 30])->assertRedirect('/guru/masuk');
        $this->get('/guru/absensi-link/'.$form->id.'/laporan.pdf')->assertRedirect('/guru/masuk');
        $this->assertDatabaseCount('public_attendance_forms', 1);
    }

    public function test_policy_only_allows_owner_to_read_and_download(): void
    {
        $form = PublicAttendanceForm::factory()->create();
        $other = User::factory()->create();
        $policy = app(PublicAttendanceFormPolicy::class);

        $this->assertTrue($policy->create($form->teacher));
        $this->assertTrue($policy->view($form->teacher, $form));
        $this->assertTrue($policy->downloadReport($form->teacher, $form));
        $this->assertFalse($policy->view($other, $form));
        $this->assertFalse($policy->downloadReport($other, $form));
    }

    public function test_summary_filters_and_wib_dates_apply_to_all_report_data(): void
    {
        $form = PublicAttendanceForm::factory()->expired()->create();
        foreach (['hadir', 'izin', 'sakit', 'alpa'] as $status) {
            PublicAttendanceSubmission::factory()->for($form)->create(['attendance_status' => $status,
                'student_name' => 'Alya Putri', 'submitted_at' => '2026-10-19 17:30:00']);
        }
        PublicAttendanceSubmission::factory()->for($form)->create(['class_name' => 'XI-2', 'submitted_at' => '2026-10-19 16:59:59']);

        $this->actingAs($form->teacher)->get('/guru/absensi-link/'.$form->id.'/respons?from=2026-10-20&to=2026-10-20&class_name=X-1&search=Alya')
            ->assertOk()->assertInertia(fn (Assert $page) => $page->where('summary', ['total' => 4, 'hadir' => 1, 'izin' => 1, 'sakit' => 1, 'alpa' => 1])
            ->has('submissions.data', 4)->where('filters.search', 'Alya'));
        $this->get('/guru/absensi-link/'.$form->id.'/respons?status=izin')->assertInertia(fn (Assert $page) => $page
            ->where('summary.total', 1)->where('summary.izin', 1)->has('submissions.data', 1));
        $this->assertDatabaseCount('public_attendance_submissions', 5);
        $this->assertDatabaseCount('attendance_records', 0);
    }

    public function test_response_search_treats_wildcard_input_literally(): void
    {
        $form = PublicAttendanceForm::factory()->create();
        PublicAttendanceSubmission::factory()->for($form)->create(['student_name' => 'Alya Putri']);

        $this->actingAs($form->teacher)->get('/guru/absensi-link/'.$form->id.'/respons?search=%25')->assertInertia(fn (Assert $page) => $page->has('submissions.data', 0));
    }

    public function test_responses_are_paginated_newest_first_with_filters_preserved(): void
    {
        $form = PublicAttendanceForm::factory()->create();
        PublicAttendanceSubmission::factory()->count(17)->for($form)->create();

        $this->actingAs($form->teacher)->get('/guru/absensi-link/'.$form->id.'/respons?status=hadir&page=2')->assertOk()
            ->assertInertia(fn (Assert $page) => $page->has('submissions.data', 2)->where('submissions.total', 17)
                ->where('submissions.current_page', 2)->where('filters.status', 'hadir'));
    }

    public function test_expired_form_preserves_responses_and_exports_a_real_filtered_pdf(): void
    {
        $form = PublicAttendanceForm::factory()->expired()->create();
        PublicAttendanceSubmission::factory()->for($form)->create(['attendance_status' => 'sakit']);
        PublicAttendanceSubmission::factory()->for($form)->create(['attendance_status' => 'hadir']);

        $response = $this->actingAs($form->teacher)->get('/guru/absensi-link/'.$form->id.'/laporan.pdf?status=sakit');

        $response->assertOk()->assertHeader('Content-Type', 'application/pdf');
        $this->assertStringStartsWith('%PDF-', $response->getContent());
        $this->assertDatabaseCount('public_attendance_submissions', 2);
        $reports = app(PublicAttendanceReportService::class);
        $html = view('reports.public-attendance', ['form' => $form->load('teacher'), 'records' => $reports->submissions($form, ['status' => 'sakit'])->get(),
            'summary' => ['total' => 1, 'hadir' => 0, 'izin' => 0, 'sakit' => 1, 'alpa' => 0], 'filters' => ['status' => 'sakit'], 'generatedAt' => '20/10/2026 00:30 WIB'])->render();
        $this->assertStringContainsString('Sakit', $html);
        $this->assertStringNotContainsString('<td>Hadir</td>', $html);
    }

    public function test_pdf_escapes_all_free_text_fields(): void
    {
        $form = PublicAttendanceForm::factory()->make(['title' => '<script>Judul</script>']);
        $form->setRelation('teacher', User::factory()->make(['name' => '<script>Guru</script>']));
        $record = PublicAttendanceSubmission::factory()->make(['student_name' => '<script>Nama</script>', 'class_name' => '<script>Kelas</script>',
            'subject_name' => '<script>Pelajaran</script>', 'notes' => '<script>Keterangan</script>']);

        $html = view('reports.public-attendance', ['form' => $form, 'records' => collect([$record]), 'summary' => ['total' => 1, 'hadir' => 1, 'izin' => 0, 'sakit' => 0, 'alpa' => 0],
            'filters' => ['search' => '<script>Filter</script>'], 'generatedAt' => '19/10/2026 08:00 WIB'])->render();

        $this->assertStringNotContainsString('<script>', $html);
        foreach (['Judul', 'Guru', 'Nama', 'Kelas', 'Pelajaran', 'Keterangan', 'Filter'] as $text) {
            $this->assertStringContainsString('&lt;script&gt;'.$text.'&lt;/script&gt;', $html);
        }
    }

    public function test_unknown_token_never_exposes_form_or_submissions(): void
    {
        $this->get('/form-absensi/'.str_repeat('a', 64))->assertNotFound();
        $this->post('/form-absensi/'.str_repeat('a', 64), $this->payload())->assertNotFound();
        $this->get('/form-absensi/1')->assertNotFound();
    }

    public function test_oversized_public_request_is_rejected_without_saving(): void
    {
        $form = PublicAttendanceForm::factory()->create();

        $this->postJson($this->endpoint($form), ['notes' => str_repeat('a', 33000)])->assertStatus(413)
            ->assertHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');

        $this->assertDatabaseCount('public_attendance_submissions', 0);
    }

    public function test_pdf_can_print_long_records_across_multiple_pages(): void
    {
        $form = PublicAttendanceForm::factory()->expired()->create(['title' => str_repeat('Pembelajaran bersama ', 7)]);
        PublicAttendanceSubmission::factory()->count(18)->for($form)->create([
            'student_name' => str_repeat('Nama panjang ', 11), 'subject_name' => str_repeat('Mata pelajaran ', 8),
            'notes' => substr(str_repeat('Keterangan pembelajaran dan alasan kehadiran siswa. ', 10), 0, 500),
        ]);

        $response = $this->actingAs($form->teacher)->get('/guru/absensi-link/'.$form->id.'/laporan.pdf');

        $response->assertOk()->assertHeader('Content-Type', 'application/pdf');
        $this->assertGreaterThan(1, preg_match_all('/\/Type\s*\/Page\b/', $response->getContent()));
        File::ensureDirectoryExists(base_path('.runtime/screenshots'));
        File::put(base_path('.runtime/screenshots/public-long-report.pdf'), $response->getContent());
    }

    public function test_public_submission_is_rate_limited_and_retries_still_store_one_row(): void
    {
        $form = PublicAttendanceForm::factory()->create();
        $payload = $this->payload();
        foreach (range(1, 60) as $attempt) {
            $this->post($this->endpoint($form), $payload)->assertRedirect();
        }

        $this->post($this->endpoint($form), $payload)->assertTooManyRequests();

        $this->assertDatabaseCount('public_attendance_submissions', 1);
    }
}
