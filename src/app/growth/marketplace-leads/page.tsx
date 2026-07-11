/**
 * AQWELIA Growth OS — B2C → Pro lead marketplace page.
 *
 * URL: /growth/marketplace-leads
 * Server component. Explains how the marketplace works:
 *  - B2C users on AQWELIA consumer app request a pro
 *  - Their lead (with consent) enters the marketplace
 *  - Pros bid / accept; commission auto-calculated (€25–€150)
 *  - Compliance supervisor verifies consent on every transfer
 */
import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowRight,
  Sparkles,
  Users,
  Handshake,
  Coins,
  Shield,
} from 'lucide-react'
import { getTranslations } from 'next-intl/server'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('growth')
  return {
    title: t('marketplaceMetaTitle'),
    description: t('marketplaceMetaDescription'),
  }
}

export default async function GrowthMarketplacePage() {
  const t = await getTranslations('growth')

  const STEPS = [
    {
      icon: Users,
      title: t('marketplaceStep1Title'),
      desc: t('marketplaceStep1Desc'),
    },
    {
      icon: Handshake,
      title: t('marketplaceStep2Title'),
      desc: t('marketplaceStep2Desc'),
    },
    {
      icon: Coins,
      title: t('marketplaceStep3Title'),
      desc: t('marketplaceStep3Desc'),
    },
    {
      icon: Shield,
      title: t('marketplaceStep4Title'),
      desc: t('marketplaceStep4Desc'),
    },
  ]

  const TIERS = [
    {
      volume: t('marketplaceTier1Volume'),
      rate: t('marketplaceTier1Rate'),
      min: '25 €',
      max: '150 €',
    },
    {
      volume: t('marketplaceTier2Volume'),
      rate: t('marketplaceTier2Rate'),
      min: '25 €',
      max: '150 €',
    },
    {
      volume: t('marketplaceTier3Volume'),
      rate: t('marketplaceTier3Rate'),
      min: '25 €',
      max: '150 €',
    },
  ]

  return (
    <>
      <section className="relative overflow-hidden py-16 sm:py-20">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-secondary/40 via-background to-background" />
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <span className="section-label inline-block">
            <Handshake className="mr-1 inline h-3 w-3" />
            {t('marketplaceEyebrow')}
          </span>
          <h1 className="mt-3 font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            {t('marketplaceTitle')}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t('marketplaceSubtitle')}
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="relative py-12">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, idx) => {
              const Icon = s.icon
              return (
                <div
                  key={idx}
                  className="relative overflow-hidden rounded-2xl border border-white/40 bg-white/60 p-5 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04]"
                >
                  <span className="pointer-events-none absolute right-3 top-3 font-display text-4xl font-bold text-gold/20">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-gold text-white shadow-lg shadow-primary/30">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 font-display text-base font-bold text-foreground">
                    {s.title}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    {s.desc}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Commission table */}
      <section className="relative py-12">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="rounded-2xl border border-gold/40 bg-gold/[0.05] p-6 sm:p-8">
            <h2 className="font-display text-2xl font-bold text-gold">
              {t('marketplaceCommissionTitle')}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {t('marketplaceCommissionDesc')}
            </p>
            <div className="mt-6 overflow-hidden rounded-xl border border-border/40">
              <table className="w-full text-left text-sm">
                <thead className="bg-secondary/40 text-[10px] uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-semibold">
                      {t('marketplaceColVolume')}
                    </th>
                    <th className="px-4 py-3 font-semibold">
                      {t('marketplaceColRate')}
                    </th>
                    <th className="px-4 py-3 font-semibold">
                      {t('marketplaceColMin')}
                    </th>
                    <th className="px-4 py-3 font-semibold">
                      {t('marketplaceColMax')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {TIERS.map((tier, idx) => (
                    <tr
                      key={idx}
                      className="border-t border-border/30 bg-card/30"
                    >
                      <td className="px-4 py-3 font-medium text-foreground">
                        {tier.volume}
                      </td>
                      <td className="px-4 py-3 font-mono text-gold">
                        {tier.rate}
                      </td>
                      <td className="px-4 py-3 text-foreground/80">{tier.min}</td>
                      <td className="px-4 py-3 text-foreground/80">{tier.max}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              {t('marketplaceCommissionFootnote')}
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
