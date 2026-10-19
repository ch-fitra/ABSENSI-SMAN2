<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';

    public function share(Request $request): array
    {
        $teacher = Auth::guard('web')->user();
        $student = Auth::guard('student')->user();

        return [
            ...parent::share($request),
            'auth' => [
                'role' => $teacher ? 'teacher' : ($student ? 'student' : null),
                'user' => $teacher ? $teacher->only('id', 'name', 'email') : ($student ? [
                    'id' => $student->id, 'name' => $student->full_name, 'nisn' => $student->nisn,
                    'class_name' => $student->schoolClass?->name,
                ] : null),
            ],
            'flash' => ['success' => fn () => $request->session()->get('success')],
            'serverNow' => fn () => now()->toIso8601String(),
        ];
    }
}
