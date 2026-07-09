'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, ShieldCheck, Lock, RotateCcw, Sparkles, ArrowRight, Zap } from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'
import { PLANS, DURATIONS } from '@/lib/pool/freemium'
import { Reveal, SectionHeading, scrollToId } from '../landing-utils'

interface PricingProps {
  hasProfile: boolean
  onEnterApp: () => void
}

type DurationId = (typeof DURATIONS)[number]['id']

const DURATION_LABEL_KEY: Record<DurationId, string> = {
  week: 'week',
  month: 'month',
  halfyear: 'halfyear',
  year: 'year',
}

const DURATION_SUFFIX_KEY: Record<DurationId, string> = {
  week: 'perWeek',
  month: 'perMonth',
  halfyear: 'perHalfyear',
  year: 'perYear',
}

// Main toggle only shows 3 durations: Mensuel / Saison (6 mois) / Annuel.
// The weekly "Pass urgence" is rendered in a dedicated secondary zone below.
const MAIN_DURATIONS = DURATIONS.filter((d) => d.id !== 'week')

export function Pricing({ hasProfile, onEnterApp }: PricingProps) {
  const t = useTranslations('landing')
  const tPlans = useTranslations('plans')
  const locale = useLocale()

  const [duration, setDuration] = useState<DurationId>('month')

  const paidPlans = PLANS.filter((p) => p.id !== 'decouverte')
  const freePlan = PLANS.find((p) => p.id === 'decouverte')!

  // For each paid plan, compute the weekly price for the "Pass urgence" zone.
  const oasisWeekly = PLANS.find((p) => p.id === 'oasis')?.price.week ?? 0
  const wellnessWeekly = PLANS.find((p) => p.id === 'wellness')?.price.week ?? 0

  return (
    <section id="tarifs" className="relative py-20 sm:py-28">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-background via-secondary/30 to-background" />
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow={t('pricingEyebrow')}
          title={<>{t('pricingTitle')}</>}
        />

        {/* Duration toggle — 3 main durations only (Mensuel / Saison / Annuel) */}
        <Reveal delay={0.1} className="mt-10">
          <div className="mx-auto flex w-fit flex-wrap items-center justify-center gap-1 rounded-full border border-white/40 bg-white/60 p-1 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04]">
            {MAIN_DURATIONS.map((d) => {
              const active = duration === d.id
              return (
                <button
                  key={d.id}
                  onClick={() => setDuration(d.id)}
                  className={`relative rounded-full px-4 py-2 text-xs font-semibold transition-colors sm:text-sm ${
                    active ? 'text-[oklch(0.99_0.01_195)]' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="duration-pill"
                      className="absolute inset-0 -z-10 rounded-full bg-gradient-to-r from-gold via-[oklch(0.65_0.11_195)] to-[oklch(0.55_0.10_195)] shadow-md shadow-gold/30"
                      transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                    />
                  )}
                  <span className="relative flex items-center gap-1.5">
                    {tPlans(DURATION_LABEL_KEY[d.id])}
                    {'save' in d && d.save && (
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
                          active ? 'bg-white/25 text-[oklch(0.99_0.01_195)]' : 'bg-gold/15 text-gold'
                        }`}
                      >
                        -{d.save}
                      </span>
                    )}
                  </span>
                </button>
              )
            })}
          </div>
        </Reveal>

        {/* Pass urgence — secondary zone (weekly) */}
        <Reveal delay={0.12} className="mt-5">
          <button
            type="button"
            onClick={() => setDuration('week')}
            className={`mx-auto flex w-full max-w-3xl flex-col items-center gap-3 rounded-2xl border p-4 text-center backdrop-blur-xl transition-all sm:flex-row sm:text-left ${
              duration === 'week'
                ? 'border-primary/60 bg-primary/10 shadow-lg shadow-primary/20'
                : 'border-primary/30 bg-primary/[0.04] hover:border-primary/50 hover:bg-primary/[0.07]'
            }`}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-display text-sm font-bold">{tPlans('emergencyPass')}</span>
                {duration === 'week' && (
                  <span className="rounded-full bg-primary px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-primary-foreground">
                    {tPlans('week')}
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {tPlans('perWeek')} · Oasis {oasisWeekly.toLocaleString(locale)} € · Wellness {wellnessWeekly.toLocaleString(locale)} €
              </p>
            </div>
            <span
              className={`rounded-full px-4 py-1.5 text-xs font-bold transition-colors ${
                duration === 'week'
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-primary/40 bg-background text-primary hover:bg-primary/10'
              }`}
            >
              {duration === 'week' ? t('pricingCtaAccess') : tPlans('discover')}
            </span>
          </button>
        </Reveal>

        {/* Paid plan cards */}
        <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
          {paidPlans.map((plan, idx) => {
            const isHighlighted = !!plan.highlighted || plan.id === 'oasis'
            const price = plan.price[duration]
            const suffix = tPlans(DURATION_SUFFIX_KEY[duration])
            const planName = tPlans(`${plan.id}.name`)
            const planTagline = tPlans(`${plan.id}.tagline`)
            const planFeatures = Object.values(tPlans.raw(`${plan.id}.features`) as Record<string, string>)
            return (
              <Reveal key={plan.id} delay={idx * 0.08}>
                <div
                  className={`relative h-full overflow-hidden rounded-2xl backdrop-blur-xl transition-all duration-300 ${
                    isHighlighted
                      ? 'border-2 border-gold/60 bg-gradient-to-br from-gold/[0.12] via-white/60 to-white/40 shadow-[0_25px_60px_-20px_oklch(0.65_0.11_195/0.5)] md:-translate-y-3 md:scale-[1.03] dark:via-white/[0.04] dark:to-white/[0.02]'
                      : 'border border-white/40 bg-white/60 hover:-translate-y-1 hover:shadow-xl dark:border-white/10 dark:bg-white/[0.03]'
                  }`}
                >
                  {isHighlighted && (
                    <>
                      <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent" />
                      <span className="absolute -right-12 top-5 rotate-45 bg-gradient-to-r from-gold to-[oklch(0.55_0.10_195)] px-12 py-1 text-center text-[10px] font-bold uppercase tracking-widest text-[oklch(0.99_0.01_195)] shadow-md">
                        {tPlans('popular')}
                      </span>
                      <div className="pointer-events-none absolute -inset-1 -z-10 rounded-2xl bg-gold/10 blur-2xl" />
                    </>
                  )}

                  <div className="p-6">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl" aria-hidden="true">
                        {plan.icon}
                      </span>
                      <h3 className="font-display text-xl font-bold">{planName}</h3>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{planTagline}</p>

                    {/* Price — crossfade */}
                    <div className="mt-5 flex items-baseline gap-1">
                      <AnimatePresence mode="wait">
                        <motion.span
                          key={`${plan.id}-${duration}`}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.25 }}
                          className="font-display text-4xl font-bold"
                        >
                          {price === 0 ? t('pricingFree') : `${price.toLocaleString(locale)} €`}
                        </motion.span>
                      </AnimatePresence>
                      {price !== 0 && (
                        <span className="text-xs text-muted-foreground">{suffix}</span>
                      )}
                    </div>

                    <button
                      onClick={onEnterApp}
                      className={`mt-5 flex w-full items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold transition-all ${
                        isHighlighted
                          ? 'bg-gradient-to-r from-gold via-[oklch(0.65_0.11_195)] to-[oklch(0.55_0.10_195)] text-[oklch(0.99_0.01_195)] shadow-lg shadow-gold/30 hover:scale-[1.02] hover:shadow-[0_0_40px_-6px_oklch(0.65_0.11_195/0.6)]'
                          : 'border border-primary/30 bg-primary/5 text-foreground hover:border-primary/60 hover:bg-primary/10'
                      }`}
                    >
                      {hasProfile ? t('pricingCtaAccess') : t('pricingCtaStart')}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>

                    <ul className="mt-5 space-y-2">
                      {planFeatures.map((f) => (
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
              </Reveal>
            )
          })}
        </div>

        {/* Découverte plan — smaller below */}
        <Reveal delay={0.1} className="mt-5">
          <div className="mx-auto flex max-w-3xl flex-col items-center justify-between gap-4 rounded-2xl border border-white/40 bg-white/40 p-5 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.03] sm:flex-row">
            <div className="flex items-center gap-3">
              <span className="text-2xl" aria-hidden="true">
                {freePlan.icon}
              </span>
              <div>
                <p className="font-display text-base font-bold">
                  {tPlans('decouverte.name')} <span className="text-gold">{t('pricingFreeDash')}</span>
                </p>
                <p className="text-xs text-muted-foreground">{tPlans('decouverte.tagline')}</p>
              </div>
            </div>
            <button
              onClick={onEnterApp}
              className="rounded-full border border-border bg-background px-5 py-2 text-sm font-semibold transition-colors hover:border-gold/50 hover:text-gold"
            >
              {tPlans('discover')}
            </button>
          </div>
        </Reveal>

        {/* Trust row */}
        <Reveal delay={0.1} className="mt-6">
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
            {[
              { icon: RotateCcw, label: tPlans('noCommitment') },
              { icon: Lock, label: tPlans('securePayment') },
              { icon: ShieldCheck, label: tPlans('cancelAnytime') },
              { icon: Sparkles, label: tPlans('privateData') },
            ].map((trust) => {
              const Icon = trust.icon
              return (
                <span key={trust.label} className="inline-flex items-center gap-1.5">
                  <Icon className="h-3.5 w-3.5 text-gold" />
                  {trust.label}
                </span>
              )
            })}
          </div>
        </Reveal>

        <Reveal delay={0.1} className="mt-6 text-center">
          <button
            onClick={() => scrollToId('comparatif')}
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            {t('pricingCompareCta')}
          </button>
        </Reveal>
      </div>
    </section>
  )
}
