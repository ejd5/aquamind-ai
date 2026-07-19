/**
 * AQWELIA — Page /fonctionnalites
 *
 * Liste détaillée des 11 modules Aquamind: Dashboard, Diagnostic photo,
 * Water Test, AI Assistant, Action Plan, Health Log, Maintenance, Weather,
 * Guides, Reminders, Paywall.
 *
 * Server component — no client hooks. Same DA as the landing page
 * (glassmorphism, gold accents, font-display, transparent background).
 */
import Link from 'next/link'
import type { Metadata } from 'next'
import {
  LayoutDashboard,
  Camera,
  Droplets,
  Sparkles,
  ListChecks,
  Activity,
  Wrench,
  CloudSun,
  BookOpen,
  Bell,
  CreditCard,
  ArrowRight,
} from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { BrainTechnologySection } from '@/components/brain/brain-technology-section'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('fonctionnalites')
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: { canonical: '/fonctionnalites' },
    openGraph: {
      title: t('metaTitle'),
      description: t('metaDescription'),
      type: 'website',
    },
  }
}

export default async function FonctionnalitesPage() {
  const t = await getTranslations('fonctionnalites')

  const MODULES = [
    { icon: LayoutDashboard, title: t('mod1Title'), desc: t('mod1Desc'), bullets: [t('mod1B1'), t('mod1B2'), t('mod1B3')] },
    { icon: Camera, title: t('mod2Title'), desc: t('mod2Desc'), bullets: [t('mod2B1'), t('mod2B2'), t('mod2B3')] },
    { icon: Droplets, title: t('mod3Title'), desc: t('mod3Desc'), bullets: [t('mod3B1'), t('mod3B2'), t('mod3B3')] },
    { icon: Sparkles, title: t('mod4Title'), desc: t('mod4Desc'), bullets: [t('mod4B1'), t('mod4B2'), t('mod4B3')] },
    { icon: ListChecks, title: t('mod5Title'), desc: t('mod5Desc'), bullets: [t('mod5B1'), t('mod5B2'), t('mod5B3')] },
    { icon: Activity, title: t('mod6Title'), desc: t('mod6Desc'), bullets: [t('mod6B1'), t('mod6B2'), t('mod6B3')] },
    { icon: Wrench, title: t('mod7Title'), desc: t('mod7Desc'), bullets: [t('mod7B1'), t('mod7B2'), t('mod7B3')] },
    { icon: CloudSun, title: t('mod8Title'), desc: t('mod8Desc'), bullets: [t('mod8B1'), t('mod8B2'), t('mod8B3')] },
    { icon: BookOpen, title: t('mod9Title'), desc: t('mod9Desc'), bullets: [t('mod9B1'), t('mod9B2'), t('mod9B3')] },
    { icon: Bell, title: t('mod10Title'), desc: t('mod10Desc'), bullets: [t('mod10B1'), t('mod10B2'), t('mod10B3')] },
    { icon: CreditCard, title: t('mod11Title'), desc: t('mod11Desc'), bullets: [t('mod11B1'), t('mod11B2'), t('mod11B3')] },
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
            <Link
              href="/comment-ca-marche"
              className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-6 py-3 text-sm font-semibold text-gold transition-colors hover:bg-gold/20"
            >
              {t('heroCtaSecondary')}
            </Link>
          </div>
          <div className="gold-divider mt-12" />
        </div>
      </section>

      {/* Modules grid */}
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {MODULES.map((mod, idx) => {
            const Icon = mod.icon
            return (
              <div
                key={mod.title}
                className="glass-card group relative flex flex-col rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1"
              >
                {/* Gold top hairline on hover */}
                <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                {/* Index + icon */}
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gold/10 text-gold">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="font-display text-3xl font-bold text-muted-foreground/30">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                </div>

                <h2 className="mt-4 font-display text-xl font-bold tracking-tight text-foreground">
                  {mod.title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {mod.desc}
                </p>

                <ul className="mt-4 space-y-1.5">
                  {mod.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <span className="mt-1.5 inline-block h-1 w-1 shrink-0 rounded-full bg-gold" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      </section>

      <BrainTechnologySection variant="home" />
      {/* CTA bottom */}
      <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <div className="glass-card rounded-3xl p-10 text-center sm:p-14">
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            {t('ctaBottomTitle')}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground">
            {t('ctaBottomSubtitle')}
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link
              href="/#tarifs"
              className="glow-gold inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-gold via-[oklch(0.65_0.11_195)] to-[oklch(0.55_0.10_195)] px-7 py-3.5 text-sm font-bold text-[oklch(0.99_0.01_195)] shadow-lg shadow-primary/20 transition-all hover:scale-[1.03]"
            >
              {t('ctaBottomPrimary')}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-7 py-3.5 text-sm font-semibold text-gold transition-colors hover:bg-gold/20"
            >
              {t('ctaBottomSecondary')}
            </Link>
          </div>
        </div>
      </section>
    </article>
  )
}
