/**
 * AQWELIA — Middleware
 *
 * Combines:
 *  1. Locale detection — sets the `NEXT_LOCALE` cookie based on (in order):
 *     - existing `NEXT_LOCALE` cookie
 *     - `Accept-Language` header
 *     - default locale `fr`
 *  2. NextAuth authentication — protects business API routes by requiring a
 *     valid JWT session. Unauthenticated requests get a 401 JSON response
 *     (for API routes) or are redirected to `/auth/signin` (for pages).
 */
import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { locales, defaultLocale, normalizeLocale } from '@/i18n/config'

/**
 * Detect the user's preferred locale.
 * Order: `NEXT_LOCALE` cookie → `Accept-Language` header → default (`fr`).
 */
function detectLocale(req: NextRequest): string {
  // 1. Cookie
  const cookieLocale = req.cookies.get('NEXT_LOCALE')?.value
  if (cookieLocale) {
    const normalized = normalizeLocale(cookieLocale)
    if (normalized !== defaultLocale) return normalized
  }

  // 2. Accept-Language
  const acceptLang = req.headers.get('accept-language')
  if (acceptLang) {
    const parsed = acceptLang
      .split(',')
      .map((part) => {
        const [tag, qStr] = part.trim().split(';q=')
        const q = qStr ? parseFloat(qStr) : 1
        return { tag: tag?.toLowerCase() ?? '', q }
      })
      .filter((x) => x.tag)
      .sort((a, b) => b.q - a.q)
    for (const { tag } of parsed) {
      const short = tag.split('-')[0]
      if (locales.includes(short as (typeof locales)[number])) {
        return short
      }
    }
  }

  // 3. Default
  return defaultLocale
}

/**
 * Locale middleware: ensures the `NEXT_LOCALE` cookie is set so that
 * `getRequestConfig` in `src/i18n/request.ts` can pick it up via `requestLocale`.
 */
function localeMiddleware(req: NextRequest) {
  const detected = detectLocale(req)
  const existing = req.cookies.get('NEXT_LOCALE')?.value
  if (existing !== detected) {
    const res = NextResponse.next({
      request: { headers: req.headers },
    })
    res.cookies.set('NEXT_LOCALE', detected, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // 1 year
      sameSite: 'lax',
    })
    return res
  }
  return NextResponse.next()
}

// Combine: locale detection runs on ALL routes (including the API ones below).
// withAuth runs only on the protected API routes declared in `config.matcher`.
export default withAuth(
  function middleware(req: NextRequest) {
    // Locale cookie stamping first (so request.ts can read it).
    const localeRes = localeMiddleware(req)
    if (localeRes) return localeRes
    // Token is guaranteed present here (withAuth skips this function otherwise).
    return NextResponse.next()
  },
  {
    pages: { signIn: '/auth/signin' },
  }
)

export const config = {
  // Run locale detection on all routes, AND protect business API routes.
  // Does NOT include:
  //   - `/api`            (health check, public)
  //   - `/api/auth/*`     (NextAuth handlers + /register + /me)
  matcher: [
    /*
     * Locale middleware runs on all non-asset paths.
     * Auth middleware runs on protected business routes only.
     */
    '/((?!_next/static|_next/image|favicon.ico|icon.png|icon-aqwelia-48.png|apple-touch-icon.png|robots.txt|.*\\..*).*)',
    '/api/pool/:path*',
    '/api/dashboard/:path*',
    '/api/chat/:path*',
    '/api/guides/:path*',
    '/api/subscription/:path*',
    '/api/analytics/:path*',
  ],
}
