/**
 * AQWELIA Growth OS — Main marketing page.
 *
 * URL: /growth
 * Server component (SEO-friendly). Renders:
 *  - Hero: badge + title + subtitle + 2 CTAs (Open dashboard / View demo)
 *  - 10-agent pipeline overview (icon grid)
 *  - Stats banner (conversion rate, leads captured, etc.)
 *  - Pipeline section (capture → qualify → match → appointment → quote → won)
 *  - Pricing teaser (3 tiers)
 *  - Final CTA
 */
import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowRight,
  Sparkles,
  Check,
  TrendingUp,
  Target,
  Users,
  Calendar,
  FileText,
  Shield,
  Activity,
  Bot,
  Zap,
} from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { BrainTechnologySection } from '@/components/brain/brain-technology-section'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('growth')
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
  }
}

export default async function GrowthPage() {
  const t = await getTranslations('growth')

  const AGENTS = [
    { icon: Target, name: t('agent1Name'), desc: t('agent1Desc') },
    { icon: Zap, name: t('agent2Name'), desc: t('agent2Desc') },
    { icon: Bot, name: t('agent3Name'), desc: t('agent3Desc') },
    { icon: Activity, name: t('agent4Name'), desc: t('agent4Desc') },
    { icon: Users, name: t('agent5Name'), desc: t('agent5Desc') },
    { icon: Calendar, name: t('agent6Name'), desc: t('agent6Desc') },
    { icon: TrendingUp, name: t('agent7Name'), desc: t('agent7Desc') },
    { icon: FileText, name: t('agent8Name'), desc: t('agent8Desc') },
    { icon: Sparkles, name: t('agent9Name'), desc: t('agent9Desc') },
    { icon: Shield, name: t('agent10Name'), desc: t('agent10Desc') },
  ]

  const PIPELINE = [
    { step: '01', title: t('pipeline1Title'), desc: t('pipeline1Desc') },
    { step: '02', title: t('pipeline2Title'), desc: t('pipeline2Desc') },
    { step: '03', title: t('pipeline3Title'), desc: t('pipeline3Desc') },
    { step: '04', title: t('pipeline4Title'), desc: t('pipeline4Desc') },
    { step: '05', title: t('pipeline5Title'), desc: t('pipeline5Desc') },
    { step: '06', title: t('pipeline6Title'), desc: t('pipeline6Desc') },
  ]

  const STATS = [
    { value: '10', label: t('statAgents') },
    { value: '0–100', label: t('statConversion') },
    { value: '6', label: t('statResponseTime') },
    { value: '100%', label: t('statAvailability') },
  ]

  const PLANS = [
    {
      id: 'starter',
      name: t('planStarterName'),
      price: t('planStarterPrice'),
      tagline: t('planStarterTagline'),
      features: t.raw('planStarterFeatures') as string[],
      highlighted: false,
    },
    {
      id: 'pro',
      name: t('planProName'),
      price: t('planProPrice'),
      tagline: t('planProTagline'),
      features: t.raw('planProFeatures') as string[],
      highlighted: true,
    },
    {
      id: 'performance',
      name: t('planPerformanceName'),
      price: t('planPerformancePrice'),
      tagline: t('planPerformanceTagline'),
      features: t.raw('planPerformanceFeatures') as string[],
      highlighted: false,
    },
  ]

  return (
    <>
      {/* ===== Hero ===== */}
      <section className="relative overflow-hidden py-20 sm:py-28">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-secondary/40 via-background to-background" />
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <span className="section-label inline-block">
            <TrendingUp className="mr-1 inline h-3 w-3" />
            {t('badgeGrowthOS')}
          </span>
          <h1 className="mt-4 font-display text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl md:text-[3.5rem]">
            {t('pageTitle')}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t('pageSubtitle')}
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/growth/app"
              className="glow-gold group inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-gold via-[oklch(0.65_0.11_195)] to-[oklch(0.55_0.10_195)] px-7 py-3.5 text-sm font-bold text-[oklch(0.99_0.01_195)] shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] hover:shadow-2xl sm:w-auto"
            >
              <Sparkles className="h-4 w-4" />
              {t('ctaOpenDashboard')}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/growth/demo"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-gold/40 bg-background/80 px-7 py-3.5 text-sm font-bold text-foreground transition-colors hover:border-gold hover:text-gold sm:w-auto"
            >
              {t('ctaDemo')}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ===== Stats banner ===== */}
      <section className="border-y border-border/40 bg-secondary/20 py-12">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 sm:px-6 md:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <div className="font-display text-3xl font-bold text-gold sm:text-4xl">
                {s.value}
              </div>
              <div className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== 10-agent overview ===== */}
      <section className="relative py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <span className="section-label inline-block">{t('agentsEyebrow')}</span>
            <h2 className="mt-3 font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl md:text-[2.75rem]">
              {t('agentsTitle')}
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
              {t('agentsSubtitle')}
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {AGENTS.map((agent, idx) => {
              const Icon = agent.icon
              return (
                <div
                  key={agent.name}
                  className="group relative overflow-hidden rounded-2xl bg-white/10 backdrop-blur-md border border-white/40 shadow-[0_18px_40px_-22px_oklch(0.45_0.12_195/0.25)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_28px_55px_-22px_oklch(0.45_0.12_195/0.4)] dark:bg-white/[0.06] dark:border-white/15"
                >
                  <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <div className="p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-gold text-white shadow-md shadow-primary/30">
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="text-xs font-bold text-muted-foreground">
                        #{String(idx + 1).padStart(2, '0')}
                      </span>
                    </div>
                    <h3 className="mt-3 font-display text-sm font-bold text-foreground">
                      {agent.name}
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {agent.desc}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-10 text-center">
            <Link
              href="/growth/fonctionnalites"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              {t('agentsViewAll')}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ===== Pipeline ===== */}
      <section className="relative py-20 sm:py-28">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-background via-secondary/30 to-background" />
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <span className="section-label inline-block">{t('pipelineEyebrow')}</span>
            <h2 className="mt-3 font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl md:text-[2.75rem]">
              {t('pipelineTitle')}
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
              {t('pipelineSubtitle')}
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PIPELINE.map((p) => (
              <div
                key={p.step}
                className="relative overflow-hidden rounded-2xl border border-white/40 bg-white/60 p-6 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04]"
              >
                <span className="font-display text-4xl font-bold text-gold/30">
                  {p.step}
                </span>
                <h3 className="mt-2 font-display text-lg font-bold text-foreground">
                  {p.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {p.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <BrainTechnologySection variant="growth" />
      {/* ===== Pricing teaser ===== */}
      <section className="relative py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <span className="section-label inline-block">{t('pricingEyebrow')}</span>
            <h2 className="mt-3 font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl md:text-[2.75rem]">
              {t('pricingTitle')}
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
              {t('pricingSubtitle')}
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-3">
            {PLANS.map((plan) => {
              const isHighlighted = plan.highlighted
              return (
                <div
                  key={plan.id}
                  className={`relative flex h-full flex-col overflow-hidden rounded-2xl backdrop-blur-xl transition-all duration-300 ${
                    isHighlighted
                      ? 'border-2 border-gold/60 bg-gradient-to-br from-gold/[0.12] via-white/60 to-white/40 shadow-[0_25px_60px_-20px_oklch(0.65_0.11_195/0.5)] lg:-translate-y-3 lg:scale-[1.03] dark:via-white/[0.04] dark:to-white/[0.02]'
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
                      <span className="text-xs text-muted-foreground">{t('pricingPerMonth')}</span>
                    </div>
                    <ul className="mt-5 space-y-2">
                      {plan.features.map((f) => (
                        <li
                          key={f}
                          className="flex items-start gap-2 text-xs text-foreground/85"
                        >
                          <Check
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

          <div className="mt-10 text-center">
            <Link
              href="/growth/tarifs"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              {t('pricingViewAll')}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ===== Final CTA ===== */}
      <section className="relative py-20 sm:py-28">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-background via-secondary/40 to-background" />
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <div className="relative overflow-hidden rounded-3xl border border-gold/40 bg-white/40 p-8 backdrop-blur-xl dark:bg-white/[0.04] sm:p-12">
            <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent" />
            <Sparkles className="mx-auto h-6 w-6 text-gold" />
            <h2 className="mt-4 font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
              {t('finalCtaTitle')}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              {t('finalCtaSubtitle')}
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/growth/app"
                className="glow-gold group inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-gold via-[oklch(0.65_0.11_195)] to-[oklch(0.55_0.10_195)] px-7 py-3.5 text-sm font-bold text-[oklch(0.99_0.01_195)] shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] hover:shadow-2xl sm:w-auto"
              >
                {t('ctaOpenDashboard')}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/growth/faq"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-gold/40 bg-background/80 px-7 py-3.5 text-sm font-bold text-foreground transition-colors hover:border-gold hover:text-gold sm:w-auto"
              >
                {t('navFaq')}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
