/**
 * AQWELIA Business — Pricing page.
 *
 * URL: /business/tarifs
 * Server component. Hero + 2 plan cards (Business Start 79-99€/mois,
 * Business Multi-Site 199-299€/mois) + comparison table + FAQ preview.
 */
import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Sparkles, Check, Building2, Star } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('business')
  return {
    title: t('tarifsMetaTitle'),
    description: t('tarifsMetaDescription'),
  }
}

export default async function BusinessTarifsPage() {
  const t = await getTranslations('business')

  const PLANS = [
    {
      id: 'start',
      name: t('tarifsStartName'),
      priceLow: t('tarifsStartPriceLow'),
      priceHigh: t('tarifsStartPriceHigh'),
      tagline: t('tarifsStartTagline'),
      features: t.raw('tarifsStartFeatures') as string[],
      highlighted: false,
    },
    {
      id: 'multisite',
      name: t('tarifsMultiName'),
      priceLow: t('tarifsMultiPriceLow'),
      priceHigh: t('tarifsMultiPriceHigh'),
      tagline: t('tarifsMultiTagline'),
      features: t.raw('tarifsMultiFeatures') as string[],
      highlighted: true,
    },
  ]

  const FAQ = [
    { q: t('tarifsFaqQ1'), a: t('tarifsFaqA1') },
    { q: t('tarifsFaqQ2'), a: t('tarifsFaqA2') },
    { q: t('tarifsFaqQ3'), a: t('tarifsFaqA3') },
    { q: t('tarifsFaqQ4'), a: t('tarifsFaqA4') },
  ]

  return (
    <>
      <section className="relative overflow-hidden py-16 sm:py-20">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-secondary/40 via-background to-background" />
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <span className="section-label inline-block">{t('tarifsEyebrow')}</span>
          <h1 className="mt-4 font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl md:text-[3rem]">
            {t('tarifsTitle')}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t('tarifsSubtitle')}
          </p>
        </div>
      </section>

      <section className="relative py-12 sm:py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {PLANS.map((plan) => {
              const isHighlighted = plan.highlighted
              return (
                <div
                  key={plan.id}
                  className={`relative flex h-full flex-col overflow-hidden rounded-2xl backdrop-blur-xl transition-all duration-300 ${
                    isHighlighted
                      ? 'border-2 border-gold/60 bg-gradient-to-br from-gold/[0.12] via-white/60 to-white/40 shadow-[0_25px_60px_-20px_oklch(0.65_0.11_195/0.5)] lg:scale-[1.02] dark:via-white/[0.04] dark:to-white/[0.02]'
                      : 'border border-white/40 bg-white/60 hover:-translate-y-1 hover:shadow-xl dark:border-white/10 dark:bg-white/[0.03]'
                  }`}
                >
                  {isHighlighted && (
                    <>
                      <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent" />
                      <span className="absolute -right-12 top-5 rotate-45 bg-gradient-to-r from-gold to-[oklch(0.55_0.10_195)] px-12 py-1 text-center text-[10px] font-bold uppercase tracking-widest text-[oklch(0.99_0.01_195)] shadow-md">
                        {t('tarifsPopular')}
                      </span>
                    </>
                  )}
                  <div className="flex flex-1 flex-col p-6 sm:p-7">
                    <div className="flex items-center gap-2">
                      {isHighlighted ? (
                        <Building2 className="h-5 w-5 text-gold" />
                      ) : (
                        <Star className="h-5 w-5 text-primary" />
                      )}
                      <h3 className="font-display text-xl font-bold">{plan.name}</h3>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{plan.tagline}</p>

                    <div className="mt-5">
                      <div className="flex items-baseline gap-1">
                        <span className="font-display text-3xl font-bold">
                          {plan.priceLow}
                        </span>
                        <span className="text-sm text-muted-foreground">–</span>
                        <span className="font-display text-3xl font-bold">
                          {plan.priceHigh}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {t('tarifsPerMonthHT')}
                      </p>
                    </div>

                    <Link
                      href="/business#contact"
                      className={`mt-5 flex w-full items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold transition-all ${
                        isHighlighted
                          ? 'bg-gradient-to-r from-gold via-[oklch(0.65_0.11_195)] to-[oklch(0.55_0.10_195)] text-[oklch(0.99_0.01_195)] shadow-lg shadow-gold/30 hover:scale-[1.02]'
                          : 'border border-primary/30 bg-primary/5 text-foreground hover:border-primary/60 hover:bg-primary/10'
                      }`}
                    >
                      {t('ctaQuote')}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>

                    <ul className="mt-5 space-y-2">
                      {plan.features.map((f) => (
                        <li
                          key={f}
                          className="flex items-start gap-2 text-xs text-foreground/85"
                        >
                          <Check
                            className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${
                              isHighlighted ? 'text-gold' : 'text-primary'
                            }`}
                          />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )
            })}
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            {t('tarifsRangeNote')}
          </p>
        </div>
      </section>

      <section className="relative py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="text-center font-display text-2xl font-bold tracking-tight sm:text-3xl">
            {t('tarifsFaqTitle')}
          </h2>
          <div className="mt-8 space-y-2.5">
            {FAQ.map((item, idx) => (
              <details
                key={idx}
                className="group rounded-xl border border-white/40 bg-white/50 px-4 backdrop-blur-xl transition-colors hover:bg-white/70 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.06] open:border-gold/40 open:bg-white/70"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-4 text-sm font-semibold sm:text-base">
                  {item.q}
                  <span className="shrink-0 text-gold transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="pb-4 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="relative py-20 sm:py-24">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-background via-secondary/40 to-background" />
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <div className="relative overflow-hidden rounded-3xl border border-gold/40 bg-white/40 p-8 backdrop-blur-xl dark:bg-white/[0.04] sm:p-10">
            <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent" />
            <Sparkles className="mx-auto h-6 w-6 text-gold" />
            <h2 className="mt-4 font-display text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
              {t('tarifsCtaTitle')}
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
              {t('tarifsCtaSubtitle')}
            </p>
            <Link
              href="/business#contact"
              className="glow-gold group mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-gold via-[oklch(0.65_0.11_195)] to-[oklch(0.55_0.10_195)] px-7 py-3.5 text-sm font-bold text-[oklch(0.99_0.01_195)] shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] hover:shadow-2xl"
            >
              {t('ctaQuote')}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
