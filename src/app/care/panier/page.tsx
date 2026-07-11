/**
 * AQWELIA Care — Cart page.
 *
 * URL: /care/panier
 * Server component. Reads the user's cart (if authenticated) and renders the
 * line items with qty controls + total + "Proceed to checkout" CTA.
 *
 * Unauthenticated users see a sign-in prompt.
 */
import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, ShoppingCart, Sparkles } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { CartManager } from './cart-manager'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('care')
  return {
    title: t('cartTitle'),
    description: t('cartSubtitle'),
  }
}

export default async function CartPage() {
  const t = await getTranslations('care')
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return (
      <section className="relative overflow-hidden py-16 sm:py-20">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-secondary/40 via-background to-background" />
        <div className="mx-auto max-w-md px-4 text-center sm:px-6">
          <ShoppingCart className="mx-auto h-12 w-12 text-gold/60" />
          <h1 className="mt-4 font-display text-2xl font-bold tracking-tight sm:text-3xl">
            {t('cartTitle')}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {t('cartSigninRequired')}
          </p>
          <Link
            href="/auth/signin?callbackUrl=/care/panier"
            className="glow-gold group mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-gold via-[oklch(0.65_0.11_195)] to-[oklch(0.55_0.10_195)] px-6 py-3 text-sm font-bold text-[oklch(0.99_0.01_195)] shadow-md transition-all hover:scale-[1.02]"
          >
            <Sparkles className="h-4 w-4" />
            {t('cartSigninCta')}
          </Link>
        </div>
      </section>
    )
  }

  // Hydrate the cart + product info.
  let cart: { items: string } | null = null
  let products: Array<{
    id: string
    sku: string
    name: string
    unit: string
    price: number
    imageUrl: string | null
    active: boolean
    stockQty: number
  }> = []

  try {
    cart = await (db as any).cart.findUnique({
      where: { userId: session.user.id },
      select: { items: true },
    })
    if (cart) {
      let items: Array<{ productId: string; quantity: number }> = []
      try {
        const parsed = JSON.parse(cart.items)
        if (Array.isArray(parsed)) items = parsed
      } catch {
        items = []
      }
      const productIds = items.map((i) => i.productId)
      products = await db.product.findMany({
        where: { id: { in: productIds } },
      })
    }
  } catch (err) {
    console.error('[care/panier] load failed:', err)
  }

  let lineItems: Array<{
    productId: string
    sku: string
    name: string
    unit: string
    price: number
    imageUrl: string | null
    quantity: number
    active: boolean
    stockQty: number
  }> = []
  if (cart) {
    try {
      const items: Array<{ productId: string; quantity: number }> = JSON.parse(cart.items)
      if (Array.isArray(items)) {
        const productMap = new Map(products.map((p) => [p.id, p]))
        lineItems = items
          .map((i) => {
            const product = productMap.get(i.productId)
            if (!product) return null
            return {
              productId: product.id,
              sku: product.sku,
              name: product.name,
              unit: product.unit,
              price: product.price,
              imageUrl: product.imageUrl,
              quantity: i.quantity,
              active: product.active,
              stockQty: product.stockQty,
            }
          })
          .filter(Boolean) as typeof lineItems
      }
    } catch {
      lineItems = []
    }
  }

  const subtotal =
    Math.round(
      lineItems.reduce((sum, l) => sum + l.price * l.quantity, 0) * 100
    ) / 100
  const shipping = subtotal >= 75 || subtotal === 0 ? 0 : 6.9
  const total = Math.round((subtotal + shipping) * 100) / 100

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
            {t('cartBackCatalogue')}
          </Link>
          <h1 className="mt-4 font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            {t('cartTitle')}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{t('cartSubtitle')}</p>

          {lineItems.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-white/40 bg-white/50 p-10 text-center backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.03]">
              <ShoppingCart className="mx-auto h-10 w-10 text-gold/40" />
              <p className="mt-4 text-sm text-muted-foreground">{t('cartEmpty')}</p>
              <Link
                href="/care/catalogue"
                className="mt-6 inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-background/80 px-5 py-2.5 text-sm font-bold text-foreground transition-colors hover:border-gold hover:text-gold"
              >
                {t('cartContinueShopping')}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          ) : (
            <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <CartManager
                  items={lineItems}
                  labels={{
                    qty: t('cartQty'),
                    remove: t('cartRemove'),
                    outOfStock: t('cartOutOfStockItem'),
                    perUnit: t('cataloguePerUnit'),
                    subtotal: t('cartSubtotal'),
                  }}
                />
              </div>
              <div>
                <div className="sticky top-20 rounded-2xl border border-gold/40 bg-white/50 p-6 backdrop-blur-xl dark:bg-white/[0.03]">
                  <h2 className="font-display text-base font-bold uppercase tracking-wider">
                    {t('cartSummary')}
                  </h2>
                  <dl className="mt-4 space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <dt className="text-muted-foreground">{t('cartSubtotal')}</dt>
                      <dd className="font-semibold">{subtotal.toFixed(2)} €</dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="text-muted-foreground">{t('cartShipping')}</dt>
                      <dd className="font-semibold">
                        {shipping === 0 ? t('cartFreeShipping') : `${shipping.toFixed(2)} €`}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between border-t border-border/40 pt-2">
                      <dt className="font-display text-base font-bold">{t('cartTotal')}</dt>
                      <dd className="font-display text-xl font-bold text-gold">
                        {total.toFixed(2)} €
                      </dd>
                    </div>
                  </dl>
                  <Link
                    href="/care/commande"
                    className="glow-gold group mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-gold via-[oklch(0.65_0.11_195)] to-[oklch(0.55_0.10_195)] px-6 py-3.5 text-sm font-bold text-[oklch(0.99_0.01_195)] shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] hover:shadow-2xl"
                  >
                    {t('cartCheckout')}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                  {shipping > 0 && (
                    <p className="mt-3 text-center text-[11px] text-muted-foreground">
                      {t('cartFreeShippingHint')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  )
}
