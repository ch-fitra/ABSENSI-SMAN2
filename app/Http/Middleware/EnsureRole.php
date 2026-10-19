<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class EnsureRole
{
    public function handle(Request $request, Closure $next, string $role)
    {
        $guard = $role === 'teacher' ? 'web' : 'student';
        if (! Auth::guard($guard)->check()) {
            return redirect($role === 'teacher' ? '/guru/masuk' : '/siswa/masuk');
        }
        if ($role === 'student' && ! Auth::guard('student')->user()->is_active) {
            Auth::guard('student')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return redirect('/siswa/masuk');
        }
        Auth::shouldUse($guard);

        return $next($request);
    }
}
