/**
 * AQWELIA Pro — Shared plan detail renderer.
 *
 * Renders a Pro plan detail page (Solo, Team, Fleet) from a given i18n
 * namespace. Used by /pro/solo, /pro/team, /pro/fleet to avoid duplication.
 *
 * Layout:
 *  - Hero: badge + plan name + price + tagline + 2 CTAs (Trial / Demo)
 *  - Ideal-for section
 *  - Features grid (8 items)
 *  - Plan limits section
 *  - FAQ (4 questions)
 *  - Upgrade hint (links to next plan or pricing)
 *  - Final CTA
 */
import Link from 'next/link'
import { ArrowRight, Check, X, Sparkles, AlertCircle } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

interface PlanDetailContentProps {
  /** i18n namespace for the plan-specific keys (proSolo, proTeam, proFleet). */
  planNamespace: string
  /** Optional upgrade target href (e.g. "/pro/team" for the Solo page). */
  upgradeHref?: string
}

export async function PlanDetailContent({
  planNamespace,
  upgradeHref,
}: PlanDetailContentProps) {
  const t = await getTranslations(planNamespace)
  const tCommon = await getTranslations('planDetail')

  const FEATURES = [
    t('feature1'),
    t('feature2'),
    t('feature3'),
    t('feature4'),
    t('feature5'),
    t('feature6'),
    t('feature7'),
    t('feature8'),
  ]

  const LIMITS = [t('limitExtraPools')]
  if (planNamespace === 'proSolo') {
    LIMITS.push(t('limitNoMultiTech'))
    LIMITS.push(t('limitNoApi'))
    LIMITS.push(t('limitNoSso'))
  } else if (planNamespace === 'proTeam') {
    LIMITS.push(t('limitExtraUsers'))
    LIMITS.push(t('limitNoApi'))
    LIMITS.push(t('limitNoSso'))
  } else if (planNamespace === 'proFleet') {
    LIMITS.push(t('limitExtraUsers'))
    LIMITS.push(t('limitSsoSoon'))
  }

  const FAQS = [
    { q: t('faq1Q'), a: t('faq1A') },
    { q: t('faq2Q'), a: t('faq2A') },
    { q: t('faq3Q'), a: t('faq3A') },
    { q: t('faq4Q'), a: t('faq4A') },
  ]

  return (
    <>
      {/* ===== Hero ===== */}
      <section className="relative overflow-hidden py-20 sm:py-28">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-secondary/40 via-background to-background" />
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <span className="section-label inline-block">{tCommon('badgeLabel')}</span>
          <h1 className="mt-4 font-display text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl md:text-[3.5rem]">
            {t('planName')}
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t('planTagline')}
          </p>

          <div className="mt-8 inline-flex items-baseline gap-2 rounded-2xl border border-gold/30 bg-white/40 px-6 py-4 backdrop-blur-xl dark:bg-white/[0.04]">
            <span className="font-display text-5xl font-bold text-foreground sm:text-6xl">
              {t('planPrice')}
            </span>
            <span className="text-xs text-muted-foreground sm:text-sm">
              {tCommon('priceSuffix')}
            </span>
          </div>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/pro/early-access"
              className="glow-gold group inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-gold via-[oklch(0.65_0.11_195)] to-[oklch(0.55_0.10_195)] px-7 py-3.5 text-sm font-bold text-[oklch(0.99_0.01_195)] shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] hover:shadow-2xl sm:w-auto"
            >
              <Sparkles className="h-4 w-4" />
              {tCommon('ctaPrimary')}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/pro/demo"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-gold/40 bg-background/80 px-7 py-3.5 text-sm font-bold text-foreground transition-colors hover:border-gold hover:text-gold sm:w-auto"
            >
              {tCommon('ctaDemo')}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="mt-6">
            <Link
              href="/pro/tarifs"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              {tCommon('backToPricing')}
            </Link>
          </div>
        </div>
      </section>

      {/* ===== Ideal for ===== */}
      <section className="relative py-12 sm:py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="relative overflow-hidden rounded-3xl border border-gold/30 bg-white/40 p-8 backdrop-blur-xl dark:bg-white/[0.04] sm:p-12">
            <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent" />
            <span className="section-label inline-block">{tCommon('idealEyebrow')}</span>
            <p className="mt-3 text-lg leading-relaxed text-foreground sm:text-xl">
              {t('idealText')}
            </p>
          </div>
        </div>
      </section>

      {/* ===== Features grid ===== */}
      <section className="relative py-20 sm:py-28">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-background via-secondary/30 to-background" />
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="text-center">
            <span className="section-label inline-block">{tCommon('featuresEyebrow')}</span>
            <h2 className="mt-3 font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
              {tCommon('featuresTitle')}
            </h2>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {FEATURES.map((feature, idx) => (
              <div
                key={feature}
                className="flex items-start gap-3 rounded-xl border border-white/40 bg-white/50 p-4 backdrop-blur-md dark:border-white/10 dark:bg-white/[0.03]"
              >
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-gold text-white shadow">
                  <Check className="h-3.5 w-3.5" />
                </div>
                <span className="text-sm leading-relaxed text-foreground/90">{feature}</span>
                <span className="ml-auto text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {String(idx + 1).padStart(2, '0')}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Plan limits ===== */}
      <section className="relative py-12 sm:py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="rounded-3xl border border-border/60 bg-background/60 p-6 backdrop-blur-md sm:p-8">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
              <span className="section-label inline-block !mt-0">
                {tCommon('limitsEyebrow')}
              </span>
            </div>
            <ul className="mt-4 space-y-2">
              {LIMITS.map((l) => (
                <li key={l} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
                  <span>{l}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section className="relative py-20 sm:py-28">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="text-center">
            <span className="section-label inline-block">{tCommon('faqsEyebrow')}</span>
          </div>

          <div className="mt-8 space-y-2.5">
            {FAQS.map((item, idx) => (
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

      {/* ===== Upgrade hint (optional) ===== */}
      {upgradeHref && (
        <section className="relative py-12 sm:py-16">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <div className="relative overflow-hidden rounded-3xl border border-gold/40 bg-gradient-to-br from-gold/[0.12] via-white/40 to-white/30 p-8 backdrop-blur-xl dark:from-gold/[0.08] dark:via-white/[0.04] dark:to-white/[0.02] sm:p-12">
              <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent" />
              <h3 className="font-display text-2xl font-bold">{tCommon('upgradeTitle')}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {tCommon('upgradeSubtitle')}
              </p>
              <Link
                href={upgradeHref}
                className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-background/80 px-5 py-2.5 text-xs font-bold text-foreground transition-colors hover:border-gold hover:text-gold"
              >
                {tCommon('ctaSecondary')}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ===== Final CTA ===== */}
      <section className="relative py-20 sm:py-28">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-background via-secondary/40 to-background" />
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <div className="relative overflow-hidden rounded-3xl border border-gold/40 bg-white/40 p-8 backdrop-blur-xl dark:bg-white/[0.04] sm:p-12">
            <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent" />
            <Sparkles className="mx-auto h-6 w-6 text-gold" />
            <h2 className="mt-4 font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
              {tCommon('ctaTitle')}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              {tCommon('ctaSubtitle')}
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/pro/early-access"
                className="glow-gold group inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-gold via-[oklch(0.65_0.11_195)] to-[oklch(0.55_0.10_195)] px-7 py-3.5 text-sm font-bold text-[oklch(0.99_0.01_195)] shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] hover:shadow-2xl sm:w-auto"
              >
                {tCommon('ctaPrimary')}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/pro/tarifs"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-gold/40 bg-background/80 px-7 py-3.5 text-sm font-bold text-foreground transition-colors hover:border-gold hover:text-gold sm:w-auto"
              >
                {tCommon('ctaSecondary')}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
