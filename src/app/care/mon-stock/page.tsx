/**
 * AQWELIA Care — User inventory page ("Mon stock").
 *
 * URL: /care/mon-stock
 * Server component. Lists the user's ProductInventory items + suggests
 * re-order links to matching Care products (matched by name fuzzy lookup).
 *
 * Unauthenticated users see a sign-in prompt.
 */
import type { Metadata } from 'next'
import Link from 'next/link'
import { Sparkles, Boxes, Plus } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('care')
  return {
    title: t('stockTitle'),
    description: t('stockSubtitle'),
  }
}

export default async function MonStockPage() {
  const t = await getTranslations('care')
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return (
      <section className="relative overflow-hidden py-16 sm:py-20">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-secondary/40 via-background to-background" />
        <div className="mx-auto max-w-md px-4 text-center sm:px-6">
          <Boxes className="mx-auto h-12 w-12 text-gold/60" />
          <h1 className="mt-4 font-display text-2xl font-bold tracking-tight sm:text-3xl">
            {t('stockTitle')}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {t('cartSigninRequired')}
          </p>
          <Link
            href="/auth/signin?callbackUrl=/care/mon-stock"
            className="glow-gold group mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-gold via-[oklch(0.65_0.11_195)] to-[oklch(0.55_0.10_195)] px-6 py-3 text-sm font-bold text-[oklch(0.99_0.01_195)] shadow-md transition-all hover:scale-[1.02]"
          >
            <Sparkles className="h-4 w-4" />
            {t('cartSigninCta')}
          </Link>
        </div>
      </section>
    )
  }

  let inventory: Array<{
    id: string
    productName: string
    category: string
    quantity: number
    unit: string
    price: number | null
  }> = []
  try {
    inventory = await db.productInventory.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
    })
  } catch (err) {
    console.error('[care/mon-stock] load failed:', err)
  }

  return (
    <>
      <section className="relative overflow-hidden py-12 sm:py-16">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-secondary/40 via-background to-background" />
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h1 className="font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
                {t('stockTitle')}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">{t('stockSubtitle')}</p>
            </div>
            <Link
              href="/care/catalogue"
              className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-background/80 px-4 py-2 text-xs font-bold text-foreground transition-colors hover:border-gold hover:text-gold"
            >
              <Plus className="h-3.5 w-3.5" />
              {t('stockAddFromCatalogue')}
            </Link>
          </div>

          {inventory.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-white/40 bg-white/50 p-10 text-center backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.03]">
              <Boxes className="mx-auto h-10 w-10 text-gold/40" />
              <p className="mt-4 text-sm text-muted-foreground">{t('stockEmpty')}</p>
              <Link
                href="/care/catalogue"
                className="mt-6 inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-background/80 px-5 py-2.5 text-sm font-bold text-foreground transition-colors hover:border-gold hover:text-gold"
              >
                {t('stockAddFromCatalogue')}
              </Link>
            </div>
          ) : (
            <ul className="mt-8 space-y-2">
              {inventory.map((it) => (
                <li
                  key={it.id}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-white/40 bg-white/50 p-4 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.03]"
                >
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-foreground">
                      {it.productName}
                    </div>
                    <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
                      {it.category}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-display text-base font-bold text-gold">
                      {it.quantity} {it.unit}
                    </div>
                    {it.price !== null && (
                      <div className="text-[11px] text-muted-foreground">
                        {it.price.toFixed(2)} €
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  )
}
