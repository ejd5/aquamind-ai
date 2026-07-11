/**
 * AQWELIA Growth OS — Features page (10 agents detail).
 *
 * URL: /growth/fonctionnalites
 * Server component. Renders the 10 agents with their objective, tools, budget,
 * maxActions, and an example output.
 */
import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowRight,
  Sparkles,
  Target,
  Zap,
  Bot,
  Activity,
  Users,
  Calendar,
  TrendingUp,
  FileText,
  Shield,
  Wrench,
  Gauge,
} from 'lucide-react'
import { getTranslations } from 'next-intl/server'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('growth')
  return {
    title: t('featuresMetaTitle'),
    description: t('featuresMetaDescription'),
  }
}

export default async function GrowthFeaturesPage() {
  const t = await getTranslations('growth')

  const AGENTS = [
    {
      icon: Target,
      number: '01',
      name: t('agent1Name'),
      tagline: t('agent1Tagline'),
      objective: t('agent1Objective'),
      tools: t.raw('agent1Tools') as string[],
      budget: t('agent1Budget'),
      maxActions: t('agent1MaxActions'),
      example: t('agent1Example'),
    },
    {
      icon: Zap,
      number: '02',
      name: t('agent2Name'),
      tagline: t('agent2Tagline'),
      objective: t('agent2Objective'),
      tools: t.raw('agent2Tools') as string[],
      budget: t('agent2Budget'),
      maxActions: t('agent2MaxActions'),
      example: t('agent2Example'),
    },
    {
      icon: Bot,
      number: '03',
      name: t('agent3Name'),
      tagline: t('agent3Tagline'),
      objective: t('agent3Objective'),
      tools: t.raw('agent3Tools') as string[],
      budget: t('agent3Budget'),
      maxActions: t('agent3MaxActions'),
      example: t('agent3Example'),
    },
    {
      icon: Activity,
      number: '04',
      name: t('agent4Name'),
      tagline: t('agent4Tagline'),
      objective: t('agent4Objective'),
      tools: t.raw('agent4Tools') as string[],
      budget: t('agent4Budget'),
      maxActions: t('agent4MaxActions'),
      example: t('agent4Example'),
    },
    {
      icon: Users,
      number: '05',
      name: t('agent5Name'),
      tagline: t('agent5Tagline'),
      objective: t('agent5Objective'),
      tools: t.raw('agent5Tools') as string[],
      budget: t('agent5Budget'),
      maxActions: t('agent5MaxActions'),
      example: t('agent5Example'),
    },
    {
      icon: Calendar,
      number: '06',
      name: t('agent6Name'),
      tagline: t('agent6Tagline'),
      objective: t('agent6Objective'),
      tools: t.raw('agent6Tools') as string[],
      budget: t('agent6Budget'),
      maxActions: t('agent6MaxActions'),
      example: t('agent6Example'),
    },
    {
      icon: TrendingUp,
      number: '07',
      name: t('agent7Name'),
      tagline: t('agent7Tagline'),
      objective: t('agent7Objective'),
      tools: t.raw('agent7Tools') as string[],
      budget: t('agent7Budget'),
      maxActions: t('agent7MaxActions'),
      example: t('agent7Example'),
    },
    {
      icon: FileText,
      number: '08',
      name: t('agent8Name'),
      tagline: t('agent8Tagline'),
      objective: t('agent8Objective'),
      tools: t.raw('agent8Tools') as string[],
      budget: t('agent8Budget'),
      maxActions: t('agent8MaxActions'),
      example: t('agent8Example'),
    },
    {
      icon: Sparkles,
      number: '09',
      name: t('agent9Name'),
      tagline: t('agent9Tagline'),
      objective: t('agent9Objective'),
      tools: t.raw('agent9Tools') as string[],
      budget: t('agent9Budget'),
      maxActions: t('agent9MaxActions'),
      example: t('agent9Example'),
    },
    {
      icon: Shield,
      number: '10',
      name: t('agent10Name'),
      tagline: t('agent10Tagline'),
      objective: t('agent10Objective'),
      tools: t.raw('agent10Tools') as string[],
      budget: t('agent10Budget'),
      maxActions: t('agent10MaxActions'),
      example: t('agent10Example'),
    },
  ]

  return (
    <>
      {/* Header */}
      <section className="relative overflow-hidden py-16 sm:py-20">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-secondary/40 via-background to-background" />
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <span className="section-label inline-block">{t('featuresEyebrow')}</span>
          <h1 className="mt-3 font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            {t('featuresTitle')}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t('featuresSubtitle')}
          </p>
        </div>
      </section>

      {/* Agents list */}
      <section className="relative pb-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="space-y-5">
            {AGENTS.map((agent) => {
              const Icon = agent.icon
              return (
                <div
                  key={agent.number}
                  className="relative overflow-hidden rounded-2xl border border-white/40 bg-white/60 p-6 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04] sm:p-8"
                >
                  <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent" />
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                    <div className="flex items-center gap-3 sm:flex-col sm:items-center sm:gap-2">
                      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-gold text-white shadow-lg shadow-primary/30">
                        <Icon className="h-6 w-6" />
                      </div>
                      <span className="font-display text-2xl font-bold text-gold/40">
                        {agent.number}
                      </span>
                    </div>
                    <div className="flex-1">
                      <h2 className="font-display text-2xl font-bold text-foreground">
                        {agent.name}
                      </h2>
                      <p className="mt-1 text-sm font-medium text-gold">
                        {agent.tagline}
                      </p>
                      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                        {agent.objective}
                      </p>

                      {/* Tools */}
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs font-semibold text-muted-foreground">
                          {t('featuresToolsLabel')}:
                        </span>
                        {agent.tools.map((tool) => (
                          <span
                            key={tool}
                            className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-foreground"
                          >
                            {tool}
                          </span>
                        ))}
                      </div>

                      {/* Budget + maxActions */}
                      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Gauge className="h-3.5 w-3.5" />
                          {t('featuresBudgetLabel')}: <strong className="text-foreground">{agent.budget}</strong>
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Zap className="h-3.5 w-3.5" />
                          {t('featuresMaxActionsLabel')}: <strong className="text-foreground">{agent.maxActions}</strong>
                        </span>
                      </div>

                      {/* Example output */}
                      <div className="mt-4 rounded-xl border border-border/40 bg-secondary/30 p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          {t('featuresExampleLabel')}
                        </p>
                        <p className="mt-1 font-mono text-xs text-foreground/80">
                          {agent.example}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <Link
            href="/growth/app"
            className="glow-gold group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-gold via-[oklch(0.65_0.11_195)] to-[oklch(0.55_0.10_195)] px-7 py-3.5 text-sm font-bold text-[oklch(0.99_0.01_195)] shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] sm:w-auto"
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
