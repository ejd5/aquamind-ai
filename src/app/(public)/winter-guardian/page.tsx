/**
 * AQWELIA — Page /winter-guardian
 *
 * B2C marketing page for the AQWELIA Winter Guardian module.
 * Server component with SEO metadata.
 */
import Link from 'next/link'
import type { Metadata } from 'next'
import { Snowflake, RefreshCw, Droplets, Camera, Calendar, ArrowRight, CheckCircle2, Coins } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('winterGuardianPage')
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: { canonical: '/winter-guardian' },
    openGraph: {
      title: t('metaTitle'),
      description: t('metaDescription'),
      type: 'website',
    },
  }
}

export default async function WinterGuardianPage() {
  const t = await getTranslations('winterGuardianPage')

  const features = [
    { icon: Snowflake, title: t('feature1Title'), desc: t('feature1Desc'), color: 'text-blue-400' },
    { icon: RefreshCw, title: t('feature2Title'), desc: t('feature2Desc'), color: 'text-blue-400' },
    { icon: Droplets, title: t('feature3Title'), desc: t('feature3Desc'), color: 'text-blue-400' },
    { icon: Camera, title: t('feature4Title'), desc: t('feature4Desc'), color: 'text-blue-400' },
  ]

  const springBs = [t('springB1'), t('springB2'), t('springB3')]

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

      {/* Features grid */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <h2 className="mb-6 font-display text-2xl font-bold tracking-tight sm:text-3xl">
          {t('featuresTitle')}
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {features.map((f, idx) => {
            const Icon = f.icon
            return (
              <div key={idx} className="glass-card relative flex flex-col rounded-2xl p-6">
                <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-400 to-transparent opacity-50" />
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-muted/40 ${f.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-display text-lg font-bold tracking-tight">
                  {f.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {f.desc}
                </p>
              </div>
            )
          })}
        </div>
      </section>

      {/* Spring preparation */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <div className="glass-card relative overflow-hidden rounded-3xl p-8 sm:p-10">
          <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent" />
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-gold" />
            <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
              {t('springTitle')}
            </h2>
          </div>
          <p className="mt-3 max-w-3xl text-base leading-relaxed text-muted-foreground">
            {t('springDesc')}
          </p>
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {springBs.map((b, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 rounded-xl border border-gold/30 bg-gold/5 px-4 py-3"
              >
                {idx === 0 ? <Coins className="h-4 w-4 text-gold" /> : idx === 1 ? <Calendar className="h-4 w-4 text-gold" /> : <CheckCircle2 className="h-4 w-4 text-gold" />}
                <span className="text-xs font-medium">{b}</span>
              </div>
            ))}
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
