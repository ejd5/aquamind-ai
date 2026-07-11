/**
 * AQWELIA Care — Category page.
 *
 * URL: /care/categories/[slug]
 * Server component. Lists active products in the category (matched by
 * `subcategory` = slug, since the category page is the subcategory
 * landing — e.g. /care/categories/bandelettes-tests).
 */
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { db } from '@/lib/db'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const t = await getTranslations('care')
  const { slug } = await params
  let cat: { name: string } | null = null
  try {
    cat = await db.productCategory.findUnique({ where: { slug }, select: { name: true } })
  } catch {
    cat = null
  }
  return {
    title: cat ? `${cat.name} — ${t('catalogueTitle')}` : t('catalogueTitle'),
    description: t('catalogueMessage'),
  }
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const t = await getTranslations('care')
  const { slug } = await params

  let category: {
    id: string
    slug: string
    name: string
    nameKey: string
    icon: string | null
    color: string | null
  } | null = null
  let products: Array<{
    id: string
    sku: string
    name: string
    brand: string | null
    description: string | null
    price: number
    currency: string
    unit: string
    imageUrl: string | null
    regulated: boolean
    active: boolean
    stockQty: number
    category: string
  }> = []

  try {
    category = await db.productCategory.findUnique({ where: { slug } })
    if (!category) return notFound()
    products = await db.product.findMany({
      where: { subcategory: slug, active: true },
      orderBy: [{ name: 'asc' }],
    })
  } catch (err) {
    console.error('[care/category] load failed:', err)
    return notFound()
  }

  return (
    <>
      <section className="relative overflow-hidden py-16 sm:py-20">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-secondary/40 via-background to-background" />
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <span className="section-label inline-block">{t('catalogueEyebrow')}</span>
          <h1 className="mt-4 font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl md:text-[3rem]">
            {category.name}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t('categorySubtitle')}
          </p>
        </div>
      </section>

      <section className="relative py-8 sm:py-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          {products.length === 0 ? (
            <div className="rounded-2xl border border-white/40 bg-white/50 p-10 text-center backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.03]">
              <p className="text-sm text-muted-foreground">{t('catalogueNoResults')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((p) => (
                <Link
                  key={p.id}
                  href={`/care/produit/${p.sku}`}
                  className="group relative overflow-hidden rounded-2xl bg-white/10 backdrop-blur-md border border-white/40 shadow-[0_18px_40px_-22px_oklch(0.45_0.12_195/0.25)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_28px_55px_-22px_oklch(0.45_0.12_195/0.4)] dark:bg-white/[0.06] dark:border-white/15"
                >
                  <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <div className="aspect-[4/3] w-full bg-gradient-to-br from-secondary/40 to-background">
                    {p.imageUrl && (
                      <img
                        src={p.imageUrl}
                        alt={p.name}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    )}
                  </div>
                  <div className="p-5">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      {p.sku}
                    </span>
                    <h3 className="mt-2 font-display text-base font-bold text-foreground group-hover:text-gold">
                      {p.name}
                    </h3>
                    {p.brand && (
                      <p className="mt-1 text-xs text-muted-foreground">{p.brand}</p>
                    )}
                    <div className="mt-3 flex items-baseline gap-1">
                      <span className="font-display text-lg font-bold text-gold">
                        {p.price.toFixed(2)} €
                      </span>
                      <span className="text-xs text-muted-foreground">/ {p.unit}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="relative py-12 sm:py-16">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/care/catalogue"
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
