/**
 * AQWELIA Care — Product detail page.
 *
 * URL: /care/produit/[slug]  (slug = product SKU or id)
 * Server component. Renders the product image, name, price, description,
 * stock badge, SDS link, hazard warnings, instructions, and an "Add to cart"
 * CTA. For regulated (red) products the CTA becomes "Find a partner supplier".
 */
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ArrowLeft,
  ShoppingCart,
  AlertTriangle,
  CheckCircle2,
  X,
  FileText,
  ShieldCheck,
} from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { db } from '@/lib/db'
import { ProductDetailActions } from './product-detail-actions'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const t = await getTranslations('care')
  const { slug } = await params
  let p: { name: string; description: string | null } | null = null
  try {
    p = await db.product.findFirst({
      where: { OR: [{ id: slug }, { sku: slug }] },
      select: { name: true, description: true },
    })
  } catch {
    p = null
  }
  if (!p) return { title: t('catalogueTitle') }
  return {
    title: `${p.name} — ${t('catalogueTitle')}`,
    description: p.description ?? t('catalogueMessage'),
  }
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const t = await getTranslations('care')
  const { slug } = await params

  let product: {
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
    sdsUrl: string | null
    instructions: string | null
    warnings: string | null
    active: boolean
    country: string
  } | null = null

  try {
    product = await db.product.findFirst({
      where: { OR: [{ id: slug }, { sku: slug }] },
    })
  } catch (err) {
    console.error('[care/produit] load failed:', err)
  }

  if (!product) return notFound()

  const isPartnerOnly = product.regulated || !product.active
  const isOutOfStock = product.stockQty <= 0 && !isPartnerOnly

  return (
    <>
      <section className="relative overflow-hidden py-12 sm:py-16">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-secondary/40 via-background to-background" />
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <Link
            href="/care/catalogue"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t('productBackCatalogue')}
          </Link>

          <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-2">
            {/* Image */}
            <div className="overflow-hidden rounded-2xl border border-white/40 bg-white/50 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.03]">
              <div className="aspect-square w-full bg-gradient-to-br from-secondary/40 to-background">
                {product.imageUrl && (
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
            </div>

            {/* Info */}
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-block h-2 w-2 rounded-full ${
                    product.category === 'green'
                      ? 'bg-emerald-500'
                      : product.category === 'orange'
                        ? 'bg-amber-500'
                        : 'bg-red-500'
                  }`}
                />
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {product.sku}
                </span>
              </div>
              <h1 className="mt-3 font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
                {product.name}
              </h1>
              {product.brand && (
                <p className="mt-2 text-sm font-semibold text-gold">
                  {product.brand}
                </p>
              )}
              {product.description && (
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
                  {product.description}
                </p>
              )}

              <div className="mt-6 flex items-baseline gap-1.5">
                <span className="font-display text-4xl font-bold text-gold">
                  {product.price.toFixed(2)} €
                </span>
                <span className="text-sm text-muted-foreground">
                  / {product.unit}
                </span>
              </div>

              <div className="mt-3 flex items-center gap-2 text-sm">
                {isPartnerOnly ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
                    <AlertTriangle className="h-3 w-3" />
                    {t('productPartnerOnly')}
                  </span>
                ) : isOutOfStock ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/40 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-700 dark:text-red-300">
                    <X className="h-3 w-3" />
                    {t('productOutOfStock')}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="h-3 w-3" />
                    {t('productInStock')}
                  </span>
                )}
              </div>

              <div className="mt-6">
                <ProductDetailActions
                  productId={product.id}
                  partnerOnly={isPartnerOnly}
                  outOfStock={isOutOfStock}
                  labels={{
                    addToCart: t('productAddToCart'),
                    partnerOnly: t('productPartnerOnly'),
                    outOfStock: t('productOutOfStock'),
                    partners: t('productFindPartner'),
                  }}
                />
              </div>

              {/* Safety block */}
              {(product.regulated ||
                product.hazardLevel ||
                product.warnings ||
                product.sdsUrl) && (
                <div className="mt-8 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <h3 className="font-display text-sm font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                      {t('productSafetyTitle')}
                    </h3>
                  </div>
                  <ul className="mt-3 space-y-2 text-xs text-foreground/80">
                    {product.hazardLevel && (
                      <li className="flex items-start gap-2">
                        <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-amber-600" />
                        <span>
                          {t('productHazardLevel')}:{' '}
                          <span className="font-semibold uppercase">
                            {product.hazardLevel}
                          </span>
                        </span>
                      </li>
                    )}
                    {product.regulated && (
                      <li className="flex items-start gap-2">
                        <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-amber-600" />
                        <span>{t('productRegulatedNotice')}</span>
                      </li>
                    )}
                    {product.warnings && (
                      <li className="flex items-start gap-2">
                        <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-amber-600" />
                        <span>{product.warnings}</span>
                      </li>
                    )}
                    {product.sdsUrl && (
                      <li className="flex items-start gap-2">
                        <FileText className="mt-0.5 h-3 w-3 shrink-0 text-amber-600" />
                        <a
                          href={product.sdsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-amber-700 underline-offset-4 hover:underline dark:text-amber-300"
                        >
                          {t('productSdsLink')}
                        </a>
                      </li>
                    )}
                  </ul>
                </div>
              )}

              {/* Instructions block */}
              {product.instructions && (
                <div className="mt-5 rounded-2xl border border-white/40 bg-white/50 p-5 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.03]">
                  <h3 className="font-display text-sm font-bold uppercase tracking-wider text-foreground">
                    {t('productInstructionsTitle')}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    {product.instructions}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
