<?php

namespace App\Http\Controllers;

use App\Http\Requests\SettingsRequest;
use Illuminate\Support\Str;
use Inertia\Inertia;

class SettingsController extends Controller
{
    public function edit()
    {
        return Inertia::render('teacher/settings');
    }

    public function update(SettingsRequest $request)
    {
        $user = $request->user();
        $data = $request->safe()->only(['name', 'email']);
        if ($request->filled('password')) {
            $data['password'] = $request->input('password');
            $data['remember_token'] = Str::random(60);
        }
        $user->update($data);
        $request->session()->put('password_hash_web', $user->getAuthPassword());
        $request->session()->regenerate();

        return back()->with('success', 'Pengaturan akun berhasil disimpan.');
    }
}
