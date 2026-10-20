<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PublicAttendanceForm extends Model
{
    use HasFactory;

    protected $fillable = ['teacher_id', 'title', 'public_token', 'duration_minutes', 'starts_at', 'expires_at'];

    protected function casts(): array
    {
        return ['starts_at' => 'immutable_datetime', 'expires_at' => 'immutable_datetime', 'duration_minutes' => 'integer'];
    }

    public function teacher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }

    public function submissions(): HasMany
    {
        return $this->hasMany(PublicAttendanceSubmission::class);
    }

    public function isActive(): bool
    {
        return now()->gte($this->starts_at) && now()->lt($this->expires_at);
    }

    public function publicUrl(): string
    {
        return route('public-attendance.show', ['token' => $this->public_token]);
    }
}
