/**
 * AQWELIA Care — Order tracking page.
 *
 * URL: /care/suivi
 * Server component. Lists the user's orders with status badges. Unauthenticated
 * users see a sign-in prompt.
 */
import type { Metadata } from 'next'
import Link from 'next/link'
import { Sparkles, Package } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('care')
  return {
    title: t('suiviTitle'),
    description: t('suiviSubtitle'),
  }
}

const STATUS_COLOR: Record<string, string> = {
  pending: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  paid: 'border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-300',
  shipped: 'border-purple-500/40 bg-purple-500/10 text-purple-700 dark:text-purple-300',
  delivered: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  cancelled: 'border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300',
}

export default async function SuiviPage() {
  const t = await getTranslations('care')
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return (
      <section className="relative overflow-hidden py-16 sm:py-20">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-secondary/40 via-background to-background" />
        <div className="mx-auto max-w-md px-4 text-center sm:px-6">
          <Package className="mx-auto h-12 w-12 text-gold/60" />
          <h1 className="mt-4 font-display text-2xl font-bold tracking-tight sm:text-3xl">
            {t('suiviTitle')}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {t('cartSigninRequired')}
          </p>
          <Link
            href="/auth/signin?callbackUrl=/care/suivi"
            className="glow-gold group mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-gold via-[oklch(0.65_0.11_195)] to-[oklch(0.55_0.10_195)] px-6 py-3 text-sm font-bold text-[oklch(0.99_0.01_195)] shadow-md transition-all hover:scale-[1.02]"
          >
            <Sparkles className="h-4 w-4" />
            {t('cartSigninCta')}
          </Link>
        </div>
      </section>
    )
  }

  let orders: Array<{
    id: string
    items: string
    total: number
    shipping: number
    status: string
    tracking: string | null
    address: string | null
    city: string | null
    zipCode: string | null
    country: string
    createdAt: Date
  }> = []

  try {
    orders = await (db as any).order.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
    })
  } catch (err) {
    console.error('[care/suivi] load failed:', err)
  }

  return (
    <>
      <section className="relative overflow-hidden py-12 sm:py-16">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-secondary/40 via-background to-background" />
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <h1 className="font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            {t('suiviTitle')}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{t('suiviSubtitle')}</p>

          {orders.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-white/40 bg-white/50 p-10 text-center backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.03]">
              <Package className="mx-auto h-10 w-10 text-gold/40" />
              <p className="mt-4 text-sm text-muted-foreground">{t('suiviEmpty')}</p>
              <Link
                href="/care/catalogue"
                className="mt-6 inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-background/80 px-5 py-2.5 text-sm font-bold text-foreground transition-colors hover:border-gold hover:text-gold"
              >
                {t('cartContinueShopping')}
              </Link>
            </div>
          ) : (
            <ul className="mt-8 space-y-4">
              {orders.map((o) => {
                let lineCount = 0
                try {
                  const parsed = JSON.parse(o.items)
                  if (Array.isArray(parsed)) lineCount = parsed.length
                } catch {
                  lineCount = 0
                }
                return (
                  <li
                    key={o.id}
                    className="rounded-2xl border border-white/40 bg-white/50 p-5 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.03]"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
                          {t('suiviOrderNumber')}
                        </div>
                        <div className="font-display text-base font-bold text-foreground">
                          #{o.id.slice(-8).toUpperCase()}
                        </div>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-widest ${
                          STATUS_COLOR[o.status] ?? STATUS_COLOR.pending
                        }`}
                      >
                        {t(`suiviStatus_${o.status}`, { defaultMessage: o.status })}
                      </span>
                    </div>
                    <dl className="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                      <div>
                        <dt className="text-muted-foreground">{t('suiviDate')}</dt>
                        <dd className="font-semibold">
                          {new Date(o.createdAt).toLocaleDateString()}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">{t('suiviItems')}</dt>
                        <dd className="font-semibold">{lineCount}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">{t('cartTotal')}</dt>
                        <dd className="font-display text-sm font-bold text-gold">
                          {o.total.toFixed(2)} €
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">{t('suiviShipping')}</dt>
                        <dd className="font-semibold">
                          {o.tracking ? (
                            <a
                              href={o.tracking}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary underline-offset-4 hover:underline"
                            >
                              {t('suiviTrackingLink')}
                            </a>
                          ) : (
                            '—'
                          )}
                        </dd>
                      </div>
                    </dl>
                    {(o.address || o.city || o.zipCode) && (
                      <div className="mt-4 border-t border-border/40 pt-3 text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground">
                          {t('suiviShipTo')}:{' '}
                        </span>
                        {[o.address, o.zipCode, o.city, o.country]
                          .filter(Boolean)
                          .join(', ')}
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </section>
    </>
  )
}
