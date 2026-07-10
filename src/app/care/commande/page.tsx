/**
 * AQWELIA Care — Checkout page.
 *
 * URL: /care/commande
 * Server component. Renders a shipping form + order summary. POSTs to
 * /api/care/checkout on submit. Unauthenticated users see a sign-in prompt.
 */
import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Sparkles, Lock } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { CheckoutForm } from './checkout-form'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('care')
  return {
    title: t('checkoutTitle'),
    description: t('checkoutSubtitle'),
  }
}

export default async function CheckoutPage() {
  const t = await getTranslations('care')
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return (
      <section className="relative overflow-hidden py-16 sm:py-20">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-secondary/40 via-background to-background" />
        <div className="mx-auto max-w-md px-4 text-center sm:px-6">
          <Lock className="mx-auto h-12 w-12 text-gold/60" />
          <h1 className="mt-4 font-display text-2xl font-bold tracking-tight sm:text-3xl">
            {t('checkoutTitle')}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {t('cartSigninRequired')}
          </p>
          <Link
            href="/auth/signin?callbackUrl=/care/commande"
            className="glow-gold group mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-gold via-[oklch(0.65_0.11_195)] to-[oklch(0.55_0.10_195)] px-6 py-3 text-sm font-bold text-[oklch(0.99_0.01_195)] shadow-md transition-all hover:scale-[1.02]"
          >
            <Sparkles className="h-4 w-4" />
            {t('cartSigninCta')}
          </Link>
        </div>
      </section>
    )
  }

  // Hydrate the cart to display the summary.
  let cart: { items: string } | null = null
  let products: Array<{
    id: string
    sku: string
    name: string
    unit: string
    price: number
    active: boolean
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
    console.error('[care/commande] load failed:', err)
  }

  let lineItems: Array<{
    name: string
    price: number
    quantity: number
    unit: string
  }> = []
  if (cart) {
    try {
      const items: Array<{ productId: string; quantity: number }> = JSON.parse(cart.items)
      if (Array.isArray(items)) {
        const productMap = new Map(products.map((p) => [p.id, p]))
        lineItems = items
          .map((i) => {
            const product = productMap.get(i.productId)
            if (!product || !product.active) return null
            return {
              name: product.name,
              price: product.price,
              quantity: i.quantity,
              unit: product.unit,
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
  const tax = Math.round((subtotal + shipping) * 0.2 * 100) / 100
  const total = Math.round((subtotal + shipping + tax) * 100) / 100

  return (
    <>
      <section className="relative overflow-hidden py-12 sm:py-16">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-secondary/40 via-background to-background" />
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <Link
            href="/care/panier"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t('cartBackCatalogue')}
          </Link>
          <h1 className="mt-4 font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            {t('checkoutTitle')}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{t('checkoutSubtitle')}</p>

          {lineItems.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-white/40 bg-white/50 p-10 text-center backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.03]">
              <p className="text-sm text-muted-foreground">{t('cartEmpty')}</p>
            </div>
          ) : (
            <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <CheckoutForm
                  labels={{
                    address: t('checkoutAddress'),
                    addressPlaceholder: t('checkoutAddressPlaceholder'),
                    city: t('checkoutCity'),
                    zip: t('checkoutZip'),
                    country: t('checkoutCountry'),
                    submit: t('checkoutSubmit'),
                    submitting: t('checkoutSubmitting'),
                    success: t('checkoutSuccess'),
                    error: t('checkoutError'),
                  }}
                />
              </div>
              <div>
                <div className="sticky top-20 rounded-2xl border border-gold/40 bg-white/50 p-6 backdrop-blur-xl dark:bg-white/[0.03]">
                  <h2 className="font-display text-base font-bold uppercase tracking-wider">
                    {t('cartSummary')}
                  </h2>
                  <ul className="mt-4 space-y-2 text-xs text-foreground/80">
                    {lineItems.map((l, idx) => (
                      <li key={idx} className="flex items-start justify-between gap-2">
                        <span>
                          {l.quantity} × {l.name}
                        </span>
                        <span className="font-semibold">
                          {(l.price * l.quantity).toFixed(2)} €
                        </span>
                      </li>
                    ))}
                  </ul>
                  <dl className="mt-4 space-y-2 border-t border-border/40 pt-3 text-sm">
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
                    <div className="flex items-center justify-between">
                      <dt className="text-muted-foreground">{t('checkoutVat')}</dt>
                      <dd className="font-semibold">{tax.toFixed(2)} €</dd>
                    </div>
                    <div className="flex items-center justify-between border-t border-border/40 pt-2">
                      <dt className="font-display text-base font-bold">{t('cartTotal')}</dt>
                      <dd className="font-display text-xl font-bold text-gold">
                        {total.toFixed(2)} €
                      </dd>
                    </div>
                  </dl>
                  <p className="mt-4 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <Lock className="h-3 w-3 text-gold" />
                    {t('checkoutSecure')}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  )
}
