'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, ShieldCheck, Lock, RotateCcw, Sparkles, ArrowRight } from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'
import { PLANS, DURATIONS } from '@/lib/pool/freemium'
import { getPriceAdvantage } from '@/lib/billing/plans'
import { Reveal, SectionHeading, scrollToId } from '../landing-utils'

interface PricingProps {
  hasProfile: boolean
  onEnterApp: () => void
}

type DurationId = (typeof DURATIONS)[number]['id']

const DURATION_SUFFIX_KEY: Record<DurationId, string> = {
  month: 'perMonth',
  quarter: 'perQuarter',
  halfyear: 'perHalfyear',
  year: 'perYear',
}

export function Pricing({ hasProfile, onEnterApp }: PricingProps) {
  const t = useTranslations('landing')
  const tPlans = useTranslations('plans')
  const locale = useLocale()

  const [duration, setDuration] = useState<DurationId>('halfyear')

  const paidPlans = PLANS.filter((p) => p.id !== 'decouverte')
  const freePlan = PLANS.find((p) => p.id === 'decouverte')!

  return (
    <section id="tarifs" className="relative py-20 sm:py-28">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-background via-secondary/30 to-background" />
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow={t('pricingEyebrow')}
          title={<>{t('pricingTitle')}</>}
        />

        <div className="mx-auto mt-8 flex max-w-2xl flex-wrap items-center justify-center gap-2 rounded-2xl border border-border/60 bg-background/70 p-2 shadow-sm backdrop-blur-xl">
          {DURATIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setDuration(option.id)}
              className={`relative rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                duration === option.id
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              }`}
            >
              {tPlans(option.labelKey)}
              {option.id === 'halfyear' && (
                <span className="absolute -right-2 -top-3 rounded-full bg-gold px-2 py-0.5 text-[9px] font-bold uppercase text-white">
                  {tPlans('bestValue')}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Paid plan cards */}
        <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
          {paidPlans.map((plan, idx) => {
            const isHighlighted = !!plan.highlighted || plan.id === 'oasis'
            const price = plan.price[duration]
            const suffix = tPlans(DURATION_SUFFIX_KEY[duration])
            const planName = tPlans(`${plan.id}.name`)
            const planTagline = tPlans(`${plan.id}.tagline`)
            const planFeatures = Object.values(tPlans.raw(`${plan.id}.features`) as Record<string, string>)
            const advantage = getPriceAdvantage(plan, duration)
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
                    {duration !== 'month' && (
                      <div className="mt-3 rounded-xl bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300">
                        <p className="font-bold">
                          {tPlans('savePercent', { percent: advantage.savedPercent })}
                          {advantage.freeMonths >= 0.9 && (
                            <> · {tPlans('freeMonths', { months: Math.round(advantage.freeMonths) })}</>
                          )}
                        </p>
                        <p className="mt-0.5 opacity-80">
                          {tPlans('monthlyEquivalent', {
                            price: advantage.monthlyEquivalent.toLocaleString(locale, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            }),
                          })}
                        </p>
                      </div>
                    )}

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
