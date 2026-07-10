/**
 * AQWELIA Business — Main marketing page.
 *
 * URL: /business
 * Server component (SEO-friendly). Renders:
 *  - Hero: badge + title + subtitle + 2 CTAs (Quote / Demo)
 *  - 8 business feature cards
 *  - 6 sector cards (Hôtels / Campings / Gîtes / Conciergeries / Spas / Résidences)
 *  - 8 product features (Journal sanitaire, Tâches, Mesures, Photos, etc.)
 *  - Pricing preview (Business Start / Business Multi-Site)
 *  - Final CTA
 *
 * Same DA as /pro and /care (glassmorphism, gold accents, font-display).
 */
import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowRight,
  Sparkles,
  Hotel,
  Tent,
  ConciergeBell,
  Droplets,
  Building2,
  Home,
  CalendarCheck,
  ClipboardList,
  Camera,
  Users,
  BellRing,
  History,
  Wrench,
  FileText,
} from 'lucide-react'
import { getTranslations } from 'next-intl/server'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('business')
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
  }
}

export default async function BusinessPage() {
  const t = await getTranslations('business')

  const SECTORS = [
    { icon: Hotel, emoji: '🏨', title: t('sectorHotelsTitle'), text: t('sectorHotelsText'), href: '/business/hotels' },
    { icon: Tent, emoji: '⛺', title: t('sectorCampingsTitle'), text: t('sectorCampingsText'), href: '/business/campings' },
    { icon: Home, emoji: '🏡', title: t('sectorGitesTitle'), text: t('sectorGitesText') },
    { icon: ConciergeBell, emoji: '🔔', title: t('sectorConciergeriesTitle'), text: t('sectorConciergeriesText'), href: '/business/conciergeries' },
    { icon: Droplets, emoji: '💦', title: t('sectorSpasTitle'), text: t('sectorSpasText'), href: '/business/spas' },
    { icon: Building2, emoji: '🏢', title: t('sectorResidencesTitle'), text: t('sectorResidencesText') },
  ]

  const FEATURES = [
    { icon: FileText, title: t('featureJournalTitle'), text: t('featureJournalText') },
    { icon: ClipboardList, title: t('featureTasksTitle'), text: t('featureTasksText') },
    { icon: Droplets, title: t('featureMeasuresTitle'), text: t('featureMeasuresText') },
    { icon: Camera, title: t('featurePhotosTitle'), text: t('featurePhotosText') },
    { icon: Users, title: t('featureOwnersTitle'), text: t('featureOwnersText') },
    { icon: BellRing, title: t('featureAlertsTitle'), text: t('featureAlertsText') },
    { icon: History, title: t('featureHistoryTitle'), text: t('featureHistoryText') },
    { icon: Wrench, title: t('featureRequestsTitle'), text: t('featureRequestsText') },
  ]

  const PLANS = [
    {
      id: 'start',
      name: t('planStartName'),
      price: t('planStartPrice'),
      tagline: t('planStartTagline'),
      features: t.raw('planStartFeatures') as string[],
      highlighted: true,
    },
    {
      id: 'multisite',
      name: t('planMultiName'),
      price: t('planMultiPrice'),
      tagline: t('planMultiTagline'),
      features: t.raw('planMultiFeatures') as string[],
      highlighted: false,
    },
  ]

  return (
    <>
      {/* ===== Hero ===== */}
      <section className="relative overflow-hidden py-20 sm:py-28">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-secondary/40 via-background to-background" />
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <span className="section-label inline-block">{t('badgePro')}</span>
          <h1 className="mt-4 font-display text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl md:text-[3.5rem]">
            {t('pageTitle')}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t('pageSubtitle')}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-sm text-muted-foreground">
            <span>{t('forLabel')}</span>
            <span className="font-medium text-foreground">
              {t('forSectors')}
            </span>
          </div>

          {/* CTAs */}
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/business#contact"
              className="glow-gold group inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-gold via-[oklch(0.65_0.11_195)] to-[oklch(0.55_0.10_195)] px-7 py-3.5 text-sm font-bold text-[oklch(0.99_0.01_195)] shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] hover:shadow-2xl sm:w-auto"
            >
              <Sparkles className="h-4 w-4" />
              {t('ctaQuote')}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/business/demo"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-gold/40 bg-background/80 px-7 py-3.5 text-sm font-bold text-foreground transition-colors hover:border-gold hover:text-gold sm:w-auto"
            >
              {t('ctaDemo')}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ===== Sectors ===== */}
      <section id="solutions" className="relative py-20 sm:py-28">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-background via-secondary/30 to-background" />
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <span className="section-label inline-block">{t('sectorsEyebrow')}</span>
            <h2 className="mt-3 font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl md:text-[2.75rem]">
              {t('sectorsTitle')}
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
              {t('sectorsSubtitle')}
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {SECTORS.map((card) => {
              const Icon = card.icon
              const content = (
                <>
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
                </>
              )
              if (card.href) {
                return (
                  <Link
                    key={card.title}
                    href={card.href}
                    className="group relative overflow-hidden rounded-2xl bg-white/10 backdrop-blur-md border border-white/40 shadow-[0_18px_40px_-22px_oklch(0.45_0.12_195/0.25)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_28px_55px_-22px_oklch(0.45_0.12_195/0.4)] dark:bg-white/[0.06] dark:border-white/15"
                  >
                    {content}
                  </Link>
                )
              }
              return (
                <div
                  key={card.title}
                  className="group relative overflow-hidden rounded-2xl bg-white/10 backdrop-blur-md border border-white/40 shadow-[0_18px_40px_-22px_oklch(0.45_0.12_195/0.25)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_28px_55px_-22px_oklch(0.45_0.12_195/0.4)] dark:bg-white/[0.06] dark:border-white/15"
                >
                  {content}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ===== Product features ===== */}
      <section className="relative py-20 sm:py-28">
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
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/80 to-gold/80 text-white shadow-md shadow-primary/20">
                      <Icon className="h-4 w-4" />
                    </div>
                    <h3 className="mt-4 font-display text-base font-bold text-foreground">
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

      {/* ===== Pricing preview ===== */}
      <section id="pricing" className="relative py-20 sm:py-28">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-background via-secondary/30 to-background" />
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <span className="section-label inline-block">{t('pricingEyebrow')}</span>
            <h2 className="mt-3 font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl md:text-[2.75rem]">
              {t('pricingTitle')}
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
              {t('pricingSubtitle')}
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2">
            {PLANS.map((plan) => {
              const isHighlighted = plan.highlighted
              return (
                <div
                  key={plan.id}
                  className={`relative flex h-full flex-col overflow-hidden rounded-2xl backdrop-blur-xl transition-all duration-300 ${
                    isHighlighted
                      ? 'border-2 border-gold/60 bg-gradient-to-br from-gold/[0.12] via-white/60 to-white/40 shadow-[0_25px_60px_-20px_oklch(0.65_0.11_195/0.5)] lg:scale-[1.02] dark:via-white/[0.04] dark:to-white/[0.02]'
                      : 'border border-white/40 bg-white/60 hover:-translate-y-1 hover:shadow-xl dark:border-white/10 dark:bg-white/[0.03]'
                  }`}
                >
                  {isHighlighted && (
                    <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent" />
                  )}
                  <div className="flex flex-1 flex-col p-6">
                    <h3 className="font-display text-xl font-bold">{plan.name}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">{plan.tagline}</p>
                    <div className="mt-5 flex items-baseline gap-1">
                      <span className="font-display text-3xl font-bold">{plan.price}</span>
                      <span className="text-xs text-muted-foreground">
                        {t('pricingPerMonth')}
                      </span>
                    </div>
                    <Link
                      href="/business/tarifs"
                      className="mt-5 flex w-full items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold transition-all bg-gradient-to-r from-gold via-[oklch(0.65_0.11_195)] to-[oklch(0.55_0.10_195)] text-[oklch(0.99_0.01_195)] shadow-lg shadow-gold/30 hover:scale-[1.02]"
                    >
                      {t('pricingCta')}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                    <ul className="mt-5 space-y-2">
                      {plan.features.map((f) => (
                        <li
                          key={f}
                          className="flex items-start gap-2 text-xs text-foreground/85"
                        >
                          <CalendarCheck
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

          <div className="mt-8 text-center">
            <Link
              href="/business/tarifs"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              {t('pricingCompareCta')}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ===== Final CTA ===== */}
      <section id="contact" className="relative py-20 sm:py-28">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-background via-secondary/40 to-background" />
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <div className="relative overflow-hidden rounded-3xl border border-gold/40 bg-white/40 p-8 backdrop-blur-xl dark:bg-white/[0.04] sm:p-12">
            <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent" />
            <Sparkles className="mx-auto h-6 w-6 text-gold" />
            <h2 className="mt-4 font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
              {t('ctaFinalTitle')}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              {t('ctaFinalSubtitle')}
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="mailto:contact@aqwelia.app"
                className="glow-gold group inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-gold via-[oklch(0.65_0.11_195)] to-[oklch(0.55_0.10_195)] px-7 py-3.5 text-sm font-bold text-[oklch(0.99_0.01_195)] shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] hover:shadow-2xl sm:w-auto"
              >
                {t('ctaQuote')}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/business/demo"
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
