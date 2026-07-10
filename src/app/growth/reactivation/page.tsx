/**
 * AQWELIA Growth OS — Reactivation campaigns page.
 *
 * URL: /growth/reactivation
 * Server component. Presents the 3 nurturing scenarios (cold_3step,
 * warm_5step, lost_winback) with their step-by-step detail.
 */
import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Sparkles, Mail, MessageSquare, TrendingUp } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('growth')
  return {
    title: t('reactivationMetaTitle'),
    description: t('reactivationMetaDescription'),
  }
}

export default async function GrowthReactivationPage() {
  const t = await getTranslations('growth')

  const SCENARIOS = [
    {
      id: 'cold_3step',
      icon: Mail,
      name: t('reactivationScenario1Name'),
      desc: t('reactivationScenario1Desc'),
      steps: t.raw('reactivationScenario1Steps') as Array<{
        day: number
        channel: string
        template: string
        goal: string
      }>,
    },
    {
      id: 'warm_5step',
      icon: MessageSquare,
      name: t('reactivationScenario2Name'),
      desc: t('reactivationScenario2Desc'),
      steps: t.raw('reactivationScenario2Steps') as Array<{
        day: number
        channel: string
        template: string
        goal: string
      }>,
    },
    {
      id: 'lost_winback',
      icon: TrendingUp,
      name: t('reactivationScenario3Name'),
      desc: t('reactivationScenario3Desc'),
      steps: t.raw('reactivationScenario3Steps') as Array<{
        day: number
        channel: string
        template: string
        goal: string
      }>,
    },
  ]

  return (
    <>
      <section className="relative overflow-hidden py-16 sm:py-20">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-secondary/40 via-background to-background" />
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <span className="section-label inline-block">
            <TrendingUp className="mr-1 inline h-3 w-3" />
            {t('reactivationEyebrow')}
          </span>
          <h1 className="mt-3 font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            {t('reactivationTitle')}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t('reactivationSubtitle')}
          </p>
        </div>
      </section>

      {/* Scenarios */}
      <section className="relative py-12">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="space-y-6">
            {SCENARIOS.map((s) => {
              const Icon = s.icon
              return (
                <div
                  key={s.id}
                  className="rounded-2xl border border-white/40 bg-white/60 p-6 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04] sm:p-8"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-gold text-white shadow-lg shadow-primary/30">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <h2 className="font-display text-2xl font-bold text-foreground">
                        {s.name}
                      </h2>
                      <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>

                      <div className="mt-5 overflow-hidden rounded-xl border border-border/40">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-secondary/40 text-[10px] uppercase tracking-wide text-muted-foreground">
                            <tr>
                              <th className="px-3 py-2 font-semibold">
                                {t('reactivationColDay')}
                              </th>
                              <th className="px-3 py-2 font-semibold">
                                {t('reactivationColChannel')}
                              </th>
                              <th className="px-3 py-2 font-semibold">
                                {t('reactivationColTemplate')}
                              </th>
                              <th className="px-3 py-2 font-semibold">
                                {t('reactivationColGoal')}
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {s.steps.map((step, idx) => (
                              <tr
                                key={idx}
                                className="border-t border-border/30 bg-card/30"
                              >
                                <td className="px-3 py-2 font-mono font-bold text-gold">
                                  J+{step.day}
                                </td>
                                <td className="px-3 py-2 text-foreground">
                                  <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase">
                                    {step.channel}
                                  </span>
                                </td>
                                <td className="px-3 py-2 font-mono text-foreground/80">
                                  {step.template}
                                </td>
                                <td className="px-3 py-2 text-foreground/80">
                                  {step.goal}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
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
