/**
 * AQWELIA — Page /hivernage
 *
 * B2C marketing page for pool winterization.
 * Server component with SEO metadata.
 */
import Link from 'next/link'
import type { Metadata } from 'next'
import { Snowflake, Umbrella, CheckCircle2, ArrowRight, Sparkles, Activity, Bell, Calendar } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('hivernagePage')
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: { canonical: '/hivernage' },
    openGraph: {
      title: t('metaTitle'),
      description: t('metaDescription'),
      type: 'website',
    },
  }
}

export default async function HivernagePage() {
  const t = await getTranslations('hivernagePage')

  const modes = [
    {
      title: t('activeTitle'),
      desc: t('activeDesc'),
      bullets: [t('activeB1'), t('activeB2'), t('activeB3')],
      icon: Activity,
      color: 'text-blue-500',
    },
    {
      title: t('passiveTitle'),
      desc: t('passiveDesc'),
      bullets: [t('passiveB1'), t('passiveB2'), t('passiveB3')],
      icon: Umbrella,
      color: 'text-purple-500',
    },
  ]

  const checklist = [
    t('checklistItem1'),
    t('checklistItem2'),
    t('checklistItem3'),
    t('checklistItem4'),
    t('checklistItem5'),
    t('checklistItem6'),
  ]

  const wgFeatures = [t('wgB1'), t('wgB2'), t('wgB3')]

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

      {/* Modes: active vs passive */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <h2 className="mb-6 font-display text-2xl font-bold tracking-tight sm:text-3xl">
          {t('modesTitle')}
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {modes.map((mode) => {
            const Icon = mode.icon
            return (
              <div key={mode.title} className="glass-card relative flex flex-col rounded-2xl p-6">
                <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent opacity-50" />
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-muted/40 ${mode.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-display text-xl font-bold tracking-tight">
                  {mode.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {mode.desc}
                </p>
                <ul className="mt-4 space-y-1.5">
                  {mode.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[oklch(0.7_0.15_155)]" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      </section>

      {/* Checklist */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <div className="glass-card rounded-3xl p-8 sm:p-10">
          <h2 className="mb-6 font-display text-2xl font-bold tracking-tight sm:text-3xl">
            {t('checklistTitle')}
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {checklist.map((item, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 rounded-xl border border-border/40 bg-background/40 px-4 py-3"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold/10 text-xs font-bold text-gold">
                  {idx + 1}
                </span>
                <span className="text-sm leading-relaxed">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Winter Guardian presentation */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <div className="glass-card relative overflow-hidden rounded-3xl p-8 sm:p-10">
          <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent" />
          <div className="flex items-center gap-2">
            <Snowflake className="h-5 w-5 text-blue-400" />
            <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
              {t('wgTitle')}
            </h2>
          </div>
          <p className="mt-3 max-w-3xl text-base leading-relaxed text-muted-foreground">
            {t('wgDesc')}
          </p>
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {wgFeatures.map((f, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 rounded-xl border border-blue-400/20 bg-blue-400/5 px-4 py-3"
              >
                {idx === 0 ? <Bell className="h-4 w-4 text-blue-400" /> : idx === 1 ? <Calendar className="h-4 w-4 text-blue-400" /> : <Sparkles className="h-4 w-4 text-blue-400" />}
                <span className="text-xs font-medium">{f}</span>
              </div>
            ))}
          </div>
          <div className="mt-6">
            <Link
              href="/winter-guardian"
              className="inline-flex items-center gap-1.5 rounded-full border border-blue-400/40 bg-blue-400/10 px-5 py-2 text-xs font-semibold text-blue-600 transition-colors hover:bg-blue-400/20 dark:text-blue-300"
            >
              <Snowflake className="h-3.5 w-3.5" />
              {t('wgTitle')}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
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
