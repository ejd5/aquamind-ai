/**
 * AQWELIA Care — Catalogue placeholder page.
 *
 * URL: /care/catalogue
 * Server component (SEO-friendly). Renders:
 *  - Hero: badge Coming soon + title + message
 *  - 8 category placeholder cards (each with "Coming soon" badge)
 *  - CTA back to /care
 *
 * Same DA as /care and /pro pages.
 */
import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, Sparkles, Beaker, Filter, Disc3, Wrench, Gauge, Snowflake, Droplets, Cpu } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('care')
  return {
    title: t('catalogueTitle'),
    description: t('catalogueMessage'),
  }
}

export default async function CareCataloguePage() {
  const t = await getTranslations('care')

  const CATEGORIES = [
    { icon: Beaker, emoji: '🧪', title: t('category1Title') },
    { icon: Filter, emoji: '🧯', title: t('category2Title') },
    { icon: Disc3, emoji: '🧺', title: t('category3Title') },
    { icon: Wrench, emoji: '🔩', title: t('category4Title') },
    { icon: Gauge, emoji: '⚙️', title: t('category5Title') },
    { icon: Snowflake, emoji: '❄️', title: t('category6Title') },
    { icon: Droplets, emoji: '💧', title: t('category7Title') },
    { icon: Cpu, emoji: '📡', title: t('category8Title') },
  ]

  return (
    <>
      {/* ===== Hero ===== */}
      <section className="relative overflow-hidden py-20 sm:py-28">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-secondary/40 via-background to-background" />
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <span className="section-label inline-block">{t('catalogueEyebrow')}</span>
          <h1 className="mt-4 font-display text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl md:text-[3.5rem]">
            {t('catalogueTitle')}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t('catalogueMessage')}
          </p>

          <div className="mt-10">
            <Link
              href="/care#notifier"
              className="glow-gold group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-gold via-[oklch(0.65_0.11_195)] to-[oklch(0.55_0.10_195)] px-7 py-3.5 text-sm font-bold text-[oklch(0.99_0.01_195)] shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] hover:shadow-2xl"
            >
              <Sparkles className="h-4 w-4" />
              {t('ctaNotify')}
            </Link>
          </div>
        </div>
      </section>

      {/* ===== Categories placeholder grid ===== */}
      <section className="relative py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {CATEGORIES.map((card) => {
              const Icon = card.icon
              return (
                <div
                  key={card.title}
                  className="group relative overflow-hidden rounded-2xl bg-white/10 backdrop-blur-md border border-white/40 shadow-[0_18px_40px_-22px_oklch(0.45_0.12_195/0.25)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_28px_55px_-22px_oklch(0.45_0.12_195/0.4)] dark:bg-white/[0.06] dark:border-white/15"
                >
                  <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                  {/* Coming soon badge */}
                  <span className="absolute right-3 top-3 z-10 inline-flex items-center gap-1 rounded-full border border-gold/40 bg-gold/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-gold">
                    <Sparkles className="h-2.5 w-2.5" />
                    {t('catalogueBadge')}
                  </span>

                  <div className="p-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-gold text-white shadow-lg shadow-primary/30">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-4 flex items-center gap-2 font-display text-base font-bold text-foreground">
                      <span aria-hidden="true">{card.emoji}</span>
                      {card.title}
                    </h3>
                    {/* Placeholder product count */}
                    <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="h-1.5 w-1.5 rounded-full bg-gold/50" />
                      <span>—</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ===== Back CTA ===== */}
      <section className="relative py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <Link
            href="/care"
            className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-background/80 px-5 py-2.5 text-sm font-bold text-foreground transition-colors hover:border-gold hover:text-gold"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t('catalogueCtaBack')}
          </Link>
        </div>
      </section>
    </>
  )
}
