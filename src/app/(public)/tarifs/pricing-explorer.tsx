'use client'

/**
 * AQWELIA Tarifs — Interactive pricing explorer (client island).
 *
 * Renders the four B2C launch offers (Free / Pool / Spa / Complete). Prices are
 * derived from `src/lib/pool/freemium.ts` PLANS so the page stays in sync with
 * the canonical pricing model.
 *
 * Selection state is local (no URL sync) and only drives the displayed price
 * per plan. The CTA links to /#tarifs (the landing anchor where checkout is
 * triggered) so we don't duplicate the Stripe flow here.
 */
import Link from 'next/link'
import { useTranslations, useLocale } from 'next-intl'
import { Check, ArrowRight } from 'lucide-react'
import { PLANS, type PlanId } from '@/lib/pool/freemium'

export function PricingExplorer() {
  const t = useTranslations('tarifs')
  const tPlan = useTranslations('plans')
  const locale = useLocale()
  const duration = 'month' as const

  function formatPrice(value: number) {
    if (value === 0) return '0'
    return new Intl.NumberFormat(locale === 'fr' ? 'fr-FR' : 'en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }

  return (
    <div>
      {/* Plans grid */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {PLANS.map((plan) => {
          const isFree = plan.id === 'decouverte'
          const price = plan.price[duration]
          const suffix = isFree ? t('suffixFree') : t('suffixMonth')
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

    </div>
  )
}
