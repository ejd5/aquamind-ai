/**
 * AQWELIA — Page /spa
 *
 * B2C marketing page for the Spa 365 plan.
 * Server component with SEO metadata.
 */
import Link from 'next/link'
import type { Metadata } from 'next'
import { Droplets, RefreshCw, Coins, Package, FlaskConical, Bell, ArrowRight, CheckCircle2 } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('spaPage')
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: { canonical: '/spa' },
    openGraph: {
      title: t('metaTitle'),
      description: t('metaDescription'),
      type: 'website',
    },
  }
}

export default async function SpaPage() {
  const t = await getTranslations('spaPage')

  const features = [
    { icon: Droplets, title: t('feature1Title'), desc: t('feature1Desc') },
    { icon: RefreshCw, title: t('feature2Title'), desc: t('feature2Desc') },
    { icon: Coins, title: t('feature3Title'), desc: t('feature3Desc') },
    { icon: Package, title: t('feature4Title'), desc: t('feature4Desc') },
    { icon: FlaskConical, title: t('feature5Title'), desc: t('feature5Desc') },
    { icon: Bell, title: t('feature6Title'), desc: t('feature6Desc') },
  ]

  return (
    <article>
      {/* Hero with plan card */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="section-label">{t('heroEyebrow')}</p>
              <h1 className="mt-3 font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
                {t('heroTitle')}
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
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
            </div>

            {/* Plan card */}
            <div className="glass-card relative overflow-hidden rounded-3xl p-8 sm:p-10">
              <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent" />
              <div className="flex items-center gap-2">
                <span className="text-2xl">♨️</span>
                <h2 className="font-display text-2xl font-bold tracking-tight">
                  {t('planTitle')}
                </h2>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{t('planTagline')}</p>
              <div className="mt-6 flex items-baseline gap-2">
                <span className="font-display text-5xl font-bold text-gold">{t('planPrice')}</span>
                <span className="text-sm text-muted-foreground">{t('planPriceSuffix')}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{t('planYearly')}</p>
              <Link
                href="/#tarifs"
                className="glow-gold mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-gold via-[oklch(0.65_0.11_195)] to-[oklch(0.55_0.10_195)] px-6 py-3 text-sm font-bold text-[oklch(0.99_0.01_195)] shadow-lg shadow-primary/20 transition-all hover:scale-[1.02]"
              >
                {t('heroCta')}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
          <div className="gold-divider mt-12" />
        </div>
      </section>

      {/* Features grid */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <h2 className="mb-6 font-display text-2xl font-bold tracking-tight sm:text-3xl">
          {t('featuresTitle')}
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, idx) => {
            const Icon = f.icon
            return (
              <div key={idx} className="glass-card relative flex flex-col rounded-2xl p-6">
                <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent opacity-50" />
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gold/10 text-gold">
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
