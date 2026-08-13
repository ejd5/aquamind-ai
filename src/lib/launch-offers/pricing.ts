/**
 * AQWELIA Launch offers — pricing (spec v1.0 §2).
 *
 * Règles de prix pures, en unités mineures entières (cents). Les prix de base
 * proviennent du catalogue (plans.ts) : P = prix mensuel standard, Q = prix
 * trimestriel standard, dans une même devise/canal. Aucun montant n'est codé en
 * dur. L'arrondi "fournisseur" est simulé ici par l'arrondi au centime le plus
 * proche ; la valeur réelle doit être celle retournée par le store.
 */

import { getPlan } from '@/lib/billing/plans'
import type { PlanId } from '@/lib/billing/plans'
import { LAUNCH_OFFER_A_CODE, LAUNCH_OFFER_B_CODE } from './config'

/** Convertit un prix EUR (float) en unités mineures entières (cents). */
export function toMinorUnits(eur: number): number {
  return Math.round(eur * 100)
}

/** Prix mensuel standard (cents) du forfait, ou null si non vendu. */
export function monthlyMinor(planId: PlanId): number | null {
  const plan = getPlan(planId)
  if (!plan || plan.id === 'decouverte') return null
  const m = plan.price.month
  return m > 0 ? toMinorUnits(m) : null
}

/** Prix trimestriel standard (cents) du forfait, ou null si non vendu. */
export function quarterlyMinor(planId: PlanId): number | null {
  const plan = getPlan(planId)
  if (!plan || plan.id === 'decouverte') return null
  const q = plan.price.quarter
  return q > 0 ? toMinorUnits(q) : null
}

export interface LaunchPricing {
  offerCode: string
  planId: PlanId
  currency: string
  dueNowMinor: number
  renewalMinor: number
  renewalPeriod: string // P1M | P3M
}

/**
 * Calcule le prix de lancement pour une variante.
 *   - LAUNCH50_MONTHLY : 50 % du prix mensuel une fois, puis prix mensuel.
 *   - LAUNCH3FOR2_QUARTERLY : 2 × prix mensuel immédiat, puis prix trimestriel.
 * Retourne null si le forfait n'est pas vendu dans les durées requises.
 */
export function computeLaunchPricing(offerCode: string, planId: PlanId): LaunchPricing | null {
  if (offerCode === LAUNCH_OFFER_A_CODE) {
    const p = monthlyMinor(planId)
    if (p === null) return null
    return {
      offerCode,
      planId,
      currency: 'EUR',
      // Stripe applique un coupon de 50 % au montant en centimes et arrondit
      // la remise au centime supérieur. Pour un prix impair (ex. 699), le
      // total encaissé est donc 349 et non 350.
      dueNowMinor: p - Math.round(p * 0.5),
      renewalMinor: p,
      renewalPeriod: 'P1M',
    }
  }
  if (offerCode === LAUNCH_OFFER_B_CODE) {
    const p = monthlyMinor(planId)
    const q = quarterlyMinor(planId)
    if (p === null || q === null) return null
    return {
      offerCode,
      planId,
      currency: 'EUR',
      dueNowMinor: p * 2,
      renewalMinor: q,
      renewalPeriod: 'P3M',
    }
  }
  return null
}

export interface MarketingConsistency {
  valid: boolean
  labelA50: boolean
  labelB3for2: boolean
  reasons: string[]
}

/**
 * Contrôle de cohérence marketing (spec §2) :
 *   - l'étiquette « −50 % » n'est autorisée que si la remise effective est entre
 *     49,5 % et 50,5 % ;
 *   - l'étiquette « 3 mois au prix de 2 » n'est autorisée que si le prix initial
 *     est équivalent à 2 × P (après arrondi).
 * Si un store impose un palier empêchant l'équivalence, l'interface affiche les
 * montants réels sans pourcentage.
 */
export function marketingConsistency(planId: PlanId): MarketingConsistency {
  const p = monthlyMinor(planId)
  const reasons: string[] = []
  if (p === null) {
    return { valid: false, labelA50: false, labelB3for2: false, reasons: ['plan_not_sold_monthly'] }
  }
  const offerA = computeLaunchPricing(LAUNCH_OFFER_A_CODE, planId)
  const offerB = computeLaunchPricing(LAUNCH_OFFER_B_CODE, planId)

  const ratioA = offerA ? offerA.dueNowMinor / p : NaN
  const labelA50 = !Number.isNaN(ratioA) && ratioA >= 0.495 && ratioA <= 0.505
  if (!labelA50) reasons.push('offer_a_discount_not_50')

  const labelB3for2 = offerB ? offerB.dueNowMinor === p * 2 : false
  if (!labelB3for2) reasons.push('offer_b_not_equivalent_2_months')

  return { valid: labelA50 && labelB3for2, labelA50, labelB3for2, reasons }
}
