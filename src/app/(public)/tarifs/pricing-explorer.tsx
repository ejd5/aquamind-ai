'use client'

import Link from 'next/link'
import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, BadgeCheck, Check, CreditCard, Loader2, ShieldCheck, Sparkles } from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'
import { PLANS, DURATIONS, type PlanId, type Duration } from '@/lib/pool/freemium'
import { getPriceAdvantage, parsePricingSelectionFromParams } from '@/lib/billing/plans'
import { useStripeCheckout } from '@/hooks/use-stripe-checkout'

const PLAN_ACCENTS: Record<string, string> = {
  oasis: 'from-cyan-400 via-teal-500 to-emerald-500',
  spa365: 'from-rose-300 via-orange-400 to-amber-400',
  wellness: 'from-indigo-400 via-violet-500 to-fuchsia-500',
}

function useInitialDuration(): Exclude<Duration, 'week'> {
  // Restore the duration selected before sign-in, if any. Only validated
  // values are accepted; anything else falls back to the default.
  if (typeof window === 'undefined') return 'halfyear'
  const params = new URLSearchParams(window.location.search)
  const restored = parsePricingSelectionFromParams(params.get('plan'), params.get('duration'))
  return restored?.duration ?? 'halfyear'
}

export function PricingExplorer() {
  const t = useTranslations('tarifs')
  const tPlan = useTranslations('plans')
  const locale = useLocale()
  const [duration, setDuration] = useState<Exclude<Duration, 'week'>>(useInitialDuration)
  const { startCheckout, isCheckoutPending } = useStripeCheckout()
  const paidPlans = ['oasis', 'spa365', 'wellness'].map((id) => PLANS.find((plan) => plan.id === id)!)
  const freePlan = PLANS.find((plan) => plan.id === 'decouverte')!

  function formatPrice(value: number) {
    return new Intl.NumberFormat(locale === 'fr' ? 'fr-FR' : 'en-US', {
      minimumFractionDigits: value === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(value)
  }

  return (
    <div>
      <div className="mx-auto max-w-3xl rounded-[1.75rem] border border-primary/15 bg-background/85 p-2 shadow-[0_18px_70px_-35px_rgba(13,148,136,0.45)] backdrop-blur-xl">
        <div className="grid grid-cols-4 gap-1.5">
          {DURATIONS.map((option) => {
            const selected = duration === option.id
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setDuration(option.id)}
                className={`relative min-h-[4.25rem] overflow-hidden rounded-2xl px-2 py-2 transition-colors sm:px-4 ${selected ? 'text-primary-foreground' : 'text-muted-foreground hover:bg-primary/5 hover:text-foreground'}`}
              >
                {selected && <motion.span layoutId="tarifs-duration" className="absolute inset-0 -z-10 bg-gradient-to-br from-primary to-teal-700" transition={{ type: 'spring', stiffness: 380, damping: 34 }} />}
                <span className="block text-sm font-extrabold sm:text-base">{t(`duration_${option.id}`)}</span>
                <span className={`mt-1 block text-[9px] font-bold uppercase tracking-[0.12em] sm:text-[10px] ${selected ? 'text-white/75' : 'text-muted-foreground/70'}`}>
                  {option.id === 'halfyear' ? t('badgeBestValue') : tPlan(`durationHint.${option.id}`)}
                </span>
              </button>
            )
          })}
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-muted-foreground">{tPlan('billingNote')}</p>

      <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {paidPlans.map((plan, index) => {
          const price = plan.price[duration]
          const advantage = getPriceAdvantage(plan, duration)
          const name = tPlan(`${plan.id}.name` as const)
          const tagline = tPlan(`${plan.id}.tagline` as const)
          const visibleFeatures = plan.featureKeys.slice(0, 8)
          const isPopular = plan.id === 'oasis'
          const paidPlanId = plan.id as Exclude<PlanId, 'decouverte'>
          const checkoutPending = isCheckoutPending(paidPlanId, duration)

          return (
            <motion.article
              key={plan.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5, delay: index * 0.08 }}
              whileHover={{ y: -8 }}
              className={`group relative flex h-full flex-col overflow-hidden rounded-[2rem] border bg-background/90 shadow-[0_24px_70px_-42px_rgba(15,118,110,0.55)] backdrop-blur-xl transition-shadow hover:shadow-[0_32px_90px_-38px_rgba(15,118,110,0.62)] ${isPopular ? 'border-primary/55 ring-1 ring-primary/20' : 'border-primary/20'}`}
            >
              <div className={`h-1.5 bg-gradient-to-r ${PLAN_ACCENTS[plan.id]}`} />
              <div className="flex flex-1 flex-col p-6 sm:p-8">
                <div className="flex min-h-8 items-center justify-between gap-3">
                  <span className="text-[10px] font-black uppercase tracking-[0.22em] text-primary/70">AQWELIA</span>
                  {isPopular && <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-primary"><BadgeCheck className="h-3.5 w-3.5" />{t('badgePopular')}</span>}
                </div>

                <div className="mt-4 flex items-start gap-3">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-primary/10 bg-primary/[0.06] text-2xl shadow-inner" aria-hidden>{plan.icon}</span>
                  <div>
                    <h3 className="font-display text-3xl font-black tracking-tight text-foreground">{name}</h3>
                    <p className="mt-1 text-sm leading-5 text-muted-foreground">{tagline}</p>
                  </div>
                </div>

                <div className="mt-7 border-y border-border/60 py-6">
                  <div className="flex items-end gap-2">
                    <AnimatePresence mode="wait">
                      <motion.span key={`${plan.id}-${duration}`} initial={{ opacity: 0, y: 12, filter: 'blur(4px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }} transition={{ duration: 0.22 }} className="font-display text-5xl font-black leading-none tracking-[-0.04em] text-foreground">
                        {formatPrice(price)} €
                      </motion.span>
                    </AnimatePresence>
                    <span className="pb-1 text-xs font-semibold text-muted-foreground">{t(`suffix_${duration}`)}</span>
                  </div>

                  {duration !== 'month' ? (
                    <div className="mt-4 rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.08] p-3.5 text-emerald-800 dark:text-emerald-200">
                      <p className="text-sm font-extrabold">{t('savePercent', { percent: advantage.savedPercent })}{advantage.freeMonths >= 0.9 && <> · {t('freeMonths', { months: Math.round(advantage.freeMonths) })}</>}</p>
                      <p className="mt-1 text-xs opacity-80">{t('monthlyEquivalent', { price: formatPrice(advantage.monthlyEquivalent) })}</p>
                    </div>
                  ) : <p className="mt-4 text-xs text-muted-foreground">{tPlan('monthlyFreedom')}</p>}
                </div>

                <button type="button" onClick={() => startCheckout(paidPlanId, duration)} disabled={checkoutPending} className={`mt-6 inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-extrabold transition-all duration-300 active:scale-[0.98] disabled:cursor-wait disabled:opacity-70 ${isPopular ? 'bg-gradient-to-r from-primary to-teal-700 text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30' : 'border border-primary/25 bg-primary/[0.06] text-foreground hover:border-primary/50 hover:bg-primary/[0.11]'}`}>
                  {t('ctaPaid')} {checkoutPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />}
                </button>

                <div className="mt-7 flex-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">{tPlan('included')}</p>
                  <ul className="mt-4 space-y-3">
                    {visibleFeatures.map((key) => (
                      <li key={key} className="flex items-start gap-2.5 text-sm leading-5 text-foreground/82">
                        <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary/10"><Check className="h-3 w-3 text-primary" /></span>
                        <span>{tPlan(key as `${PlanId}.features.${string}`)}</span>
                      </li>
                    ))}
                  </ul>
                  {plan.featureKeys.length > visibleFeatures.length && <p className="mt-4 text-xs font-bold text-primary">{tPlan('moreBenefits', { count: plan.featureKeys.length - visibleFeatures.length })}</p>}
                </div>
              </div>
            </motion.article>
          )
        })}
      </div>

      <motion.section initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="relative mt-10 overflow-hidden rounded-[2rem] border border-primary/20 bg-gradient-to-br from-background via-primary/[0.045] to-cyan-400/[0.08] p-6 shadow-[0_24px_80px_-50px_rgba(15,118,110,0.65)] sm:p-9">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="relative grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-background/70 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-primary"><Sparkles className="h-3.5 w-3.5" />{tPlan('freeForever')}</span>
            <div className="mt-5 flex items-end gap-3"><h3 className="font-display text-4xl font-black">{tPlan('decouverte.name')}</h3><span className="pb-1 font-display text-3xl font-black text-primary">0 €</span></div>
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">{tPlan('freeExplanation')}</p>
            <div className="mt-5 flex flex-wrap gap-2 text-xs font-bold text-foreground/75">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/75 px-3 py-2"><CreditCard className="h-3.5 w-3.5 text-primary" />{tPlan('noCardRequired')}</span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/75 px-3 py-2"><ShieldCheck className="h-3.5 w-3.5 text-primary" />{tPlan('freeNotTrial')}</span>
            </div>
            <Link href="/#tarifs" className="mt-6 inline-flex items-center gap-2 rounded-2xl border border-primary/30 bg-background px-5 py-3 text-sm font-extrabold shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-lg">{t('ctaFree')} <ArrowRight className="h-4 w-4" /></Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {freePlan.featureKeys.slice(0, 6).map((key) => (
              <div key={key} className="flex items-start gap-3 rounded-2xl border border-white/70 bg-white/65 p-3.5 text-sm leading-5 text-foreground/80 shadow-sm dark:border-white/10 dark:bg-white/[0.04]"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><span>{tPlan(key as `${PlanId}.features.${string}`)}</span></div>
            ))}
          </div>
        </div>
      </motion.section>
    </div>
  )
}
