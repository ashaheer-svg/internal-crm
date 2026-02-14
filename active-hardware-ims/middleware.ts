import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
// logger cannot be imported in middleware if it uses Node.js specifics not available in Edge
// But my logger uses `console`, which is fine.
// However, `process.env` might be an issue if not polyfilled? Next.js handles `process.env.NODE_ENV`.
// Let's try. If it fails, I'll fallback to console.log locally.
// Actually, `lib/logger.ts` is simple enough.

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl
    console.log(`[REQ] ${request.method} ${pathname}`) // Simple middleware logging for now to avoid Edge runtime issues with non-standard modules


    // Public paths that don't require authentication
    const publicPaths = ['/login', '/api/auth/login']
    const isPublicPath = publicPaths.some(path => pathname.startsWith(path))

    // Get session token from cookies
    const token = request.cookies.get('session')?.value

    // If accessing public path
    if (isPublicPath) {
        // If logged in and trying to access login, redirect to dashboard
        if (token && pathname === '/login') {
            return NextResponse.redirect(new URL('/dashboard', request.url))
        }
        return NextResponse.next()
    }

    // If accessing protected path without token, redirect to login
    if (!token && (
        pathname.startsWith('/dashboard') ||
        pathname.startsWith('/change-password')
    )) {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    return NextResponse.next()
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
}
