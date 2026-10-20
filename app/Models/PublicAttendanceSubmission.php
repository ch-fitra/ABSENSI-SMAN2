<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PublicAttendanceSubmission extends Model
{
    use HasFactory;

    protected $fillable = ['student_name', 'normalized_name', 'class_name', 'subject_name', 'lesson_number', 'attendance_status', 'notes', 'idempotency_key', 'payload_hash', 'submitted_at'];

    protected $hidden = ['idempotency_key', 'payload_hash', 'normalized_name'];

    protected function casts(): array
    {
        return ['submitted_at' => 'immutable_datetime', 'lesson_number' => 'integer', 'possible_duplicate' => 'boolean'];
    }

    public function publicAttendanceForm(): BelongsTo
    {
        return $this->belongsTo(PublicAttendanceForm::class);
    }
}
