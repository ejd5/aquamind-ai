/**
 * AQWELIA Pro — Main marketing page.
 *
 * URL: /pro
 * Server component (SEO-friendly). Renders:
 *  - Hero: badge Early Access + title + subtitle + 2 CTAs (Early Access / Demo)
 *  - 4 features cards (glassmorphism): CRM Clients / Planning / Rapports / Care
 *  - Pricing: Solo / Team / Fleet / Enterprise
 *  - FAQ preview (top 5 questions)
 *  - Final CTA
 *
 * Same DA as the landing page (glassmorphism, gold accents, font-display).
 */
import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Sparkles, Check, Users, Calendar, FileText, ShoppingBag } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('pro')
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
  }
}

export default async function ProPage() {
  const t = await getTranslations('pro')

  const FEATURES = [
    {
      icon: Users,
      emoji: '📋',
      title: t('feature1Title'),
      text: t('feature1Text'),
    },
    {
      icon: Calendar,
      emoji: '📅',
      title: t('feature2Title'),
      text: t('feature2Text'),
    },
    {
      icon: FileText,
      emoji: '📊',
      title: t('feature3Title'),
      text: t('feature3Text'),
    },
    {
      icon: ShoppingBag,
      emoji: '🛒',
      title: t('feature4Title'),
      text: t('feature4Text'),
    },
  ]

  const PLANS = [
    {
      id: 'solo',
      name: t('soloName'),
      price: t('soloPrice'),
      tagline: t('soloTagline'),
      features: t.raw('soloFeatures') as string[],
      highlighted: false,
    },
    {
      id: 'team',
      name: t('teamName'),
      price: t('teamPrice'),
      tagline: t('teamTagline'),
      features: t.raw('teamFeatures') as string[],
      highlighted: true,
    },
    {
      id: 'fleet',
      name: t('fleetName'),
      price: t('fleetPrice'),
      tagline: t('fleetTagline'),
      features: t.raw('fleetFeatures') as string[],
      highlighted: false,
    },
    {
      id: 'enterprise',
      name: t('enterpriseName'),
      price: t('enterprisePrice'),
      tagline: t('enterpriseTagline'),
      features: t.raw('enterpriseFeatures') as string[],
      highlighted: false,
      custom: true,
    },
  ]

  const FAQ_PREVIEW = [
    { q: t('faqQ1'), a: t('faqA1') },
    { q: t('faqQ2'), a: t('faqA2') },
    { q: t('faqQ4'), a: t('faqA4') },
    { q: t('faqQ6'), a: t('faqA6') },
    { q: t('faqQ7'), a: t('faqA7') },
  ]

  return (
    <>
      {/* ===== Hero ===== */}
      <section className="relative overflow-hidden py-20 sm:py-28">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-secondary/40 via-background to-background" />
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <span className="section-label inline-block">{t('badgeEarlyAccess')}</span>
          <h1 className="mt-4 font-display text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl md:text-[3.5rem]">
            {t('pageTitle')}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t('pageSubtitle')}
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/pro/early-access"
              className="glow-gold group inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-gold via-[oklch(0.65_0.11_195)] to-[oklch(0.55_0.10_195)] px-7 py-3.5 text-sm font-bold text-[oklch(0.99_0.01_195)] shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] hover:shadow-2xl sm:w-auto"
            >
              <Sparkles className="h-4 w-4" />
              {t('ctaEarlyAccess')}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/pro/demo"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-gold/40 bg-background/80 px-7 py-3.5 text-sm font-bold text-foreground transition-colors hover:border-gold hover:text-gold sm:w-auto"
            >
              {t('ctaDemo')}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ===== Features ===== */}
      <section id="fonctions" className="relative py-20 sm:py-28">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-background via-secondary/30 to-background" />
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <span className="section-label inline-block">{t('featuresEyebrow')}</span>
            <h2 className="mt-3 font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl md:text-[2.75rem]">
              {t('featuresTitle')}
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
              {t('featuresSubtitle')}
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((card) => {
              const Icon = card.icon
              return (
                <div
                  key={card.title}
                  className="group relative overflow-hidden rounded-2xl bg-white/10 backdrop-blur-md border border-white/40 shadow-[0_18px_40px_-22px_oklch(0.45_0.12_195/0.25)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_28px_55px_-22px_oklch(0.45_0.12_195/0.4)] dark:bg-white/[0.06] dark:border-white/15"
                >
                  <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <div className="p-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-gold text-white shadow-lg shadow-primary/30">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-4 flex items-center gap-2 font-display text-lg font-bold text-foreground">
                      <span aria-hidden="true">{card.emoji}</span>
                      {card.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {card.text}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ===== Pricing ===== */}
      <section id="tarifs" className="relative py-20 sm:py-28">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-background via-secondary/30 to-background" />
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <span className="section-label inline-block">{t('pricingEyebrow')}</span>
            <h2 className="mt-3 font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl md:text-[2.75rem]">
              {t('pricingTitle')}
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
              {t('pricingSubtitle')}
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {PLANS.map((plan) => {
              const isHighlighted = plan.highlighted
              const isCustom = !!plan.custom
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
                        Popular
                      </span>
                    </>
                  )}

                  <div className="flex flex-1 flex-col p-6">
                    <h3 className="font-display text-xl font-bold">{plan.name}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">{plan.tagline}</p>

                    <div className="mt-5 flex items-baseline gap-1">
                      <span className="font-display text-3xl font-bold">{plan.price}</span>
                      {!isCustom && plan.price !== t('pricingCustom') && (
                        <span className="text-xs text-muted-foreground">{t('pricingPerMonth')}</span>
                      )}
                    </div>

                    <Link
                      href="/pro/early-access"
                      className={`mt-5 flex w-full items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold transition-all ${
                        isHighlighted
                          ? 'bg-gradient-to-r from-gold via-[oklch(0.65_0.11_195)] to-[oklch(0.55_0.10_195)] text-[oklch(0.99_0.01_195)] shadow-lg shadow-gold/30 hover:scale-[1.02] hover:shadow-[0_0_40px_-6px_oklch(0.65_0.11_195/0.6)]'
                          : 'border border-primary/30 bg-primary/5 text-foreground hover:border-primary/60 hover:bg-primary/10'
                      }`}
                    >
                      {isCustom ? t('pricingCtaCustom') : t('pricingCta')}
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

      {/* ===== FAQ preview ===== */}
      <section className="relative py-20 sm:py-28">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="text-center">
            <span className="section-label inline-block">{t('faqEyebrow')}</span>
            <h2 className="mt-3 font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
              {t('faqTitle')}
            </h2>
          </div>

          <div className="mt-10 space-y-2.5">
            {FAQ_PREVIEW.map((item, idx) => (
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

          <div className="mt-8 text-center">
            <Link
              href="/pro/faq"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              {t('navFaq')}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ===== Final CTA ===== */}
      <section className="relative py-20 sm:py-28">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-background via-secondary/40 to-background" />
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <div className="relative overflow-hidden rounded-3xl border border-gold/40 bg-white/40 p-8 backdrop-blur-xl dark:bg-white/[0.04] sm:p-12">
            <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent" />
            <Sparkles className="mx-auto h-6 w-6 text-gold" />
            <h2 className="mt-4 font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
              {t('pageTitle')}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              {t('earlyAccessSubtitle')}
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/pro/early-access"
                className="glow-gold group inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-gold via-[oklch(0.65_0.11_195)] to-[oklch(0.55_0.10_195)] px-7 py-3.5 text-sm font-bold text-[oklch(0.99_0.01_195)] shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] hover:shadow-2xl sm:w-auto"
              >
                {t('ctaEarlyAccess')}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/pro/demo"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-gold/40 bg-background/80 px-7 py-3.5 text-sm font-bold text-foreground transition-colors hover:border-gold hover:text-gold sm:w-auto"
              >
                {t('ctaDemo')}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
