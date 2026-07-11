/**
 * AQWELIA — SEO Structured Data (JSON-LD) components (P8-INFRA)
 *
 * Server components that emit `<script type="application/ld+json">` blocks
 * for Google rich-results eligibility. Each export renders a single schema
 * (Organization, SoftwareApplication, FAQPage, BreadcrumbList, Product,
 * Course) and can be composed on any page.
 *
 * All JSON-LD uses absolute URLs from `SITE_URL` so Google can crawl it
 * without ambiguity (relative URLs are invalid in JSON-LD `@id` / `url`).
 *
 * Usage:
 *   import { OrganizationSchema, SoftwareApplicationSchema, FAQPageSchema,
 *            BreadcrumbListSchema, ProductSchema, Breadcrumbs } from '@/components/seo/structured-data'
 *
 *   <OrganizationSchema />
 *   <SoftwareApplicationSchema faqs={FAQ} />
 *   <FAQPageSchema faqs={FAQ} />
 *   <BreadcrumbListSchema items={[{ name: 'Academy', path: '/academy' }]} />
 *   <ProductSchema name="..." description="..." image="/..." />
 */
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { SITE_URL, DEFAULT_OG_IMAGE } from '@/lib/seo'

/** Common JSON-LD context. */
const LD_CONTEXT = 'https://schema.org'

/** Generic helper to emit a JSON-LD script tag. */
function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // JSON.stringify output is safe to inject here (no user-controlled input).
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}

// ──────────────────────────────────────────────────────────────────────────
// Organization — global brand entity (referenced by rich results)
// ──────────────────────────────────────────────────────────────────────────

export function OrganizationSchema() {
  return (
    <JsonLd
      data={{
        '@context': LD_CONTEXT,
        '@type': 'Organization',
        '@id': `${SITE_URL}/#organization`,
        name: 'AQWELIA',
        url: SITE_URL,
        logo: `${SITE_URL}/logo-aqwelia-web.png`,
        description:
          'AQWELIA is the AI copilot for pool & spa water quality — diagnostic, action plans, reminders, and savings tracking.',
        foundingDate: '2024',
        email: 'contact@aqwelia.app',
        sameAs: [
          'https://twitter.com/aqwelia_app',
          'https://www.linkedin.com/company/aqwelia',
          'https://www.instagram.com/aqwelia.app',
        ],
        contactPoint: [
          {
            '@type': 'ContactPoint',
            contactType: 'customer support',
            email: 'contact@aqwelia.app',
            availableLanguage: ['French', 'English', 'Spanish', 'German', 'Italian', 'Portuguese', 'Dutch'],
          },
        ],
      }}
    />
  )
}

// ──────────────────────────────────────────────────────────────────────────
// SoftwareApplication — for rich results on /fonctionnalites and home page
// ──────────────────────────────────────────────────────────────────────────

export interface SoftwareApplicationSchemaInput {
  /** Application name (default: 'AQWELIA'). */
  name?: string
  /** Localised short description. */
  description?: string
  /** Application category (default: 'LifestyleApplication'). */
  applicationCategory?: string
  /** Operating systems (default: ['Web', 'iOS', 'Android']). */
  operatingSystem?: string[]
  /** Rating value 0-5. */
  ratingValue?: number
  /** Number of ratings. */
  ratingCount?: number
  /** Optional pricing info (e.g. 'Free trial available'). */
  offers?: { price: string; priceCurrency: string }
}

export function SoftwareApplicationSchema(input: SoftwareApplicationSchemaInput = {}) {
  const {
    name = 'AQWELIA',
    description = 'AI copilot for pool & spa water quality — diagnostic, action plans, reminders, savings tracking.',
    applicationCategory = 'LifestyleApplication',
    operatingSystem = ['Web', 'iOS', 'Android'],
    ratingValue,
    ratingCount,
    offers,
  } = input

  const data: Record<string, unknown> = {
    '@context': LD_CONTEXT,
    '@type': 'SoftwareApplication',
    '@id': `${SITE_URL}/#software`,
    name,
    description,
    applicationCategory,
    operatingSystem: operatingSystem.join(', '),
    url: SITE_URL,
    image: `${SITE_URL}${DEFAULT_OG_IMAGE}`,
    publisher: { '@id': `${SITE_URL}/#organization` },
  }

  if (ratingValue != null && ratingCount != null) {
    data.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue,
      ratingCount,
    }
  }

  if (offers) {
    data.offers = {
      '@type': 'Offer',
      price: offers.price,
      priceCurrency: offers.priceCurrency,
    }
  }

  return <JsonLd data={data} />
}

// ──────────────────────────────────────────────────────────────────────────
// FAQPage — for rich results on the landing FAQ section
// ──────────────────────────────────────────────────────────────────────────

