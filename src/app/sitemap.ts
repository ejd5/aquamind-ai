/**
 * AQWELIA — Dynamic sitemap (P8-INFRA)
 *
 * Generates /sitemap.xml at request time. Lists all public marketing pages,
 * product hubs, partner pages, legal pages, and the academy index. Routes
 * that don't exist yet (e.g. /business, /growth base pages) are still listed
 * because they are publicly-announced URLs that will resolve to landing pages
 * in subsequent phases — Google can discover and crawl them as soon as they
 * 200.
 *
 * The Next.js App Router convention: any `sitemap.ts` at the root of `app/`
 * is automatically served at `/sitemap.xml` with content-type
 * `application/xml`. The function returns `MetadataRoute.Sitemap` (an array
 * of `MetadataRoute.Sitemap` items).
 *
 * `metadataBase` is not yet set on `next.config.ts` (we run with the default
 * `null`); the sitemap still works because we set absolute `url` values from
 * `SITE_URL` (env-driven, default https://aqwelia.app).
 *
 * Routes excluded by design:
 *   - /api/* (not crawlable, returns JSON)
 *   - /auth/* (auth-gated, no SEO value)
 *   - /admin (back-office)
 *   - /pro/app/* (auth-gated pro app)
 *   - /settings (auth-gated user settings)
 *
 * `changeFreq` is a hint for crawlers, not a directive. We use:
 *   - 'weekly' for static marketing pages (homepage, fonctionnalites, tarifs…)
 *   - 'monthly' for legal pages (rarely change)
 *   - 'daily' for the homepage (most dynamic)
 *
 * `priority` is a 0-1 hint (1.0 = highest). We use:
 *   - 1.0 for the homepage
 *   - 0.9 for primary conversion pages (/tarifs, /pro)
 *   - 0.7-0.8 for secondary marketing pages
 *   - 0.5 for legal pages
 *   - 0.6 for academy index
 */
import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/seo'

type ChangeFreq = 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'

interface SitemapEntry {
  path: string
  changeFrequency: ChangeFreq
  priority: number
  lastModified?: string
}

/** Static, hand-curated entries (public marketing + legal + partner pages). */
const STATIC_ENTRIES: SitemapEntry[] = [
  // ── Top-level ─────────────────────────────────────────────────────────
  { path: '/', changeFrequency: 'daily', priority: 1.0 },
  { path: '/fonctionnalites', changeFrequency: 'weekly', priority: 0.9 },
  { path: '/comment-ca-marche', changeFrequency: 'weekly', priority: 0.8 },
  { path: '/tarifs', changeFrequency: 'weekly', priority: 0.9 },
  { path: '/faq', changeFrequency: 'weekly', priority: 0.7 }, // landing anchor (rich result)
  { path: '/a-propos', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/contact', changeFrequency: 'monthly', priority: 0.7 },

  // ── Pro hub (/pro) ────────────────────────────────────────────────────
  { path: '/pro', changeFrequency: 'weekly', priority: 0.9 },
  { path: '/pro/fonctionnalites', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/pro/tarifs', changeFrequency: 'monthly', priority: 0.9 },
  { path: '/pro/solo', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/pro/team', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/pro/fleet', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/pro/early-access', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/pro/demo', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/pro/faq', changeFrequency: 'monthly', priority: 0.6 },

  // ── Care hub (/care) ──────────────────────────────────────────────────
  { path: '/care', changeFrequency: 'weekly', priority: 0.8 },
  { path: '/care/catalogue', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/care/recommandations', changeFrequency: 'monthly', priority: 0.6 },

  // ── Business hub (placeholders for future phases) ─────────────────────
  { path: '/business', changeFrequency: 'monthly', priority: 0.6 },

  // ── Growth hub (placeholders for future phases) ───────────────────────
  { path: '/growth', changeFrequency: 'monthly', priority: 0.6 },

  // ── Partners + affiliation ────────────────────────────────────────────
  { path: '/partenaires', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/partenaires/piscinistes', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/partenaires/fournisseurs', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/affiliation', changeFrequency: 'monthly', priority: 0.6 },

  // ── Academy (P8-INFRA) ────────────────────────────────────────────────
  { path: '/academy', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/academy/certification', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/academy/guides', changeFrequency: 'weekly', priority: 0.6 },

  // ── Legal ─────────────────────────────────────────────────────────────
  { path: '/legal/cgu', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/legal/cgv', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/legal/privacy', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/legal/cookies', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/legal/support', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/legal/accessibilite', changeFrequency: 'monthly', priority: 0.3 },
  { path: '/legal/securite', changeFrequency: 'monthly', priority: 0.3 },

  // ── RGPD data management (standalone, complements /legal/privacy) ─────
  { path: '/gestion-donnees', changeFrequency: 'monthly', priority: 0.5 },

  // NOTE: /mentions-legales, /confidentialite, /conditions-utilisation are
  // legacy redirects (308 → /legal/cgu or /legal/privacy). They are NOT
  // listed here because the sitemap must point to canonical URLs only.
]

/**
 * Build the sitemap. Static entries are emitted with the site URL prefix.
 * Dynamic entries (academy courses, care products, guides…) would be fetched
 * from the DB in a real production setup — left as a documented TODO so the
 * page stays fast (DB query at the edge can be added per-route when needed).
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date().toISOString()

  return STATIC_ENTRIES.map((entry) => ({
    url: `${SITE_URL}${entry.path}`,
    lastModified: entry.lastModified ?? now,
    changeFrequency: entry.changeFrequency,
    priority: entry.priority,
  }))
}
