'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowRight,
  BadgeCheck,
  Check,
  CreditCard,
  Lock,
  RotateCcw,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
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

const PLAN_ACCENTS: Record<string, string> = {
  oasis: 'from-cyan-400 via-teal-500 to-emerald-500',
  spa365: 'from-rose-300 via-orange-400 to-amber-400',
  wellness: 'from-indigo-400 via-violet-500 to-fuchsia-500',
}

export function Pricing({ hasProfile, onEnterApp }: PricingProps) {
  const t = useTranslations('landing')
  const tPlans = useTranslations('plans')
  const locale = useLocale()
  const [duration, setDuration] = useState<DurationId>('halfyear')

  const paidPlans = ['oasis', 'spa365', 'wellness'].map((id) => PLANS.find((plan) => plan.id === id)!)
  const freePlan = PLANS.find((plan) => plan.id === 'decouverte')!
  const freeFeatures = Object.values(
    tPlans.raw('decouverte.features') as Record<string, string>
  ).slice(0, 6)

  return (
    <section id="tarifs" className="relative overflow-hidden py-20 sm:py-28">
      <div className="pointer-events-none absolute inset-0 -z-20 bg-gradient-to-b from-background via-secondary/35 to-background" />
      <div className="pointer-events-none absolute left-1/2 top-40 -z-10 h-[34rem] w-[70rem] -translate-x-1/2 rounded-full bg-primary/[0.07] blur-3xl" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeading eyebrow={t('pricingEyebrow')} title={<>{t('pricingTitle')}</>} />
        <p className="mx-auto mt-4 max-w-2xl text-center text-sm leading-6 text-muted-foreground sm:text-base">
          {tPlans('pricingIntro')}
        </p>

        <Reveal className="mt-10">
          <div className="mx-auto max-w-3xl rounded-[1.75rem] border border-primary/15 bg-background/80 p-2 shadow-[0_18px_70px_-35px_rgba(13,148,136,0.45)] backdrop-blur-xl">
            <div className="grid grid-cols-4 gap-1.5">
              {DURATIONS.map((option) => {
                const selected = duration === option.id
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setDuration(option.id)}
                    className={`relative min-h-[4.25rem] overflow-hidden rounded-2xl px-2 py-2 text-center transition-colors sm:px-4 ${
                      selected ? 'text-primary-foreground' : 'text-muted-foreground hover:bg-primary/5 hover:text-foreground'
                    }`}
                  >
                    {selected && (
                      <motion.span
                        layoutId="pricing-duration"
                        className="absolute inset-0 -z-10 bg-gradient-to-br from-primary to-teal-700 shadow-lg"
                        transition={{ type: 'spring', stiffness: 380, damping: 34 }}
                      />
                    )}
                    <span className="block text-sm font-extrabold sm:text-base">{tPlans(option.labelKey)}</span>
                    <span className={`mt-1 block text-[9px] font-bold uppercase tracking-[0.12em] sm:text-[10px] ${selected ? 'text-white/75' : 'text-muted-foreground/70'}`}>
                      {option.id === 'halfyear' ? tPlans('bestValue') : tPlans(`durationHint.${option.id}`)}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
          <p className="mt-3 text-center text-xs text-muted-foreground">{tPlans('billingNote')}</p>
        </Reveal>

        <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {paidPlans.map((plan, idx) => {
            const price = plan.price[duration]
            const suffix = tPlans(DURATION_SUFFIX_KEY[duration])
            const planName = tPlans(`${plan.id}.name`)
            const planTagline = tPlans(`${plan.id}.tagline`)
            const planFeatures = Object.values(tPlans.raw(`${plan.id}.features`) as Record<string, string>)
            const visibleFeatures = planFeatures.slice(0, 8)
            const advantage = getPriceAdvantage(plan, duration)
            const isPopular = plan.id === 'oasis'

            return (
              <motion.article
                key={plan.id}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.55, delay: idx * 0.08 }}
                whileHover={{ y: -8 }}
                className={`group relative flex h-full flex-col overflow-hidden rounded-[2rem] border bg-background/88 shadow-[0_24px_70px_-42px_rgba(15,118,110,0.55)] backdrop-blur-xl transition-shadow hover:shadow-[0_32px_90px_-38px_rgba(15,118,110,0.62)] ${
                  isPopular ? 'border-primary/55 ring-1 ring-primary/20' : 'border-primary/20'
                }`}
              >
                <div className={`h-1.5 bg-gradient-to-r ${PLAN_ACCENTS[plan.id]}`} />
                <div className="flex flex-1 flex-col p-6 sm:p-8">
                  <div className="flex min-h-8 items-center justify-between gap-3">
                    <span className="text-[10px] font-black uppercase tracking-[0.22em] text-primary/70">AQWELIA</span>
                    {isPopular && (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-primary">
                        <BadgeCheck className="h-3.5 w-3.5" />
                        {tPlans('popular')}
                      </span>
                    )}
                  </div>

                  <div className="mt-4 flex items-start gap-3">
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-primary/10 bg-primary/[0.06] text-2xl shadow-inner" aria-hidden="true">
                      {plan.icon}
                    </span>
                    <div>
                      <h3 className="font-display text-3xl font-black tracking-tight text-foreground">{planName}</h3>
                      <p className="mt-1 text-sm leading-5 text-muted-foreground">{planTagline}</p>
                    </div>
                  </div>

                  <div className="mt-7 border-y border-border/60 py-6">
                    <div className="flex items-end gap-2">
                      <AnimatePresence mode="wait">
                        <motion.span
                          key={`${plan.id}-${duration}`}
                          initial={{ opacity: 0, y: 12, filter: 'blur(4px)' }}
                          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                          exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
                          transition={{ duration: 0.22 }}
                          className="font-display text-5xl font-black leading-none tracking-[-0.04em] text-foreground"
                        >
                          {price.toLocaleString(locale)} €
                        </motion.span>
                      </AnimatePresence>
                      <span className="pb-1 text-xs font-semibold text-muted-foreground">{suffix}</span>
                    </div>

                    {duration !== 'month' ? (
                      <div className="mt-4 rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.08] p-3.5 text-emerald-800 dark:text-emerald-200">
                        <p className="text-sm font-extrabold">
                          {tPlans('savePercent', { percent: advantage.savedPercent })}
                          {advantage.freeMonths >= 0.9 && <> · {tPlans('freeMonths', { months: Math.round(advantage.freeMonths) })}</>}
                        </p>
                        <p className="mt-1 text-xs opacity-80">
                          {tPlans('monthlyEquivalent', {
                            price: advantage.monthlyEquivalent.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
                          })}
                        </p>
                      </div>
                    ) : (
                      <p className="mt-4 text-xs text-muted-foreground">{tPlans('monthlyFreedom')}</p>
                    )}
                  </div>

                  <button
                    onClick={onEnterApp}
                    className={`mt-6 flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-extrabold transition-all duration-300 active:scale-[0.98] ${
                      isPopular
                        ? 'bg-gradient-to-r from-primary to-teal-700 text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30'
                        : 'border border-primary/25 bg-primary/[0.06] text-foreground hover:border-primary/50 hover:bg-primary/[0.11]'
                    }`}
                  >
                    {hasProfile ? t('pricingCtaAccess') : t('pricingCtaStart')}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </button>

                  <div className="mt-7 flex-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">{tPlans('included')}</p>
                    <ul className="mt-4 space-y-3">
                      {visibleFeatures.map((feature) => (
                        <li key={feature} className="flex items-start gap-2.5 text-sm leading-5 text-foreground/82">
                          <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary/10">
                            <Check className="h-3 w-3 text-primary" />
                          </span>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    {planFeatures.length > visibleFeatures.length && (
                      <p className="mt-4 text-xs font-bold text-primary">{tPlans('moreBenefits', { count: planFeatures.length - visibleFeatures.length })}</p>
                    )}
                  </div>
                </div>
              </motion.article>
            )
          })}
        </div>

        <Reveal delay={0.08} className="mt-10">
          <div className="relative overflow-hidden rounded-[2rem] border border-primary/20 bg-gradient-to-br from-background via-primary/[0.045] to-cyan-400/[0.08] p-6 shadow-[0_24px_80px_-50px_rgba(15,118,110,0.65)] sm:p-9">
            <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
            <div className="relative grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-background/70 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-primary">
                  <Sparkles className="h-3.5 w-3.5" /> {tPlans('freeForever')}
                </span>
                <div className="mt-5 flex items-end gap-3">
                  <span className="font-display text-4xl font-black tracking-tight">{tPlans('decouverte.name')}</span>
                  <span className="pb-1 font-display text-3xl font-black text-primary">0 €</span>
                </div>
                <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">{tPlans('freeExplanation')}</p>
                <div className="mt-5 flex flex-wrap gap-2 text-xs font-bold text-foreground/75">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/75 px-3 py-2"><CreditCard className="h-3.5 w-3.5 text-primary" />{tPlans('noCardRequired')}</span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/75 px-3 py-2"><ShieldCheck className="h-3.5 w-3.5 text-primary" />{tPlans('freeNotTrial')}</span>
                </div>
                <button onClick={onEnterApp} className="mt-6 inline-flex items-center gap-2 rounded-2xl border border-primary/30 bg-background px-5 py-3 text-sm font-extrabold text-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-lg">
                  {tPlans('discover')} <ArrowRight className="h-4 w-4" />
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {freeFeatures.map((feature) => (
                  <div key={feature} className="flex items-start gap-3 rounded-2xl border border-white/70 bg-white/65 p-3.5 text-sm leading-5 text-foreground/80 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.1} className="mt-8">
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-xs text-muted-foreground">
            {[
              { icon: RotateCcw, label: tPlans('noCommitment') },
              { icon: Lock, label: tPlans('securePayment') },
              { icon: ShieldCheck, label: tPlans('cancelAnytime') },
              { icon: Sparkles, label: tPlans('privateData') },
            ].map((trust) => {
              const Icon = trust.icon
              return <span key={trust.label} className="inline-flex items-center gap-1.5"><Icon className="h-3.5 w-3.5 text-primary" />{trust.label}</span>
            })}
          </div>
        </Reveal>

        <Reveal delay={0.1} className="mt-6 text-center">
          <button onClick={() => scrollToId('comparatif')} className="text-sm font-bold text-primary underline-offset-4 hover:underline">
            {t('pricingCompareCta')}
          </button>
        </Reveal>
      </div>
    </section>
  )
}