export interface FAQItem {
  question: string
  answer: string
}

export function FAQPageSchema({ faqs }: { faqs: FAQItem[] }) {
  if (!faqs || faqs.length === 0) return null
  return (
    <JsonLd
      data={{
        '@context': LD_CONTEXT,
        '@type': 'FAQPage',
        '@id': `${SITE_URL}/#faq`,
        mainEntity: faqs.map((f) => ({
          '@type': 'Question',
          name: f.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: f.answer,
          },
        })),
      }}
    />
  )
}

// ──────────────────────────────────────────────────────────────────────────
// BreadcrumbList — for breadcrumb rich results on sub-pages
// ──────────────────────────────────────────────────────────────────────────

export interface BreadcrumbItem {
  /** Display name (localised). */
  name: string
  /** Absolute or relative path (e.g. "/academy"). */
  path: string
}

export function BreadcrumbListSchema({ items }: { items: BreadcrumbItem[] }) {
  if (!items || items.length === 0) return null
  return (
    <JsonLd
      data={{
        '@context': LD_CONTEXT,
        '@type': 'BreadcrumbList',
        '@id': `${SITE_URL}${items[items.length - 1].path}#breadcrumb`,
        itemListElement: items.map((item, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: item.name,
          item: `${SITE_URL}${item.path}`,
        })),
      }}
    />
  )
}

// ──────────────────────────────────────────────────────────────────────────
// Product — for AQWELIA Care marketplace items
// ──────────────────────────────────────────────────────────────────────────

export interface ProductSchemaInput {
  name: string
  description: string
  /** Relative image path (e.g. "/products/ph-minus.jpg"). */
  image?: string
  /** Brand name (default: 'AQWELIA Care'). */
  brand?: string
  /** SKU / product code. */
  sku?: string
  /** Price value. */
  price: number
  /** Currency code (default: 'EUR'). */
  currency?: string
  /** Availability (default: 'InStock'). */
  availability?: 'InStock' | 'OutOfStock' | 'PreOrder'
  /** Path of the product page (for the canonical `url`). */
  path: string
}

export function ProductSchema(input: ProductSchemaInput) {
  const {
    name,
    description,
    image,
    brand = 'AQWELIA Care',
    sku,
    price,
    currency = 'EUR',
    availability = 'InStock',
    path,
  } = input

  return (
    <JsonLd
      data={{
        '@context': LD_CONTEXT,
        '@type': 'Product',
        '@id': `${SITE_URL}${path}#product`,
        name,
        description,
        image: image ? `${SITE_URL}${image}` : `${SITE_URL}${DEFAULT_OG_IMAGE}`,
        brand: { '@type': 'Brand', name: brand },
        ...(sku ? { sku } : {}),
        offers: {
          '@type': 'Offer',
          url: `${SITE_URL}${path}`,
          priceCurrency: currency,
          price,
          availability: `https://schema.org/${availability}`,
        },
      }}
    />
  )
}

// ──────────────────────────────────────────────────────────────────────────
// Course — for AQWELIA Academy rich results
// ──────────────────────────────────────────────────────────────────────────

export interface CourseSchemaInput {
  name: string
  description: string
  /** Path of the course page (e.g. "/academy/ph-basics"). */
  path: string
  /** Localised provider name (default: 'AQWELIA Academy'). */
  provider?: string
}

export function CourseSchema(input: CourseSchemaInput) {
  const { name, description, path, provider = 'AQWELIA Academy' } = input
  return (
    <JsonLd
      data={{
        '@context': LD_CONTEXT,
        '@type': 'Course',
        '@id': `${SITE_URL}${path}#course`,
        name,
        description,
        provider: {
          '@type': 'Organization',
          name: provider,
          sameAs: SITE_URL,
        },
      }}
    />
  )
}

// ──────────────────────────────────────────────────────────────────────────
// Visual breadcrumbs UI (server component, no JS)
// ──────────────────────────────────────────────────────────────────────────

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  if (!items || items.length === 0) return null
  return (
    <nav aria-label="breadcrumb" className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
      <ol className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground sm:gap-2 sm:text-sm">
        {items.map((item, index) => {
          const isLast = index === items.length - 1
          return (
            <li key={item.path} className="inline-flex items-center gap-1.5">
              {isLast ? (
                <span className="font-medium text-foreground" aria-current="page">
                  {item.name}
                </span>
              ) : (
                <Link href={item.path} className="transition-colors hover:text-gold">
                  {item.name}
                </Link>
              )}
              {!isLast && <ChevronRight className="h-3 w-3 sm:h-3.5 sm:w-3.5" />}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
