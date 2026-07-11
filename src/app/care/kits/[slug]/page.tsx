/**
 * AQWELIA Care — Kit detail page.
 *
 * URL: /care/kits/[slug]
 * Server component. Renders the kit name, price, description, and the list
 * of included products (resolved from SKU references). CTA = "Add kit to cart"
 * (client component adds each item via /api/care/cart/item).
 */
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Package, Sparkles } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { db } from '@/lib/db'
import { KitAddToCart } from './kit-add-to-cart'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const t = await getTranslations('care')
  const { slug } = await params
  let k: { name: string; description: string | null } | null = null
  try {
    k = await (db as any).kit.findUnique({
      where: { slug },
      select: { name: true, description: true },
    })
  } catch {
    k = null
  }
  if (!k) return { title: t('kitsTitle') }
  return {
    title: `${k.name} — ${t('kitsTitle')}`,
    description: k.description ?? t('kitsSubtitle'),
  }
}

export default async function KitDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const t = await getTranslations('care')
  const { slug } = await params

  let kit: {
    id: string
    slug: string
    name: string
    description: string | null
    price: number
    currency: string
    imageUrl: string | null
    items: string
  } | null = null
  let products: Array<{
    id: string
    sku: string
    name: string
    unit: string
    price: number
    imageUrl: string | null
    active: boolean
  }> = []

  try {
    kit = await (db as any).kit.findUnique({ where: { slug } })
    if (!kit) return notFound()

    let parsed: Array<{ sku: string; quantity: number }> = []
    try {
      const p = JSON.parse(kit.items)
      if (Array.isArray(p)) parsed = p
    } catch {
      parsed = []
    }
    const skus = parsed.map((p) => p.sku)
    products = await db.product.findMany({ where: { sku: { in: skus } } })
  } catch (err) {
    console.error('[care/kits/[slug]] load failed:', err)
    return notFound()
  }

  // Rebuild the ordered list with quantity info.
  let parsed: Array<{ sku: string; quantity: number }> = []
  try {
    const p = JSON.parse(kit.items)
    if (Array.isArray(p)) parsed = p
  } catch {
    parsed = []
  }
  const productMap = new Map(products.map((p) => [p.sku, p]))
  const lineItems = parsed
    .map((it) => {
      const product = productMap.get(it.sku)
      if (!product) return null
      return { product, quantity: it.quantity }
    })
    .filter(Boolean) as Array<{ product: typeof products[number]; quantity: number }>

  return (
    <>
      <section className="relative overflow-hidden py-12 sm:py-16">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-secondary/40 via-background to-background" />
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <Link
            href="/care/kits"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t('kitBackToList')}
          </Link>

          <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-2">
            <div className="overflow-hidden rounded-2xl border border-white/40 bg-white/50 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.03]">
              <div className="aspect-square w-full bg-gradient-to-br from-secondary/40 to-background">
                {kit.imageUrl ? (
                  <img
                    src={kit.imageUrl}
                    alt={kit.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Package className="h-16 w-16 text-gold/40" />
                  </div>
                )}
              </div>
            </div>

            <div>
              <h1 className="font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
                {kit.name}
              </h1>
              {kit.description && (
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
                  {kit.description}
                </p>
              )}

              <div className="mt-6 flex items-baseline gap-1.5">
                <span className="font-display text-4xl font-bold text-gold">
                  {kit.price.toFixed(2)} €
                </span>
                <span className="text-sm text-muted-foreground">
                  {t('kitsPerKit')}
                </span>
              </div>

              <div className="mt-6">
                <KitAddToCart
                  items={lineItems.map((l) => ({
                    productId: l.product.id,
                    quantity: l.quantity,
                  }))}
                  labels={{
                    addKitToCart: t('kitAddToCart'),
                    added: t('kitAdded'),
                    empty: t('kitEmpty'),
                  }}
                />
              </div>
            </div>
          </div>

          {/* Contents */}
          <div className="mt-12">
            <h2 className="font-display text-xl font-bold tracking-tight sm:text-2xl">
              {t('kitContentsTitle')}
            </h2>
            {lineItems.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">{t('kitEmpty')}</p>
            ) : (
              <ul className="mt-4 space-y-2">
                {lineItems.map((l) => (
                  <li
                    key={l.product.id}
                    className="flex items-center gap-4 rounded-xl border border-white/40 bg-white/50 p-3 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.03]"
                  >
                    <div className="h-12 w-12 overflow-hidden rounded-lg bg-gradient-to-br from-secondary/40 to-background">
                      {l.product.imageUrl && (
                        <img
                          src={l.product.imageUrl}
                          alt={l.product.name}
                          className="h-full w-full object-cover"
                        />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-foreground">
                        {l.product.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {l.product.price.toFixed(2)} € / {l.product.unit}
                      </div>
                    </div>
                    <div className="text-right text-sm font-bold text-gold">
                      × {l.quantity}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-12 text-center">
            <Link
              href="/care/kits"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              <Sparkles className="h-3.5 w-3.5 text-gold" />
              {t('kitBackToList')}
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
