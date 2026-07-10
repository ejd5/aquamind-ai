/**
 * AQWELIA Care — Kit list page.
 *
 * URL: /care/kits
 * Server component. Renders all active kits with their price + item count.
 */
import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Sparkles, Package } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { db } from '@/lib/db'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('care')
  return {
    title: t('kitsTitle'),
    description: t('kitsSubtitle'),
  }
}

export default async function CareKitsPage() {
  const t = await getTranslations('care')

  let kits: Array<{
    id: string
    slug: string
    name: string
    nameKey: string
    description: string | null
    descriptionKey: string | null
    price: number
    currency: string
    imageUrl: string | null
    items: string
    active: boolean
  }> = []
  try {
    kits = await (db as any).kit.findMany({
      where: { active: true },
      orderBy: [{ price: 'asc' }, { slug: 'asc' }],
    })
  } catch (err) {
    console.error('[care/kits] load failed:', err)
  }

  return (
    <>
      <section className="relative overflow-hidden py-16 sm:py-20">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-secondary/40 via-background to-background" />
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <span className="section-label inline-block">{t('kitsEyebrow')}</span>
          <h1 className="mt-4 font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl md:text-[3rem]">
            {t('kitsTitle')}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t('kitsSubtitle')}
          </p>
        </div>
      </section>

      <section className="relative py-8 sm:py-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          {kits.length === 0 ? (
            <div className="rounded-2xl border border-white/40 bg-white/50 p-10 text-center backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.03]">
              <p className="text-sm text-muted-foreground">{t('kitsEmpty')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {kits.map((k) => {
                let itemCount = 0
                try {
                  const parsed = JSON.parse(k.items)
                  if (Array.isArray(parsed)) itemCount = parsed.length
                } catch {
                  itemCount = 0
                }
                return (
                  <Link
                    key={k.id}
                    href={`/care/kits/${k.slug}`}
                    className="group relative overflow-hidden rounded-2xl bg-white/10 backdrop-blur-md border border-white/40 shadow-[0_18px_40px_-22px_oklch(0.45_0.12_195/0.25)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_28px_55px_-22px_oklch(0.45_0.12_195/0.4)] dark:bg-white/[0.06] dark:border-white/15"
                  >
                    <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                    <div className="aspect-[4/3] w-full bg-gradient-to-br from-secondary/40 to-background">
                      {k.imageUrl ? (
                        <img
                          src={k.imageUrl}
                          alt={k.name}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Package className="h-12 w-12 text-gold/40" />
                        </div>
                      )}
                    </div>
                    <div className="p-5">
                      <h3 className="font-display text-base font-bold text-foreground group-hover:text-gold">
                        {k.name}
                      </h3>
                      {k.description && (
                        <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                          {k.description}
                        </p>
                      )}
                      <div className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <Package className="h-3 w-3" />
                        <span>
                          {t('kitsItemCount', { count: itemCount })}
                        </span>
                      </div>
                      <div className="mt-3 flex items-baseline gap-1">
                        <span className="font-display text-lg font-bold text-gold">
                          {k.price.toFixed(2)} €
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {t('kitsPerKit')}
                        </span>
                      </div>
                    </div>
                  </Link>
                )
              })}
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
              {t('kitsBackCatalogue')}
            </Link>
            <Link
              href="/care/panier"
              className="glow-gold group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-gold via-[oklch(0.65_0.11_195)] to-[oklch(0.55_0.10_195)] px-5 py-2.5 text-sm font-bold text-[oklch(0.99_0.01_195)] shadow-md transition-all hover:scale-[1.02]"
            >
              <Sparkles className="h-4 w-4" />
              {t('kitsViewCart')}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
