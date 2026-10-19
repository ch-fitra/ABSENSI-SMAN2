<?php

namespace App\Http\Controllers;

use App\Http\Requests\LoginRequest;
use App\Models\Student;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class AuthController extends Controller
{
    public function welcome()
    {
        return Inertia::render('auth/welcome');
    }

    public function teacherLogin()
    {
        return Inertia::render('auth/login', ['role' => 'teacher']);
    }

    public function studentLogin()
    {
        return Inertia::render('auth/login', ['role' => 'student']);
    }

    public function authenticateTeacher(LoginRequest $request)
    {
        if (! Auth::guard('web')->attempt($request->validated())) {
            throw ValidationException::withMessages(['email' => 'Data masuk tidak sesuai. Silakan periksa kembali.']);
        }
        Auth::guard('student')->logout();
        $request->session()->regenerate();
        $request->session()->put('password_hash_web', Auth::guard('web')->user()->getAuthPassword());
        $request->session()->forget('import_token');

        return redirect('/guru');
    }

    public function authenticateStudent(LoginRequest $request)
    {
        $student = Student::where('nisn', $request->validated('nisn'))->where('is_active', true)
            ->whereHas('schoolClass', fn ($q) => $q->where('is_active', true))->first();
        if (! $student) {
            throw ValidationException::withMessages(['nisn' => 'Data masuk tidak sesuai. Silakan periksa kembali.']);
        }
        Auth::guard('web')->logout();
        Auth::guard('student')->login($student);
        $request->session()->regenerate();
        $request->session()->forget(['password_hash_web', 'import_token']);

        return redirect('/siswa');
    }

    public function logout(Request $request)
    {
        Auth::guard('web')->logout();
        Auth::guard('student')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/');
    }
}
