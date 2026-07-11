/**
 * AQWELIA — Page /remise-en-route
 *
 * B2C marketing page for pool spring start-up.
 * Server component with SEO metadata.
 */
import Link from 'next/link'
import type { Metadata } from 'next'
import { Sparkles, Droplets, FlaskConical, RefreshCw, FlaskRound, ArrowRight, CheckCircle2 } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('remiseEnRoutePage')
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: { canonical: '/remise-en-route' },
    openGraph: {
      title: t('metaTitle'),
      description: t('metaDescription'),
      type: 'website',
    },
  }
}

export default async function RemiseEnRoutePage() {
  const t = await getTranslations('remiseEnRoutePage')

  const steps = [
    { icon: Sparkles, title: t('step1Title'), desc: t('step1Desc') },
    { icon: Droplets, title: t('step2Title'), desc: t('step2Desc') },
    { icon: FlaskConical, title: t('step3Title'), desc: t('step3Desc') },
    { icon: RefreshCw, title: t('step4Title'), desc: t('step4Desc') },
    { icon: FlaskRound, title: t('step5Title'), desc: t('step5Desc') },
  ]

  const timeline = [
    t('timelineItem1'),
    t('timelineItem2'),
    t('timelineItem3'),
    t('timelineItem4'),
    t('timelineItem5'),
    t('timelineItem6'),
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

      {/* 5 steps */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <h2 className="mb-6 font-display text-2xl font-bold tracking-tight sm:text-3xl">
          {t('stepsTitle')}
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
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

      {/* Spring timeline */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <div className="glass-card rounded-3xl p-8 sm:p-10">
          <h2 className="mb-6 font-display text-2xl font-bold tracking-tight sm:text-3xl">
            {t('timelineTitle')}
          </h2>
          <div className="relative">
            {/* Vertical line */}
            <span className="absolute left-3 top-2 bottom-2 w-px bg-gradient-to-b from-gold/60 via-gold/30 to-transparent" />
            <ul className="space-y-4">
              {timeline.map((item, idx) => (
                <li key={idx} className="relative flex items-start gap-4 pl-8">
                  <span className="absolute left-0 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-gold/10 text-[10px] font-bold text-gold">
                    {idx + 1}
                  </span>
                  <span className="text-sm leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

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
