/**
 * AQWELIA — Page /diagnostic-ia
 *
 * B2C marketing page for the AI photo-diagnostic feature.
 * Server component with SEO metadata. Same DA as other public pages
 * (glassmorphism, gold accents, font-display).
 */
import Link from 'next/link'
import type { Metadata } from 'next'
import { Camera, Sparkles, Activity, ListChecks, ArrowRight, Droplets, FlaskConical, AlertTriangle } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { BrainTechnologySection } from '@/components/brain/brain-technology-section'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('diagnosticIaPage')
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: { canonical: '/diagnostic-ia' },
    openGraph: {
      title: t('metaTitle'),
      description: t('metaDescription'),
      type: 'website',
    },
  }
}

export default async function DiagnosticIaPage() {
  const t = await getTranslations('diagnosticIaPage')

  const steps = [
    { icon: Camera, title: t('step1Title'), desc: t('step1Desc') },
    { icon: Sparkles, title: t('step2Title'), desc: t('step2Desc') },
    { icon: Activity, title: t('step3Title'), desc: t('step3Desc') },
    { icon: ListChecks, title: t('step4Title'), desc: t('step4Desc') },
  ]

  const examples = [
    { icon: Droplets, title: t('exampleGreenTitle'), desc: t('exampleGreenDesc'), color: 'text-[oklch(0.55_0.18_155)]' },
    { icon: FlaskConical, title: t('exampleCloudyTitle'), desc: t('exampleCloudyDesc'), color: 'text-yellow-500' },
    { icon: AlertTriangle, title: t('exampleAlgaeTitle'), desc: t('exampleAlgaeDesc'), color: 'text-[oklch(0.4_0.18_25)]' },
  ]

  return (
    <article>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <p className="section-label">{t('heroEyebrow')}</p>
          <h1 className="mt-3 font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            {t('heroTitle')}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t('heroSubtitle')}
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/#tarifs"
              className="glow-gold inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-gold via-[oklch(0.65_0.11_195)] to-[oklch(0.55_0.10_195)] px-6 py-3 text-sm font-bold text-[oklch(0.99_0.01_195)] shadow-lg shadow-primary/20 transition-all hover:scale-[1.03]"
            >
              {t('heroCta')}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="gold-divider mt-12" />
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <h2 className="mb-6 font-display text-2xl font-bold tracking-tight sm:text-3xl">
          {t('howItWorksTitle')}
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, idx) => {
            const Icon = step.icon
            return (
              <div key={idx} className="glass-card relative flex flex-col rounded-2xl p-5">
                <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent opacity-50" />
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/10 text-gold">
                  <Icon className="h-5 w-5" />
                </div>
                <span className="mt-3 font-display text-2xl font-bold text-muted-foreground/30">
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <h3 className="mt-1 font-display text-base font-bold tracking-tight">
                  {step.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {step.desc}
                </p>
              </div>
            )
          })}
        </div>
      </section>

      {/* Examples */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <h2 className="mb-6 font-display text-2xl font-bold tracking-tight sm:text-3xl">
          {t('examplesTitle')}
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {examples.map((ex, idx) => {
            const Icon = ex.icon
            return (
              <div key={idx} className="glass-card relative flex flex-col rounded-2xl p-6">
                <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent opacity-50" />
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-muted/40 ${ex.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-display text-lg font-bold tracking-tight">
                  {ex.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {ex.desc}
                </p>
              </div>
            )
          })}
        </div>
      </section>

      <BrainTechnologySection variant="diagnostic" />
      {/* CTA bottom */}
      <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <div className="glass-card rounded-3xl p-10 text-center sm:p-14">
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            {t('ctaTitle')}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground">
            {t('ctaSubtitle')}
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link
              href="/#tarifs"
              className="glow-gold inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-gold via-[oklch(0.65_0.11_195)] to-[oklch(0.55_0.10_195)] px-7 py-3.5 text-sm font-bold text-[oklch(0.99_0.01_195)] shadow-lg shadow-primary/20 transition-all hover:scale-[1.03]"
            >
              {t('ctaPrimary')}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/tarifs"
              className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-7 py-3.5 text-sm font-semibold text-gold transition-colors hover:bg-gold/20"
            >
              {t('ctaSecondary')}
            </Link>
          </div>
        </div>
      </section>
    </article>
  )
}
