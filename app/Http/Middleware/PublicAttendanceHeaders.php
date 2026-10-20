<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

class PublicAttendanceHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        if (strlen($request->getContent()) > 32768) {
            $response = Inertia::render('public-attendance/notice', [
                'title' => 'Isian terlalu panjang', 'description' => 'Ringkas isian Anda, lalu coba kembali.',
            ])->toResponse($request)->setStatusCode(413);
        } else {
            $response = $next($request);
        }
        $response->headers->set('X-Robots-Tag', 'noindex, nofollow, noarchive');
        $response->headers->set('Referrer-Policy', 'no-referrer');
        $response->headers->set('Cache-Control', 'private, no-store');

        return $response;
    }
}
