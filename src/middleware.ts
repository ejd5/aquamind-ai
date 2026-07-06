/**
 * AQWELIA — NextAuth middleware
 *
 * Protects authenticated API routes by requiring a valid JWT session.
 * Unauthenticated requests are redirected to `/auth/signin` (per `pages.signIn`).
 *
 * The matcher explicitly enumerates protected route prefixes so that public
 * routes (`/api`, `/api/auth/*`, future `/api/health`) are NOT intercepted.
 *
 * Note: `withAuth` short-circuits to `NextResponse.next()` when a valid token
 * is present; otherwise it redirects/returns 401 (for API routes, the default
 * behaviour is a JSON 401 because of the `authorized` callback fallback).
 */
import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(_req) {
    // Token is guaranteed present here (withAuth skips this function otherwise).
    return NextResponse.next()
  },
  {
    pages: { signIn: '/auth/signin' },
  }
)

export const config = {
  // Protect all business API routes. Does NOT include:
  //   - `/api`            (health check, public)
  //   - `/api/auth/*`     (NextAuth handlers + /register + /me)
  matcher: [
    '/api/pool/:path*',
    '/api/dashboard/:path*',
    '/api/chat/:path*',
    '/api/guides/:path*',
    '/api/subscription/:path*',
    '/api/analytics/:path*',
  ],
}
