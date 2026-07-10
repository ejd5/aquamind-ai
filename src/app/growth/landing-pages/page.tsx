/**
 * AQWELIA Growth OS — Landing pages system page.
 *
 * URL: /growth/landing-pages
 * Server component. Explains the local SEO landing page generator:
 *  - One page per city × service combination
 *  - Auto-generated content (H1, FAQ, schema.org markup)
 *  - Conversion form wired to lead_capture agent
 */
import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Sparkles, MapPin, Globe, Search, BarChart3 } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('growth')
  return {
    title: t('landingPagesMetaTitle'),
    description: t('landingPagesMetaDescription'),
  }
}

export default async function GrowthLandingPagesPage() {
  const t = await getTranslations('growth')

  const FEATURES = [
    {
      icon: MapPin,
      title: t('landingPagesFeature1Title'),
      desc: t('landingPagesFeature1Desc'),
    },
    {
      icon: Search,
      title: t('landingPagesFeature2Title'),
      desc: t('landingPagesFeature2Desc'),
    },
    {
      icon: Globe,
      title: t('landingPagesFeature3Title'),
      desc: t('landingPagesFeature3Desc'),
    },
    {
      icon: BarChart3,
      title: t('landingPagesFeature4Title'),
      desc: t('landingPagesFeature4Desc'),
    },
  ]

  const EXAMPLE_CITIES = t.raw('landingPagesExampleCities') as string[]
  const EXAMPLE_SERVICES = t.raw('landingPagesExampleServices') as string[]

  return (
    <>
      <section className="relative overflow-hidden py-16 sm:py-20">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-secondary/40 via-background to-background" />
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <span className="section-label inline-block">
            <MapPin className="mr-1 inline h-3 w-3" />
            {t('landingPagesEyebrow')}
          </span>
          <h1 className="mt-3 font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            {t('landingPagesTitle')}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t('landingPagesSubtitle')}
          </p>
        </div>
      </section>

      {/* Features grid */}
      <section className="relative py-12">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {FEATURES.map((f) => {
              const Icon = f.icon
              return (
                <div
                  key={f.title}
                  className="rounded-2xl border border-white/40 bg-white/60 p-6 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04]"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-gold text-white shadow-lg shadow-primary/30">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 font-display text-lg font-bold text-foreground">
                    {f.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {f.desc}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Matrix preview */}
      <section className="relative py-12">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="rounded-2xl border border-gold/40 bg-gold/[0.05] p-6 sm:p-8">
            <h2 className="font-display text-2xl font-bold text-gold">
              {t('landingPagesMatrixTitle')}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {t('landingPagesMatrixDesc')}
            </p>
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {t('landingPagesCitiesLabel')}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {EXAMPLE_CITIES.map((c) => (
                    <span
                      key={c}
                      className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-foreground"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {t('landingPagesServicesLabel')}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {EXAMPLE_SERVICES.map((s) => (
                    <span
                      key={s}
                      className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-foreground"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <p className="mt-6 text-center text-xs text-muted-foreground">
              {t('landingPagesMatrixCount', {
                cities: EXAMPLE_CITIES.length,
                services: EXAMPLE_SERVICES.length,
                total: EXAMPLE_CITIES.length * EXAMPLE_SERVICES.length,
              })}
            </p>
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
