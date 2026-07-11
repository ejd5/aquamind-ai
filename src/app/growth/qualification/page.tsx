/**
 * AQWELIA Growth OS — Qualification page.
 *
 * URL: /growth/qualification
 * Server component. Explains how the qualification agent works:
 *  - 7 standard questions
 *  - scoring algorithm (0-100, 4 tiers)
 *  - tier → next step mapping
 *  - example scoring walkthrough
 */
import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Sparkles, Bot, Check } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('growth')
  return {
    title: t('qualificationMetaTitle'),
    description: t('qualificationMetaDescription'),
  }
}

export default async function GrowthQualificationPage() {
  const t = await getTranslations('growth')

  const QUESTIONS = t.raw('qualificationQuestions') as Array<{
    key: string
    question: string
    options: string[]
    weight: number
  }>

  const TIERS = [
    {
      name: t('qualificationTierColdName'),
      range: t('qualificationTierColdRange'),
      nextStep: t('qualificationTierColdNextStep'),
      color: 'text-blue-500',
    },
    {
      name: t('qualificationTierWarmName'),
      range: t('qualificationTierWarmRange'),
      nextStep: t('qualificationTierWarmNextStep'),
      color: 'text-amber-500',
    },
    {
      name: t('qualificationTierHotName'),
      range: t('qualificationTierHotRange'),
      nextStep: t('qualificationTierHotNextStep'),
      color: 'text-orange-500',
    },
    {
      name: t('qualificationTierQualifiedName'),
      range: t('qualificationTierQualifiedRange'),
      nextStep: t('qualificationTierQualifiedNextStep'),
      color: 'text-emerald-500',
    },
  ]

  return (
    <>
      <section className="relative overflow-hidden py-16 sm:py-20">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-secondary/40 via-background to-background" />
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <span className="section-label inline-block">
            <Bot className="mr-1 inline h-3 w-3" />
            {t('qualificationEyebrow')}
          </span>
          <h1 className="mt-3 font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            {t('qualificationTitle')}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t('qualificationSubtitle')}
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="relative py-12">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="rounded-2xl border border-white/40 bg-white/60 p-6 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04] sm:p-8">
            <h2 className="font-display text-2xl font-bold">
              {t('qualificationHowTitle')}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {t('qualificationHowDesc')}
            </p>

            {/* 7 questions */}
            <div className="mt-6 space-y-3">
              {QUESTIONS.map((q, idx) => (
                <div
                  key={q.key}
                  className="rounded-xl border border-border/40 bg-card/40 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <span className="text-[10px] font-bold uppercase tracking-wide text-gold">
                        Q{idx + 1}
                      </span>
                      <p className="mt-1 text-sm font-semibold text-foreground">
                        {q.question}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {q.options.map((opt) => (
                          <span
                            key={opt}
                            className="rounded-full bg-secondary px-2 py-0.5 text-[11px] text-foreground"
                          >
                            {opt}
                          </span>
                        ))}
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full bg-gold/15 px-2 py-0.5 text-[11px] font-bold text-gold">
                      ×{q.weight}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Tier mapping */}
      <section className="relative py-12">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <h2 className="font-display text-2xl font-bold text-center">
            {t('qualificationTiersTitle')}
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-center text-sm text-muted-foreground">
            {t('qualificationTiersDesc')}
          </p>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {TIERS.map((tier) => (
              <div
                key={tier.name}
                className="rounded-2xl border border-white/40 bg-white/60 p-5 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04]"
              >
                <div className={`font-display text-lg font-bold ${tier.color}`}>
                  {tier.name}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{tier.range}</p>
                <div className="mt-3 rounded-lg bg-secondary/40 p-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {t('qualificationNextStepLabel')}
                  </p>
                  <p className="mt-0.5 text-xs font-medium text-foreground">
                    {tier.nextStep}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Example */}
      <section className="relative py-12">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="rounded-2xl border border-gold/40 bg-gold/[0.05] p-6 sm:p-8">
            <h2 className="font-display text-xl font-bold text-gold">
              {t('qualificationExampleTitle')}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {t('qualificationExampleDesc')}
            </p>
            <div className="mt-4 space-y-2 text-xs">
              {(t.raw('qualificationExampleSteps') as string[]).map((step, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" />
                  <span className="text-foreground/85">{step}</span>
                </div>
              ))}
            </div>
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
