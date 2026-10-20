<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('public_attendance_forms', function (Blueprint $table) {
            $table->id();
            $table->foreignId('teacher_id')->constrained('users')->restrictOnDelete();
            $table->string('title', 150);
            $table->char('public_token', 64)->unique();
            $table->unsignedSmallInteger('duration_minutes');
            $table->dateTime('starts_at');
            $table->dateTime('expires_at')->index();
            $table->timestamps();
            $table->index(['teacher_id', 'expires_at']);
        });
        Schema::create('public_attendance_submissions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('public_attendance_form_id')->constrained()->restrictOnDelete();
            $table->string('student_name', 150);
            $table->string('normalized_name', 150);
            $table->string('class_name', 40);
            $table->string('subject_name', 120);
            $table->unsignedTinyInteger('lesson_number');
            $table->enum('attendance_status', ['hadir', 'izin', 'sakit', 'alpa']);
            $table->string('notes', 500)->nullable();
            $table->uuid('idempotency_key');
            $table->char('payload_hash', 64);
            $table->dateTime('submitted_at');
            $table->timestamps();
            $table->unique(['public_attendance_form_id', 'idempotency_key'], 'public_submission_idempotency_unique');
            $table->index(['public_attendance_form_id', 'submitted_at'], 'public_submission_time_index');
            $table->index(['public_attendance_form_id', 'class_name', 'attendance_status'], 'public_submission_filter_index');
            $table->index(['public_attendance_form_id', 'normalized_name', 'class_name'], 'public_submission_duplicate_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('public_attendance_submissions');
        Schema::dropIfExists('public_attendance_forms');
    }
};
