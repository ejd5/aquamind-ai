/**
 * AQWELIA — Middleware
 *
 * Combines:
 *  1. Locale detection — sets the `NEXT_LOCALE` cookie + header so that
 *     `getRequestConfig` in `src/i18n/request.ts` can read it via `requestLocale`.
 *  2. NextAuth authentication — protects API routes by requiring a valid JWT.
 *
 * IMPORTANT: For API routes we return a 401 JSON response instead of redirecting
 * to /auth/signin. A 307 redirect on a fetch() delivers the signin page HTML,
 * which breaks client-side JSON parsing.
 */
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
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
    return normalized
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

// Protected API routes that require NextAuth session
const PROTECTED_PATTERNS = [
  /^\/api\/pool\//,
  /^\/api\/dashboard\//,
  /^\/api\/chat\//,
  /^\/api\/guides\//,
  /^\/api\/subscription\//,
  /^\/api\/analytics\//,
  /^\/api\/account\//,
  /^\/api\/stripe\//,
  // AQWELIA Growth OS — dashboard + agents (public lead capture POST is OK)
  /^\/api\/growth\/dashboard\//,
  /^\/api\/growth\/agents\//,
]

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // --- Locale detection (runs on ALL routes) ---
  const detected = detectLocale(req)
  const existing = req.cookies.get('NEXT_LOCALE')?.value

  // Create response with locale cookie + header
  const res = NextResponse.next({
    request: {
      headers: new Headers(req.headers),
    },
  })

  // Set cookie if changed or missing
  if (existing !== detected) {
    res.cookies.set('NEXT_LOCALE', detected, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
    })
  }

  // Set the header so request.ts can read it via requestLocale
  res.headers.set('x-next-intl-locale', detected)
  // Also set on the request headers so getRequestConfig can read it
  res.headers.set('accept-language', detected)

  // ── Anti-cache headers (for dev sandbox — prevents stale JS) ──
  res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
  res.headers.set('Pragma', 'no-cache')
  res.headers.set('Expires', '0')

  // --- Auth protection (runs only on protected API routes) ---
  // For API routes: return 401 JSON (NOT a redirect) so client-side fetch()
  // can cleanly detect "not authenticated" and trigger the signin flow.
  const isProtected = PROTECTED_PATTERNS.some((p) => p.test(pathname))
  if (isProtected) {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    })
    if (!token) {
      return NextResponse.json(
        { error: 'unauthorized', authenticated: false },
        { status: 401 }
      )
    }
  }

  return res
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon.png|icon-aqwelia-48.png|apple-touch-icon.png|robots.txt|api/auth|.*\\..*).*)',
  ],
}
