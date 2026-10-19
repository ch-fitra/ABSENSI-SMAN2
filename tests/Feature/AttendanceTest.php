<?php

namespace Tests\Feature;

use App\Models\AttendanceSession;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\User;
use App\Services\AttendanceReportService;
use App\Services\AttendanceService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class AttendanceTest extends TestCase
{
    use RefreshDatabase;

    private User $teacher;

    private Student $student;

    private AttendanceService $attendance;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
        $this->teacher = User::factory()->create();
        $this->student = Student::factory()->create(['nisn' => '0012345678']);
        $this->attendance = app(AttendanceService::class);
    }

    private function createSession(?User $teacher = null): AttendanceSession
    {
        return $this->attendance->create($teacher ?? $this->teacher, ['class_id' => $this->student->class_id, 'subject_name' => 'Matematika', 'duration_minutes' => 5]);
    }

    private function closed(bool $confirmed = false): AttendanceSession
    {
        $session = $this->createSession();
        $this->attendance->close($this->teacher, $session);
        if ($confirmed) {
            $this->attendance->review($this->teacher, $session, [], true);
        }

        return $session->fresh();
    }

    public function test_teacher_can_login_with_valid_credentials(): void
    {
        $this->post('/guru/masuk', ['email' => $this->teacher->email, 'password' => 'password'])->assertRedirect('/guru');
        $this->assertAuthenticatedAs($this->teacher, 'web');
    }

    public function test_invalid_teacher_credentials_are_rejected(): void
    {
        $this->post('/guru/masuk', ['email' => $this->teacher->email, 'password' => 'invalid'])->assertSessionHasErrors('email');
        $this->assertGuest('web');
    }

    public function test_student_logs_in_with_nisn_only_including_leading_zeroes(): void
    {
        $this->post('/siswa/masuk', ['nisn' => '0012345678'])->assertRedirect('/siswa');
        $this->assertAuthenticatedAs($this->student, 'student');
        $this->assertGuest('web');
    }

    public function test_unknown_and_inactive_nisn_cannot_login(): void
    {
        $this->post('/siswa/masuk', ['nisn' => '9999999999'])->assertSessionHasErrors('nisn');
        $this->student->update(['is_active' => false]);
        $this->post('/siswa/masuk', ['nisn' => $this->student->nisn])->assertSessionHasErrors('nisn');
        $this->assertGuest('student');
    }

    public function test_login_is_rate_limited(): void
    {
        for ($i = 0; $i < 5; $i++) {
            $this->post('/siswa/masuk', ['nisn' => '9999999999']);
        }
        $this->post('/siswa/masuk', ['nisn' => '9999999999'])->assertStatus(429);
    }

    public function test_teachers_and_students_are_isolated(): void
    {
        $this->actingAs($this->student, 'student')->get('/guru/siswa')->assertRedirect('/guru/masuk');
        auth('student')->logout();
        $this->actingAs($this->teacher, 'web')->get('/siswa/riwayat')->assertRedirect('/siswa/masuk');
    }

    public function test_teacher_creates_a_snapshotted_session(): void
    {
        $this->actingAs($this->teacher, 'web')->post('/guru/absensi', ['class_id' => $this->student->class_id, 'subject_name' => 'Fisika', 'duration_minutes' => 10])->assertRedirect();
        $session = AttendanceSession::firstOrFail();
        $this->assertEquals('Fisika', $session->subject_name);
        $this->assertEquals(600, $session->starts_at->diffInSeconds($session->ends_at));
        $this->assertDatabaseHas('attendance_records', ['student_id' => $this->student->id, 'nisn_snapshot' => '0012345678', 'status' => null]);
    }

    public function test_empty_classes_and_invalid_duration_are_rejected(): void
    {
        $class = SchoolClass::factory()->create();
        $this->actingAs($this->teacher, 'web')->post('/guru/absensi', ['class_id' => $class->id, 'subject_name' => 'Fisika', 'duration_minutes' => 5])->assertSessionHasErrors('class_id');
        $this->post('/guru/absensi', ['class_id' => $class->id, 'subject_name' => 'Fisika', 'duration_minutes' => 121])->assertSessionHasErrors('duration_minutes');
        $this->assertDatabaseCount('attendance_sessions', 0);
    }

    public function test_multiple_teachers_use_shared_roster_and_separate_sessions(): void
    {
        $a = $this->createSession();
        $b = $this->createSession();
        $c = $this->createSession(User::factory()->create());
        $this->assertCount(3, array_unique([$a->id, $b->id, $c->id]));
        $this->assertDatabaseCount('students', 1);
        $this->assertDatabaseCount('attendance_records', 3);
        $this->actingAs($this->student, 'student')->get('/siswa')->assertInertia(fn (Assert $page) => $page->has('available', 3));
    }

    public function test_student_submits_once_and_cannot_change_or_duplicate(): void
    {
        $session = $this->createSession();
        $this->actingAs($this->student, 'student')->post('/siswa/absensi/'.$session->id, ['status' => 'hadir'])->assertSessionHasNoErrors();
        $this->post('/siswa/absensi/'.$session->id, ['status' => 'sakit'])->assertSessionHasErrors('status');
        $this->assertDatabaseCount('attendance_records', 1);
        $this->assertDatabaseHas('attendance_records', ['status' => 'hadir', 'submission_source' => 'student']);
    }

    public function test_student_cannot_select_alpa_or_spoof_another_student(): void
    {
        $session = $this->createSession();
        $other = Student::factory()->create();
        $this->actingAs($this->student, 'student')->post('/siswa/absensi/'.$session->id, ['status' => 'alpa'])->assertSessionHasErrors('status');
        $this->actingAs($other, 'student')->post('/siswa/absensi/'.$session->id, ['status' => 'hadir', 'student_id' => $this->student->id])->assertForbidden();
        $this->get('/siswa/absensi/'.$session->id)->assertNotFound();
        $this->assertDatabaseHas('attendance_records', ['status' => null]);
    }

    public function test_expired_submission_is_rejected_and_closure_is_persisted(): void
    {
        $session = $this->createSession();
        $this->travel(5)->minutes();
        $this->actingAs($this->student, 'student')->post('/siswa/absensi/'.$session->id, ['status' => 'hadir'])->assertSessionHasErrors('status');
        $this->assertDatabaseHas('attendance_records', ['status' => 'alpa']);
        $this->assertEquals('review', $session->fresh()->status);
        $this->assertTrue($session->fresh()->closed_at->equalTo($session->ends_at));
    }

    public function test_manual_close_stops_submissions_and_is_idempotent(): void
    {
        $session = $this->createSession();
        $this->actingAs($this->teacher, 'web')->post('/guru/absensi/'.$session->id.'/tutup')->assertRedirect();
        $closedAt = $session->fresh()->closed_at;
        $this->travel(1)->minutes();
        $this->post('/guru/absensi/'.$session->id.'/tutup')->assertRedirect();
        $this->assertTrue($session->fresh()->closed_at->equalTo($closedAt));
        auth('web')->logout();
        $this->actingAs($this->student, 'student')->post('/siswa/absensi/'.$session->id, ['status' => 'hadir'])->assertSessionHasErrors('status');
    }

    public function test_scheduler_marks_missing_as_alpa_without_overwriting_submissions(): void
    {
        $second = Student::factory()->create(['class_id' => $this->student->class_id]);
        $session = $this->createSession();
        $this->attendance->submit($this->student, $session, ['status' => 'izin', 'notes' => 'Keperluan keluarga']);
        $this->travel(1)->days();
        $this->artisan('attendance:expire')->assertSuccessful();
        $this->artisan('attendance:expire')->assertSuccessful();
        $this->assertDatabaseHas('attendance_records', ['student_id' => $this->student->id, 'status' => 'izin']);
        $this->assertDatabaseHas('attendance_records', ['student_id' => $second->id, 'status' => 'alpa']);
        $this->assertTrue($session->fresh()->closed_at->equalTo($session->ends_at));
    }

    public function test_teacher_reviews_confirms_and_results_become_official(): void
    {
        $session = $this->closed();
        $record = $session->records()->first();
        $this->actingAs($this->student, 'student')->get('/siswa/riwayat')->assertInertia(fn (Assert $page) => $page->has('records.data', 0)->where('summary.total', 0));
        auth('student')->logout();
        $this->actingAs($this->teacher, 'web')->get('/guru/absensi/'.$session->id)->assertOk()->assertInertia(fn (Assert $page) => $page->where('session.correction_allowed', true)->has('session.records', 1));
        $this->put('/guru/absensi/'.$session->id.'/tinjau', ['records' => [['id' => $record->id, 'status' => 'sakit', 'notes' => 'Demam']], 'confirm' => true])->assertSessionHasNoErrors();
        $this->assertNotNull($session->fresh()->confirmed_at);
        $this->assertDatabaseCount('attendance_change_logs', 1);
        auth('web')->logout();
        $this->actingAs($this->student, 'student')->get('/siswa/riwayat')->assertInertia(fn (Assert $page) => $page->has('records.data', 1)->where('records.data.0.status', 'sakit')->where('summary.sakit', 1));
    }

    public function test_confirmed_corrections_are_logged_and_immediately_official(): void
    {
        $session = $this->closed(true);
        $record = $session->records()->first();
        $this->travel(6)->days();
        $this->actingAs($this->teacher, 'web')->put('/guru/absensi/'.$session->id.'/tinjau', ['records' => [['id' => $record->id, 'status' => 'hadir', 'notes' => 'Koreksi guru']], 'confirm' => false])->assertSessionHasNoErrors();
        $this->assertDatabaseHas('attendance_change_logs', ['old_status' => 'alpa', 'new_status' => 'hadir', 'new_notes' => 'Koreksi guru', 'teacher_id' => $this->teacher->id]);
        $this->assertEquals(1, app(AttendanceReportService::class)->summary(app(AttendanceReportService::class)->records('student', $this->student->id, []))['hadir']);
    }

    public function test_corrections_at_seven_day_deadline_are_rejected_atomically(): void
    {
        $session = $this->closed(true);
        $this->travelTo($session->closed_at->addDays(7));
        $record = $session->records()->first();
        $this->actingAs($this->teacher, 'web')->put('/guru/absensi/'.$session->id.'/tinjau', ['records' => [['id' => $record->id, 'status' => 'hadir', 'notes' => 'Terlambat']], 'confirm' => false])->assertSessionHasErrors('records');
        $this->assertEquals('alpa', $record->fresh()->status);
        $this->assertDatabaseCount('attendance_change_logs', 0);
    }

    public function test_late_confirmation_is_allowed_without_changing_locked_records(): void
    {
        $session = $this->closed();
        $this->travel(8)->days();
        $this->actingAs($this->teacher, 'web')->put('/guru/absensi/'.$session->id.'/tinjau', ['records' => [], 'confirm' => true])->assertSessionHasNoErrors();
        $this->assertEquals('confirmed', $session->fresh()->status);
    }

    public function test_teacher_cannot_view_close_correct_or_export_another_teachers_session(): void
    {
        $session = $this->closed(true);
        $other = User::factory()->create();
        $this->actingAs($other)->get('/guru/absensi/'.$session->id)->assertForbidden();
        $this->post('/guru/absensi/'.$session->id.'/tutup')->assertForbidden();
        $this->put('/guru/absensi/'.$session->id.'/tinjau', ['records' => [], 'confirm' => true])->assertForbidden();
        $this->get('/guru/laporan.pdf?session_id='.$session->id)->assertForbidden();
        $this->get('/guru/riwayat')->assertInertia(fn (Assert $page) => $page->has('sessions.data', 0)->where('summary.total', 0));
    }

    public function test_foreign_record_in_review_rolls_back_all_corrections(): void
    {
        $session = $this->closed();
        $other = $this->closed();
        $this->actingAs($this->teacher, 'web')->put('/guru/absensi/'.$session->id.'/tinjau', ['records' => [
            ['id' => $session->records()->first()->id, 'status' => 'hadir'], ['id' => $other->records()->first()->id, 'status' => 'sakit'],
        ], 'confirm' => true])->assertForbidden();
        $this->assertEquals('alpa', $session->records()->first()->status);
        $this->assertDatabaseCount('attendance_change_logs', 0);
    }

    public function test_history_snapshot_survives_name_and_class_changes(): void
    {
        $session = $this->createSession();
        $original = $this->student->full_name;
        $newClass = SchoolClass::factory()->create();
        $this->student->update(['class_id' => $newClass->id, 'full_name' => 'Nama Baru']);
        $this->attendance->submit($this->student->fresh(), $session, ['status' => 'hadir']);
        $this->assertEquals($original, $session->records()->first()->student_name_snapshot);
        $this->assertNotEquals($newClass->name, $session->class_name_snapshot);
    }

    public function test_statistics_count_records_instead_of_unique_students(): void
    {
        $this->closed(true);
        $this->closed(true);
        $this->closed();
        $reports = app(AttendanceReportService::class);
        $this->assertEquals(2, $reports->summary($reports->records('teacher', $this->teacher->id, []))['total']);
    }

    public function test_date_filters_use_jakarta_calendar_boundaries(): void
    {
        $session = $this->closed(true);
        $session->update(['starts_at' => '2026-10-18 18:00:00']); // October 19, 01:00 WIB.
        $reports = app(AttendanceReportService::class);
        $this->assertEquals(1, $reports->records('student', $this->student->id, ['from' => '2026-10-19', 'to' => '2026-10-19'])->count());
        $this->assertEquals(0, $reports->records('student', $this->student->id, ['to' => '2026-10-18'])->count());
    }

    public function test_student_cannot_request_someone_elses_report(): void
    {
        $this->closed(true);
        $this->actingAs($this->student, 'student')->get('/siswa/laporan.pdf?student_id=999')->assertSessionHasErrors('student_id');
    }

    public function test_deactivated_student_session_is_revoked(): void
    {
        $this->actingAs($this->student, 'student');
        $this->student->update(['is_active' => false]);
        $this->get('/siswa')->assertRedirect('/siswa/masuk');
    }

    public function test_student_changes_are_logged_and_duplicates_rejected(): void
    {
        $newClass = SchoolClass::factory()->create();
        $this->actingAs($this->teacher, 'web')->put('/guru/siswa/'.$this->student->id, ['nisn' => $this->student->nisn, 'full_name' => 'Nama Diperbaiki', 'class_id' => $newClass->id, 'is_active' => false])->assertSessionHasNoErrors();
        $this->assertDatabaseCount('student_change_logs', 1);
        $this->post('/guru/siswa', ['nisn' => $this->student->nisn, 'full_name' => 'Siswa Duplikat', 'class_id' => $newClass->id])->assertSessionHasErrors('nisn');
    }

    public function test_teacher_settings_require_current_password_and_hash_new_password(): void
    {
        $this->actingAs($this->teacher, 'web')->put('/guru/pengaturan', ['name' => 'Guru Baru', 'email' => $this->teacher->email, 'current_password' => 'wrong'])->assertSessionHasErrors('current_password');
        $this->put('/guru/pengaturan', ['name' => 'Guru Baru', 'email' => $this->teacher->email, 'current_password' => 'password', 'password' => 'a', 'password_confirmation' => 'a'])->assertSessionHasNoErrors();
        $this->assertTrue(Hash::check('a', $this->teacher->fresh()->password));
    }
}
