/**
 * AQWELIA Care — Product recommendation methodology page.
 *
 * URL: /care/recommandations
 * Server component (SEO-friendly). Renders:
 *  - Hero: eyebrow + title + subtitle + 2 CTAs
 *  - 4-step process (Collect data → Profile pool → Score products → Recommend)
 *  - 6 scoring criteria grid (compatibility, dosage, brand, budget, availability, reviews)
 *  - Transparency section (no commission, no paid ranking)
 *  - Final CTA
 *
 * Explains how the AQWELIA recommendation engine works and why it's
 * conflict-free. Reuses the Care glassmorphism design system.
 */
import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowRight,
  Sparkles,
  Database,
  Layers,
  Gauge,
  Target,
  ShieldCheck,
  Shield,
  PackageCheck,
  Tag,
  MapPin,
  Star,
  CircleCheck,
} from 'lucide-react'
import { getTranslations } from 'next-intl/server'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('careRecos')
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
  }
}

export default async function CareRecommendationsPage() {
  const t = await getTranslations('careRecos')

  const STEPS = [
    {
      icon: Database,
      n: '01',
      title: t('step1Title'),
      text: t('step1Text'),
    },
    {
      icon: Layers,
      n: '02',
      title: t('step2Title'),
      text: t('step2Text'),
    },
    {
      icon: Gauge,
      n: '03',
      title: t('step3Title'),
      text: t('step3Text'),
    },
    {
      icon: Target,
      n: '04',
      title: t('step4Title'),
      text: t('step4Text'),
    },
  ]

  const CRITERIA = [
    { icon: Shield, title: t('crit1Title'), text: t('crit1Text') },
    { icon: Gauge, title: t('crit2Title'), text: t('crit2Text') },
    { icon: PackageCheck, title: t('crit3Title'), text: t('crit3Text') },
    { icon: Tag, title: t('crit4Title'), text: t('crit4Text') },
    { icon: MapPin, title: t('crit5Title'), text: t('crit5Text') },
    { icon: Star, title: t('crit6Title'), text: t('crit6Text') },
  ]

  const TRANSPARENCY_BULLETS = [
    t('transparencyB1'),
    t('transparencyB2'),
    t('transparencyB3'),
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
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/diagnostic-ia"
              className="glow-gold group inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-gold via-[oklch(0.65_0.11_195)] to-[oklch(0.55_0.10_195)] px-7 py-3.5 text-sm font-bold text-[oklch(0.99_0.01_195)] shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] hover:shadow-2xl sm:w-auto"
            >
              <Sparkles className="h-4 w-4" />
              {t('ctaPrimary')}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/care/catalogue"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-gold/40 bg-background/80 px-7 py-3.5 text-sm font-bold text-foreground transition-colors hover:border-gold hover:text-gold sm:w-auto"
            >
              {t('ctaSecondary')}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ===== 4-step process ===== */}
      <section className="relative py-20 sm:py-28">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-background via-secondary/30 to-background" />
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <span className="section-label inline-block">{t('stepsEyebrow')}</span>
            <h2 className="mt-3 font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl md:text-[2.75rem]">
              {t('stepsTitle')}
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
              {t('stepsSubtitle')}
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step) => {
              const Icon = step.icon
              return (
                <div
                  key={step.n}
                  className="group relative overflow-hidden rounded-2xl bg-white/10 backdrop-blur-md border border-white/40 p-6 shadow-[0_18px_40px_-22px_oklch(0.45_0.12_195/0.25)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_28px_55px_-22px_oklch(0.45_0.12_195/0.4)] dark:bg-white/[0.06] dark:border-white/15"
                >
                  <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-gold text-white shadow-lg shadow-primary/30">
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="font-display text-2xl font-bold text-gold/80">
                      {step.n}
                    </span>
                  </div>
                  <h3 className="mt-4 font-display text-base font-bold text-foreground">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {step.text}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ===== 6 criteria ===== */}
      <section className="relative py-20 sm:py-28">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <span className="section-label inline-block">{t('criteriaEyebrow')}</span>
            <h2 className="mt-3 font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
              {t('criteriaTitle')}
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
              {t('criteriaSubtitle')}
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CRITERIA.map((c) => {
              const Icon = c.icon
              return (
                <div
                  key={c.title}
                  className="rounded-2xl border border-white/40 bg-white/50 p-5 backdrop-blur-md dark:border-white/10 dark:bg-white/[0.03]"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </div>
                  <h3 className="mt-4 font-display text-sm font-bold text-foreground">
                    {c.title}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    {c.text}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ===== Transparency ===== */}
      <section className="relative py-20 sm:py-28">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="relative overflow-hidden rounded-3xl border border-gold/40 bg-gradient-to-br from-gold/[0.10] via-white/40 to-white/30 p-8 backdrop-blur-xl dark:from-gold/[0.08] dark:via-white/[0.04] dark:to-white/[0.02] sm:p-12">
            <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent" />
            <div className="text-center">
              <ShieldCheck className="mx-auto h-7 w-7 text-gold" />
              <span className="section-label mt-3 inline-block">
                {t('transparencyEyebrow')}
              </span>
              <h2 className="mt-3 font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
                {t('transparencyTitle')}
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                {t('transparencyText')}
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                {TRANSPARENCY_BULLETS.map((b) => (
                  <span
                    key={b}
                    className="inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-white/50 px-3 py-1.5 text-xs font-medium text-foreground backdrop-blur-md dark:bg-white/[0.04]"
                  >
                    <CircleCheck className="h-3 w-3 text-gold" />
                    {b}
                  </span>
                ))}
              </div>
            </div>
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
              {t('ctaTitle')}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              {t('ctaSubtitle')}
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/diagnostic-ia"
                className="glow-gold group inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-gold via-[oklch(0.65_0.11_195)] to-[oklch(0.55_0.10_195)] px-7 py-3.5 text-sm font-bold text-[oklch(0.99_0.01_195)] shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] hover:shadow-2xl sm:w-auto"
              >
                {t('ctaPrimary')}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/care/catalogue"
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
