/**
 * AQWELIA Care — Real catalog page.
 *
 * URL: /care/catalogue
 * Server component. Reads products + categories from the DB and renders a
 * filterable catalog. Filter query params:
 *   ?category=green|orange|red
 *   ?subcategory=<slug>
 *   ?search=<text>
 *
 * Red (regulated) products are shown with an "info only" badge — they cannot
 * be ordered from AQWELIA Care. The CTA on those products routes to the
 * partners page.
 */
import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Sparkles, Search, AlertTriangle, ShoppingCart } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { db } from '@/lib/db'
import { CatalogBrowser } from './catalog-browser'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('care')
  return {
    title: t('catalogueTitle'),
    description: t('catalogueMessage'),
  }
}

export default async function CareCataloguePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const t = await getTranslations('care')
  const sp = await searchParams
  const category = typeof sp.category === 'string' ? sp.category : undefined
  const subcategory = typeof sp.subcategory === 'string' ? sp.subcategory : undefined
  const search = typeof sp.search === 'string' ? sp.search : undefined

  const where: any = {}
  if (category && ['green', 'orange', 'red'].includes(category)) where.category = category
  if (subcategory) where.subcategory = subcategory

  let products: Array<{
    id: string
    sku: string
    name: string
    brand: string | null
    category: string
    subcategory: string | null
    description: string | null
    price: number
    currency: string
    unit: string
    stockQty: number
    imageUrl: string | null
    regulated: boolean
    hazardLevel: string | null
    active: boolean
  }> = []
  let categories: Array<{
    id: string
    slug: string
    name: string
    nameKey: string
    icon: string | null
    color: string | null
    sortOrder: number
  }> = []

  try {
    ;[products, categories] = await Promise.all([
      db.product.findMany({
        // Include inactive (red/regulated) products so the catalogue can show
        // them with a "partner-only" badge — the UI blocks adding them to the
        // cart client-side and the API rejects them server-side as a second
        // line of defense.
        where: search
          ? {
              AND: [
                where,
                {
                  OR: [
                    { name: { contains: search } },
                    { brand: { contains: search } },
                    { sku: { contains: search } },
                    { description: { contains: search } },
                  ],
                },
              ],
            }
          : where,
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
      }),
      db.productCategory.findMany({
        orderBy: [{ sortOrder: 'asc' }, { slug: 'asc' }],
      }),
    ])
  } catch (err) {
    console.error('[care/catalogue] load failed:', err)
  }

  return (
    <>
      <section className="relative overflow-hidden py-16 sm:py-20">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-secondary/40 via-background to-background" />
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <span className="section-label inline-block">{t('catalogueEyebrow')}</span>
          <h1 className="mt-4 font-display text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl md:text-[3.5rem]">
            {t('catalogueTitle')}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t('catalogueMessage')}
          </p>
        </div>
      </section>

      <section className="relative py-8 sm:py-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <CatalogBrowser
            products={products.map((p) => ({
              id: p.id,
              sku: p.sku,
              name: p.name,
              brand: p.brand ?? undefined,
              category: p.category as 'green' | 'orange' | 'red',
              subcategory: p.subcategory ?? undefined,
              description: p.description ?? undefined,
              price: p.price,
              currency: p.currency,
              unit: p.unit,
              stockQty: p.stockQty,
              imageUrl: p.imageUrl ?? undefined,
              regulated: p.regulated,
              hazardLevel: (p.hazardLevel ?? undefined) as
                | 'none'
                | 'low'
                | 'medium'
                | 'high'
                | undefined,
              active: p.active,
            }))}
            categories={categories.map((c) => ({
              slug: c.slug,
              name: c.name,
              nameKey: c.nameKey,
              icon: c.icon ?? undefined,
              color: (c.color ?? undefined) as 'green' | 'orange' | 'red' | undefined,
              sortOrder: c.sortOrder,
            }))}
            initialCategory={category}
            initialSubcategory={subcategory}
            initialSearch={search}
            labels={{
              search: t('catalogueSearch'),
              allCategories: t('catalogueAllCategories'),
              allColors: t('catalogueAllColors'),
              green: t('catalogueColorGreen'),
              orange: t('catalogueColorOrange'),
              red: t('catalogueColorRed'),
              addToCart: t('catalogueAddToCart'),
              partnerOnly: t('cataloguePartnerOnly'),
              outOfStock: t('catalogueOutOfStock'),
              inStock: t('catalogueInStock'),
              noResults: t('catalogueNoResults'),
              filter: t('catalogueFilter'),
              clear: t('catalogueClear'),
              perUnit: t('cataloguePerUnit'),
            }}
          />
        </div>
      </section>

      <section className="relative py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/care"
              className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-background/80 px-5 py-2.5 text-sm font-bold text-foreground transition-colors hover:border-gold hover:text-gold"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {t('catalogueCtaBack')}
            </Link>
            <Link
              href="/care/kits"
              className="glow-gold group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-gold via-[oklch(0.65_0.11_195)] to-[oklch(0.55_0.10_195)] px-5 py-2.5 text-sm font-bold text-[oklch(0.99_0.01_195)] shadow-md transition-all hover:scale-[1.02]"
            >
              <Sparkles className="h-4 w-4" />
              {t('catalogueCtaKits')}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
