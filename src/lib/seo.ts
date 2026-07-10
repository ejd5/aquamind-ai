/**
 * AQWELIA — SEO helpers (P8-INFRA)
 *
 * Centralised metadata generation for Next.js 16 App Router. Pages import
 * `generateMetadata` (the helper, not the Next.js built-in) to produce a
 * consistent `Metadata` object with:
 *   - title + description (with template suffix for sub-pages)
 *   - canonical URL via `metadataBase` (read from NEXT_PUBLIC_SITE_URL,
 *     default https://aqwelia.app)
 *   - Open Graph image (default /aqwelia-hero-bg.png if none provided)
 *   - Twitter card (summary_large_image)
 *   - noindex flag for private/app routes
 *
 * Why a helper:
 *   - Next.js's own `generateMetadata` is a route-level async function; the
 *     `Metadata` object it returns is a plain object. We provide a tiny
 *     factory so every page builds it the same way (canonical URL, OG image,
 *     twitter card, robots) without copy-pasting 30 lines.
 *
 * Usage (in a server component):
 *   import { buildMetadata, type BuildMetadataInput } from '@/lib/seo'
 *   export async function generateMetadata(): Promise<Metadata> {
 *     const t = await getTranslations('fonctionnalites')
 *     return buildMetadata({ title: t('metaTitle'), description: t('metaDescription'), path: '/fonctionnalites' })
 *   }
 */
import type { Metadata } from 'next'

/** Production site URL (no trailing slash). Defaults to the AQWELIA prod URL. */
export const SITE_URL: string = (
  process.env.NEXT_PUBLIC_SITE_URL || 'https://aqwelia.app'
).replace(/\/$/, '')

/** Default OG image, served from /public. */
export const DEFAULT_OG_IMAGE = '/aqwelia-hero-bg.png'

/** Twitter handle (@aqwelia_app) — used in twitter:site meta. */
export const TWITTER_HANDLE = '@aqwelia_app'

export interface BuildMetadataInput {
  /** Page title (already localised). */
  title: string
  /** Page meta description (already localised, max ~160 chars). */
  description: string
  /** Path of the page relative to the site root (e.g. "/fonctionnalites").
   *  Used to build the canonical URL. Defaults to "/". */
  path?: string
  /** Absolute or relative image URL for OG/Twitter cards. Falls back to the
   *  default hero image. */
  image?: string
  /** When true, emits `robots: { index: false, follow: false }`. Use for
   *  app routes (dashboard, settings) and private pages. */
  noindex?: boolean
  /** Optional keywords array. */
  keywords?: string[]
  /** Override the OG type (default 'website'). Use 'article' for blog posts. */
  type?: 'website' | 'article'
  /** Optional published/modified time for articles (ISO string). */
  publishedTime?: string
  /** Optional section name for articles. */
  section?: string
}

/**
 * Build a complete `Metadata` object for a page. Resolves the canonical URL
 * from `SITE_URL + path`, sets the OG image (absolute URL required by OG), and
 * configures the Twitter card.
 */
export function buildMetadata(input: BuildMetadataInput): Metadata {
  const {
    title,
    description,
    path = '/',
    image,
    noindex = false,
    keywords,
    type = 'website',
    publishedTime,
    section,
  } = input

  const canonicalUrl = `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`
  const imageUrl = image
    ? (image.startsWith('http') ? image : `${SITE_URL}${image.startsWith('/') ? image : `/${image}`}`)
    : `${SITE_URL}${DEFAULT_OG_IMAGE}`

  const metadata: Metadata = {
    title,
    description,
    keywords,
    alternates: { canonical: path },
    robots: noindex
      ? { index: false, follow: false, googleBot: { index: false, follow: false } }
      : { index: true, follow: true, googleBot: { index: true, follow: true } },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: 'AQWELIA',
      images: [{ url: imageUrl, width: 1200, height: 630, alt: title }],
      locale: 'fr_FR',
      type,
      ...(type === 'article' && publishedTime ? { publishedTime } : {}),
      ...(type === 'article' && section ? { section } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      site: TWITTER_HANDLE,
      creator: TWITTER_HANDLE,
      title,
      description,
      images: [imageUrl],
    },
  }

  return metadata
}

/**
 * Build the absolute URL for a given path. Useful for sitemap.ts, RSS feeds,
 * structured-data JSON-LD `@id` references, etc.
 */
export function absoluteUrl(path: string = '/'): string {
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`
}

/**
 * The default site-wide metadata (used by the root layout's `generateMetadata`
 * when no per-page override is provided). Includes the AQWELIA brand keywords.
 */
export const SITE_METADATA = {
  name: 'AQWELIA',
  tagline: 'L\'eau qui va bien, par l\'intelligence.',
  url: SITE_URL,
  logo: `${SITE_URL}/logo-aqwelia-web.png`,
  ogImage: `${SITE_URL}${DEFAULT_OG_IMAGE}`,
  twitter: TWITTER_HANDLE,
} as const
