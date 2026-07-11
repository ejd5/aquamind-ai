/**
 * AQWELIA Pro — Pricing page (4 plans + Enterprise + Founders offer).
 *
 * URL: /pro/tarifs
 * Server component (SEO-friendly). Renders:
 *  - Hero with 3 bullets + trial mention
 *  - 4 plan cards (Solo / Team / Fleet / Enterprise)
 *  - Founders offer section (−50% lifetime)
 *  - Comparison table (16 rows × 4 columns)
 *  - FAQ (5 questions)
 *  - Final CTA
 *
 * Different from the consumer `tarifs` namespace — this is the Pro B2B
 * pricing page, with the full Pro plan ladder.
 */
import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Sparkles, Check, Star, Building2, Crown } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('proPricing')
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
  }
}

export default async function ProPricingPage() {
  const t = await getTranslations('proPricing')
  const tSolo = await getTranslations('proSolo')
  const tTeam = await getTranslations('proTeam')
  const tFleet = await getTranslations('proFleet')

  const PLANS = [
    {
      id: 'solo',
      href: '/pro/solo',
      name: t('planSoloName'),
      tagline: t('planSoloTagline'),
      price: tSolo('planPrice'),
      cta: t('planSoloCta'),
      highlighted: false,
    },
    {
      id: 'team',
      href: '/pro/team',
      name: t('planTeamName'),
      tagline: t('planTeamTagline'),
      price: tTeam('planPrice'),
      cta: t('planTeamCta'),
      badge: t('planTeamBadge'),
      highlighted: true,
    },
    {
      id: 'fleet',
      href: '/pro/fleet',
      name: t('planFleetName'),
      tagline: t('planFleetTagline'),
      price: tFleet('planPrice'),
      cta: t('planFleetCta'),
      highlighted: false,
    },
    {
      id: 'enterprise',
      href: '/pro/early-access',
      name: t('planEnterpriseName'),
      tagline: t('planEnterpriseTagline'),
      price: t('planEnterprisePrice'),
      cta: t('planEnterpriseCta'),
      highlighted: false,
      custom: true,
    },
  ]

  const HERO_BULLETS = [t('heroBullet1'), t('heroBullet2'), t('heroBullet3')]

  const FOUNDERS_BULLETS = [
    t('foundersB1'),
    t('foundersB2'),
    t('foundersB3'),
    t('foundersB4'),
  ]

  const COMPARE_ROWS: Array<{
    label: string
    solo?: string
    team?: string
    fleet?: string
    enterprise?: string
  }> = [
    { label: t('compareRow1'), solo: '1', team: '5', fleet: '15', enterprise: '∞' },
    { label: t('compareRow2'), solo: '75', team: '300', fleet: '1000', enterprise: '∞' },
    { label: t('compareRow3'), solo: '✓', team: '✓', fleet: '✓', enterprise: '✓' },
    { label: t('compareRow4'), solo: '✓', team: '✓', fleet: '✓', enterprise: '✓' },
    { label: t('compareRow5'), solo: '—', team: '✓', fleet: '✓', enterprise: '✓' },
    { label: t('compareRow6'), solo: '✓', team: '✓', fleet: '✓', enterprise: '✓' },
    { label: t('compareRow7'), solo: '✓', team: '✓', fleet: '✓', enterprise: '✓' },
    { label: t('compareRow8'), solo: '5/m', team: '∞', fleet: '∞', enterprise: '∞' },
    { label: t('compareRow9'), solo: '—', team: '✓', fleet: '✓', enterprise: '✓' },
    { label: t('compareRow10'), solo: '—', team: '✓', fleet: '✓', enterprise: '✓' },
    { label: t('compareRow11'), solo: '—', team: '—', fleet: '✓', enterprise: '✓' },
    { label: t('compareRow12'), solo: '—', team: '—', fleet: '✓', enterprise: '✓' },
    { label: t('compareRow13'), solo: '—', team: '—', fleet: t('limitSsoSoon'), enterprise: '✓' },
    {
      label: t('compareRow14'),
      solo: t('compareRow14Solo'),
      team: t('compareRow14Team'),
      fleet: t('compareRow14Fleet'),
      enterprise: t('compareRow14Enterprise'),
    },
    { label: t('compareRow15'), solo: '—', team: '—', fleet: '✓', enterprise: '✓' },
    { label: t('compareRow16'), solo: '—', team: '—', fleet: 'option', enterprise: '✓' },
  ]

  const FAQS = [
    { q: t('faq1Q'), a: t('faq1A') },
    { q: t('faq2Q'), a: t('faq2A') },
    { q: t('faq3Q'), a: t('faq3A') },
    { q: t('faq4Q'), a: t('faq4A') },
    { q: t('faq5Q'), a: t('faq5A') },
  ]

  return (
    <>
      {/* ===== Hero ===== */}
      <section className="relative overflow-hidden py-20 sm:py-28">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-secondary/40 via-background to-background" />
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <span className="section-label inline-block">{t('heroEyebrow')}</span>
          <h1 className="mt-4 font-display text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl md:text-[3.5rem]">
            {t('heroTitle')}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t('heroSubtitle')}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {HERO_BULLETS.map((b) => (
              <span
                key={b}
                className="inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-white/50 px-3 py-1.5 text-xs font-medium text-foreground backdrop-blur-md dark:bg-white/[0.04]"
              >
                <Check className="h-3 w-3 text-gold" />
                {b}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Plans grid ===== */}
      <section className="relative py-12 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center">
            <span className="section-label inline-block">{t('plansEyebrow')}</span>
            <h2 className="mt-3 font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl md:text-[2.75rem]">
              {t('plansTitle')}
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              {t('plansSubtitle')}
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
                        {plan.badge}
                      </span>
                    </>
                  )}

                  <div className="flex flex-1 flex-col p-6">
                    <h3 className="font-display text-xl font-bold">{plan.name}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">{plan.tagline}</p>

                    <div className="mt-5 flex items-baseline gap-1">
                      <span className="font-display text-3xl font-bold">{plan.price}</span>
                      {!isCustom && (
                        <span className="text-xs text-muted-foreground">/ mo</span>
                      )}
                    </div>

                    <Link
                      href={plan.href}
                      className={`mt-5 flex w-full items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold transition-all ${
                        isHighlighted
                          ? 'bg-gradient-to-r from-gold via-[oklch(0.65_0.11_195)] to-[oklch(0.55_0.10_195)] text-[oklch(0.99_0.01_195)] shadow-lg shadow-gold/30 hover:scale-[1.02]'
                          : 'border border-primary/30 bg-primary/5 text-foreground hover:border-primary/60 hover:bg-primary/10'
                      }`}
                    >
                      {plan.cta}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ===== Founders offer ===== */}
      <section className="relative py-20 sm:py-28">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="relative overflow-hidden rounded-3xl border border-gold/40 bg-gradient-to-br from-gold/[0.18] via-white/40 to-white/30 p-8 backdrop-blur-xl dark:from-gold/[0.12] dark:via-white/[0.04] dark:to-white/[0.02] sm:p-12">
            <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent" />
            <div className="text-center">
              <span className="section-label inline-block">{t('foundersEyebrow')}</span>
              <h2 className="mt-3 flex items-center justify-center gap-2 font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
                <Crown className="h-7 w-7 text-gold" />
                {t('foundersTitle')}
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                {t('foundersSubtitle')}
              </p>
              <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {FOUNDERS_BULLETS.map((b) => (
                  <div
                    key={b}
                    className="flex items-start gap-2 rounded-xl border border-gold/20 bg-white/40 p-3 text-left backdrop-blur-md dark:bg-white/[0.04]"
                  >
                    <Star className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" />
                    <span className="text-xs font-medium text-foreground/90">{b}</span>
                  </div>
                ))}
              </div>
              <Link
                href="/pro/early-access"
                className="glow-gold mt-8 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-gold via-[oklch(0.65_0.11_195)] to-[oklch(0.55_0.10_195)] px-7 py-3.5 text-sm font-bold text-[oklch(0.99_0.01_195)] shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] hover:shadow-2xl"
              >
                <Crown className="h-4 w-4" />
                {t('foundersCta')}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Comparison table ===== */}
      <section className="relative py-20 sm:py-28">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-background via-secondary/30 to-background" />
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="text-center">
            <span className="section-label inline-block">{t('compareEyebrow')}</span>
            <h2 className="mt-3 font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
              {t('compareTitle')}
            </h2>
          </div>

          <div className="mt-10 overflow-x-auto">
            <table className="w-full min-w-[640px] overflow-hidden rounded-2xl border border-white/40 bg-white/40 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.03]">
              <thead>
                <tr className="border-b border-gold/20 bg-white/50 dark:bg-white/[0.04]">
                  <th className="p-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t('compareColFeature')}
                  </th>
                  <th className="p-4 text-center text-xs font-semibold uppercase tracking-wider text-foreground">
                    {t('planSoloName')}
                  </th>
                  <th className="p-4 text-center text-xs font-semibold uppercase tracking-wider text-gold">
                    {t('planTeamName')}
                  </th>
                  <th className="p-4 text-center text-xs font-semibold uppercase tracking-wider text-foreground">
                    {t('planFleetName')}
                  </th>
                  <th className="p-4 text-center text-xs font-semibold uppercase tracking-wider text-foreground">
                    {t('planEnterpriseName')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARE_ROWS.map((row, idx) => (
                  <tr
                    key={idx}
                    className={`border-b border-border/40 ${
                      idx % 2 === 0 ? 'bg-white/30 dark:bg-white/[0.02]' : ''
                    }`}
                  >
                    <td className="p-3 text-sm text-foreground/90">{row.label}</td>
                    <td className="p-3 text-center text-sm text-muted-foreground">{row.solo}</td>
                    <td className="p-3 text-center text-sm font-semibold text-foreground">
                      {row.team}
                    </td>
                    <td className="p-3 text-center text-sm text-muted-foreground">{row.fleet}</td>
                    <td className="p-3 text-center text-sm text-muted-foreground">
                      {row.enterprise}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section className="relative py-20 sm:py-28">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="text-center">
            <span className="section-label inline-block">{t('faqEyebrow')}</span>
            <h2 className="mt-3 font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
              {t('faqTitle')}
            </h2>
          </div>

          <div className="mt-10 space-y-2.5">
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

      {/* ===== Final CTA ===== */}
      <section className="relative py-20 sm:py-28">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-background via-secondary/40 to-background" />
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <div className="relative overflow-hidden rounded-3xl border border-gold/40 bg-white/40 p-8 backdrop-blur-xl dark:bg-white/[0.04] sm:p-12">
            <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent" />
            <Building2 className="mx-auto h-6 w-6 text-gold" />
            <h2 className="mt-4 font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
              {t('ctaTitle')}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              {t('ctaSubtitle')}
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/pro/demo"
                className="glow-gold group inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-gold via-[oklch(0.65_0.11_195)] to-[oklch(0.55_0.10_195)] px-7 py-3.5 text-sm font-bold text-[oklch(0.99_0.01_195)] shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] hover:shadow-2xl sm:w-auto"
              >
                <Sparkles className="h-4 w-4" />
                {t('ctaPrimary')}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/pro/early-access"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-gold/40 bg-background/80 px-7 py-3.5 text-sm font-bold text-foreground transition-colors hover:border-gold hover:text-gold sm:w-auto"
              >
                {t('ctaSecondary')}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
