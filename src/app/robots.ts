/**
 * AQWELIA — robots.txt (P8-INFRA)
 *
 * Next.js App Router convention: a `robots.ts` at the root of `app/` is
 * served at `/robots.txt` with content-type `text/plain`. The function
 * returns a `MetadataRoute.Robots` object that Next.js serialises to the
 * robots.txt syntax.
 *
 * Policy:
 *   - Allow all crawlers to access the whole site by default.
 *   - Disallow /api/, /admin, /auth/ (no SEO value / auth-gated).
 *   - Disallow /pro/app/* and /settings (auth-gated app routes).
 *   - Point to the sitemap at /sitemap.xml (absolute URL via SITE_URL).
 *
 * Note: the legacy static `public/robots.txt` was deleted to avoid conflicts
 * with this dynamic route — Next.js would otherwise serve the static file
 * with priority and silently ignore this handler.
 */
import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/seo'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/admin', '/auth/', '/pro/app/', '/settings'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
