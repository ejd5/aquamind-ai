'use client'

/**
 * AQWELIA Tarifs — Interactive pricing explorer (client island).
 *
 * Renders the 3 B2C plans (Découverte / Oasis / Wellness) with a duration
 * selector (Mensuel / Saison / Annuel) + a "Pass urgence" toggle. Prices are
 * derived from `src/lib/pool/freemium.ts` PLANS so the page stays in sync with
 * the canonical pricing model.
 *
 * Selection state is local (no URL sync) and only drives the displayed price
 * per plan. The CTA links to /#tarifs (the landing anchor where checkout is
 * triggered) so we don't duplicate the Stripe flow here.
 */
import { useState } from 'react'
import Link from 'next/link'
import { useTranslations, useLocale } from 'next-intl'
import { Check, ArrowRight, Sparkles } from 'lucide-react'
import { PLANS, type PlanId } from '@/lib/pool/freemium'

type DurationKey = 'month' | 'halfyear' | 'year'

const DURATION_OPTIONS: { id: DurationKey; save?: string }[] = [
  { id: 'month' },
  { id: 'halfyear', save: '20%' },
  { id: 'year', save: '30%' },
]

export function PricingExplorer() {
  const t = useTranslations('tarifs')
  const tPlan = useTranslations('plans')
  const locale = useLocale()
  const [duration, setDuration] = useState<DurationKey>('month')

  function formatPrice(value: number) {
    if (value === 0) return '0'
    return new Intl.NumberFormat(locale === 'fr' ? 'fr-FR' : 'en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }

  function priceSuffix(d: DurationKey) {
    if (d === 'month') return t('suffixMonth')
    if (d === 'halfyear') return t('suffixHalfyear')
    return t('suffixYear')
  }

  return (
    <div>
      {/* Duration selector */}
      <div className="mb-10 flex flex-col items-center gap-3">
        <span className="section-label">{t('durationLabel')}</span>
        <div className="inline-flex items-center rounded-full border border-gold/30 bg-white/60 p-1 backdrop-blur-md dark:bg-white/[0.04]">
          {DURATION_OPTIONS.map((opt) => {
            const active = duration === opt.id
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setDuration(opt.id)}
                className={`relative inline-flex items-center gap-2 rounded-full px-5 py-2 text-xs font-bold transition-all ${
                  active
                    ? 'bg-gradient-to-r from-gold via-[oklch(0.65_0.11_195)] to-[oklch(0.55_0.10_195)] text-[oklch(0.99_0.01_195)] shadow-md'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                aria-pressed={active}
              >
                <span>{t(`duration_${opt.id}` as const)}</span>
                {opt.save && (
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                      active ? 'bg-white/30 text-[oklch(0.99_0.01_195)]' : 'bg-gold/15 text-gold'
                    }`}
                  >
                    -{opt.save}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Plans grid */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {PLANS.map((plan) => {
          const isFree = plan.id === 'decouverte'
          const price = plan.price[duration]
          const suffix = isFree ? t('suffixFree') : priceSuffix(duration)
          const highlighted = plan.highlighted
          // Use translated name/tagline from `plans` namespace (legacy keys
          // decouverte.name, oasis.name, wellness.name exist).
          const name = tPlan(`${plan.id}.name` as const)
          const tagline = tPlan(`${plan.id}.tagline` as const)
          const cta = isFree ? t('ctaFree') : t('ctaPaid')

          return (
            <div
              key={plan.id}
              className={`glass-card relative flex flex-col rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 sm:p-8 ${
                highlighted ? 'ring-2 ring-gold shadow-lg shadow-primary/15' : ''
              }`}
            >
              {highlighted && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-gold to-[oklch(0.55_0.10_195)] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[oklch(0.99_0.01_195)] shadow-md">
                  {t('badgePopular')}
                </span>
              )}

              {/* Icon + name */}
              <div className="flex items-center gap-3">
                <span className="text-3xl" aria-hidden>{plan.icon}</span>
                <div>
                  <h3 className="font-display text-xl font-bold tracking-tight text-foreground">{name}</h3>
                  <p className="text-xs text-muted-foreground">{tagline}</p>
                </div>
              </div>

              {/* Price */}
              <div className="mt-6 flex items-baseline gap-1.5">
                <span className="font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
                  {formatPrice(price)}
                </span>
                <span className="text-xl font-bold text-gold">€</span>
                <span className="ml-1 text-xs text-muted-foreground">{suffix}</span>
              </div>

              {/* CTA */}
              <Link
                href="/#tarifs"
                className={`mt-6 inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-bold transition-all ${
                  highlighted
                    ? 'glow-gold bg-gradient-to-r from-gold via-[oklch(0.65_0.11_195)] to-[oklch(0.55_0.10_195)] text-[oklch(0.99_0.01_195)] shadow-lg shadow-primary/20 hover:scale-[1.03]'
                    : 'border border-gold/40 bg-gold/10 text-gold hover:bg-gold/20'
                }`}
              >
                {cta}
                <ArrowRight className="h-4 w-4" />
              </Link>

              {/* Features */}
              <ul className="mt-6 space-y-2.5">
                {plan.featureKeys.map((key) => (
                  <li key={key} className="flex items-start gap-2.5 text-xs text-muted-foreground">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" />
                    <span>{tPlan(key as `${PlanId}.features.${string}`)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>

      {/* Pass urgence card */}
      <div className="mt-8 glass-card relative overflow-hidden rounded-2xl p-6 sm:p-8">
        <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent" />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gold/10 text-gold">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display text-xl font-bold tracking-tight text-foreground">
                {t('passUrgencyTitle')}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">{t('passUrgencyDesc')}</p>
              <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
                {[t('passUrgencyB1'), t('passUrgencyB2'), t('passUrgencyB3')].map((b) => (
                  <li key={b} className="flex items-center gap-1.5">
                    <Check className="h-3 w-3 shrink-0 text-gold" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="shrink-0 text-right sm:text-left">
            <div className="flex items-baseline gap-1.5">
              <span className="font-display text-3xl font-bold tracking-tight text-foreground">
                {formatPrice(PLANS[1].price.week)}
              </span>
              <span className="text-lg font-bold text-gold">€</span>
              <span className="ml-1 text-xs text-muted-foreground">{t('suffixWeek')}</span>
            </div>
            <Link
              href="/#tarifs"
              className="mt-3 inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-5 py-2.5 text-xs font-semibold text-gold transition-colors hover:bg-gold/20"
            >
              {t('passUrgencyCta')}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
