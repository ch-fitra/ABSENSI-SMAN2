<?php

namespace App\Policies;

use App\Models\AttendanceSession;
use App\Models\User;

class AttendanceSessionPolicy
{
    public function view(User $user, AttendanceSession $session): bool
    {
        return $user->id === $session->teacher_id;
    }

    public function update(User $user, AttendanceSession $session): bool
    {
        return $this->view($user, $session);
    }
}
