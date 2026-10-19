<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('classes', function (Blueprint $table) {
            $table->id();
            $table->string('name', 40)->unique();
            $table->string('grade_level', 3);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
        Schema::create('students', function (Blueprint $table) {
            $table->id();
            $table->string('nisn', 10)->unique();
            $table->string('full_name', 150);
            $table->foreignId('class_id')->constrained('classes')->restrictOnDelete();
            $table->boolean('is_active')->default(true)->index();
            $table->timestamps();
            $table->index(['class_id', 'is_active']);
        });
        Schema::create('attendance_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('teacher_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('class_id')->constrained('classes')->restrictOnDelete();
            $table->string('class_name_snapshot', 40);
            $table->string('subject_name', 120);
            $table->unsignedSmallInteger('duration_minutes');
            $table->dateTime('starts_at');
            $table->dateTime('ends_at')->index();
            $table->dateTime('closed_at')->nullable();
            $table->dateTime('confirmed_at')->nullable();
            $table->string('status', 20)->default('active');
            $table->timestamps();
            $table->index(['teacher_id', 'starts_at']);
            $table->index(['status', 'ends_at']);
        });
        Schema::create('attendance_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('attendance_session_id')->constrained()->restrictOnDelete();
            $table->foreignId('student_id')->constrained()->restrictOnDelete();
            $table->string('student_name_snapshot', 150);
            $table->string('nisn_snapshot', 10);
            $table->string('status', 10)->nullable();
            $table->string('notes', 500)->nullable();
            $table->dateTime('submitted_at')->nullable();
            $table->string('submission_source', 12)->nullable();
            $table->timestamps();
            $table->unique(['attendance_session_id', 'student_id']);
            $table->index(['student_id', 'status']);
        });
        Schema::create('attendance_change_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('attendance_record_id')->constrained()->restrictOnDelete();
            $table->foreignId('teacher_id')->constrained('users')->restrictOnDelete();
            $table->string('old_status', 10)->nullable();
            $table->string('new_status', 10);
            $table->string('old_notes', 500)->nullable();
            $table->string('new_notes', 500)->nullable();
            $table->dateTime('changed_at');
        });
        Schema::create('student_change_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained()->restrictOnDelete();
            $table->foreignId('teacher_id')->constrained('users')->restrictOnDelete();
            $table->json('old_values');
            $table->json('new_values');
            $table->dateTime('changed_at');
        });
    }

    public function down(): void
    {
        foreach (['student_change_logs', 'attendance_change_logs', 'attendance_records', 'attendance_sessions', 'students', 'classes'] as $table) {
            Schema::dropIfExists($table);
        }
    }
};
