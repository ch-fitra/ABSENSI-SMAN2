<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void {}

    public function boot(): void
    {
        if ($this->app->isProduction()) {
            URL::forceScheme('https');
            config(['session.secure' => true]);
        }
        RateLimiter::for('login', fn (Request $request) => [
            Limit::perMinute(30)->by($request->ip()),
            Limit::perMinute(5)->by($request->ip().'|'.hash('sha256', strtolower((string) $request->input('email', $request->input('nisn', ''))))),
        ]);
        RateLimiter::for('public-attendance', fn (Request $request) => [
            Limit::perMinute(60)->by('public-form|'.$request->ip().'|'.$request->route('token')),
            Limit::perMinute(300)->by('public-ip|'.$request->ip()),
        ]);
        foreach (['reports' => 10, 'imports' => 10, 'submissions' => 30] as $name => $limit) {
            RateLimiter::for($name, fn (Request $request) => Limit::perMinute($limit)->by($request->user()?->getAuthIdentifier().'|'.$request->path()));
        }
    }
}
