/**
 * AQWELIA Growth OS — Pricing page.
 *
 * URL: /growth/tarifs
 * Server component. Renders the 3 plans (Growth Starter 59€, Growth Pro 149€,
 * Performance 349€) with features matrix + commission structure + FAQ.
 */
import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Sparkles, Check } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('growth')
  return {
    title: t('pricingMetaTitle'),
    description: t('pricingMetaDescription'),
  }
}

export default async function GrowthTarifsPage() {
  const t = await getTranslations('growth')

  const PLANS = [
    {
      id: 'starter',
      name: t('planStarterName'),
      price: t('planStarterPrice'),
      tagline: t('planStarterTagline'),
      features: t.raw('planStarterFeatures') as string[],
      commission: t('planStarterCommission'),
      highlighted: false,
      cta: t('planStarterCta'),
    },
    {
      id: 'pro',
      name: t('planProName'),
      price: t('planProPrice'),
      tagline: t('planProTagline'),
      features: t.raw('planProFeatures') as string[],
      commission: t('planProCommission'),
      highlighted: true,
      cta: t('planProCta'),
    },
    {
      id: 'performance',
      name: t('planPerformanceName'),
      price: t('planPerformancePrice'),
      tagline: t('planPerformanceTagline'),
      features: t.raw('planPerformanceFeatures') as string[],
      commission: t('planPerformanceCommission'),
      highlighted: false,
      cta: t('planPerformanceCta'),
    },
  ]

  const FAQ = [
    { q: t('pricingFaqQ1'), a: t('pricingFaqA1') },
    { q: t('pricingFaqQ2'), a: t('pricingFaqA2') },
    { q: t('pricingFaqQ3'), a: t('pricingFaqA3') },
    { q: t('pricingFaqQ4'), a: t('pricingFaqA4') },
    { q: t('pricingFaqQ5'), a: t('pricingFaqA5') },
  ]

  return (
    <>
      <section className="relative overflow-hidden py-16 sm:py-20">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-secondary/40 via-background to-background" />
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <span className="section-label inline-block">{t('pricingEyebrow')}</span>
          <h1 className="mt-3 font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            {t('pricingTitle')}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t('pricingSubtitle')}
          </p>
        </div>
      </section>

      {/* Plans */}
      <section className="relative py-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            {PLANS.map((plan) => {
              const isHighlighted = plan.highlighted
              return (
                <div
                  key={plan.id}
                  className={`relative flex h-full flex-col overflow-hidden rounded-2xl backdrop-blur-xl transition-all duration-300 ${
                    isHighlighted
                      ? 'border-2 border-gold/60 bg-gradient-to-br from-gold/[0.12] via-white/60 to-white/40 shadow-[0_25px_60px_-20px_oklch(0.65_0.11_195/0.5)] lg:-translate-y-3 lg:scale-[1.03] dark:via-white/[0.04] dark:to-white/[0.02]'
                      : 'border border-white/40 bg-white/60 hover:-translate-y-1 hover:shadow-xl dark:border-white/10 dark:bg-white/[0.03]'
                  }`}
                >
                  {isHighlighted && (
                    <>
                      <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent" />
                      <span className="absolute -right-12 top-5 rotate-45 bg-gradient-to-r from-gold to-[oklch(0.55_0.10_195)] px-12 py-1 text-center text-[10px] font-bold uppercase tracking-widest text-[oklch(0.99_0.01_195)] shadow-md">
                        {t('pricingPopular')}
                      </span>
                    </>
                  )}
                  <div className="flex flex-1 flex-col p-6">
                    <h3 className="font-display text-xl font-bold">{plan.name}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">{plan.tagline}</p>
                    <div className="mt-5 flex items-baseline gap-1">
                      <span className="font-display text-3xl font-bold">{plan.price}</span>
                      <span className="text-xs text-muted-foreground">{t('pricingPerMonth')}</span>
                    </div>
                    <p className="mt-2 text-xs font-medium text-gold">{plan.commission}</p>

                    <Link
                      href="/growth/app"
                      className={`mt-5 flex w-full items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold transition-all ${
                        isHighlighted
                          ? 'bg-gradient-to-r from-gold via-[oklch(0.65_0.11_195)] to-[oklch(0.55_0.10_195)] text-[oklch(0.99_0.01_195)] shadow-lg shadow-gold/30 hover:scale-[1.02]'
                          : 'border border-primary/30 bg-primary/5 text-foreground hover:border-primary/60 hover:bg-primary/10'
                      }`}
                    >
                      {plan.cta}
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
        </div>
      </section>

      {/* FAQ */}
      <section className="relative py-12">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="font-display text-2xl font-bold text-center">
            {t('pricingFaqTitle')}
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

      {/* CTA */}
      <section className="py-16">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <Link
            href="/growth/app"
            className="glow-gold group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-gold via-[oklch(0.65_0.11_195)] to-[oklch(0.55_0.10_195)] px-7 py-3.5 text-sm font-bold text-[oklch(0.99_0.01_195)] shadow-xl shadow-primary/20 transition-all hover:scale-[1.02]"
          >
            <Sparkles className="h-4 w-4" />
            {t('ctaOpenDashboard')}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </section>
    </>
  )
}
