<?php

namespace App\Policies;

use App\Models\PublicAttendanceForm;
use App\Models\User;

class PublicAttendanceFormPolicy
{
    public function create(User $user): bool
    {
        return $user->exists;
    }

    public function view(User $user, PublicAttendanceForm $form): bool
    {
        return $user->id === $form->teacher_id;
    }

    public function downloadReport(User $user, PublicAttendanceForm $form): bool
    {
        return $this->view($user, $form);
    }
}
