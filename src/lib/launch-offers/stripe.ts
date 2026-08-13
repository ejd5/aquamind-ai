/**
 * AQWELIA Launch offers — mapping Stripe (Web, spec v1.0 §2/§4).
 *
 * Les identifiants Stripe (price ID + coupon ID) sont résolus CÔTÉ SERVEUR à
 * partir du catalogue (plans.ts → STRIPE_PRICES) et de variables d'environnement
 * dédiées. Le navigateur ne fournit jamais de montant ni de price ID.
 *
 * - LAUNCH50_MONTHLY : abonnement mensuel (priceId mensuel du plan) + coupon
 *   « −50 % la 1re fois » → dueNow = 0,5 × P puis renouvellement mensuel P.
 * - LAUNCH3FOR2_QUARTERLY : abonnement trimestriel (priceId trimestriel du plan)
 *   + coupon « 3 mois au prix de 2 » → dueNow = 2 × P puis renouvellement
 *   trimestriel Q.
 *
 * La cohérence des montants est vérifiée au webhook via `computeLaunchPricing`
 * (jamais de montant client).
 */
import { STRIPE_PRICES, type StripeProductId } from '@/lib/stripe'
import { computeLaunchPricing } from './pricing'
import type { PlanId } from '@/lib/billing/plans'
import { LAUNCH_OFFER_A_CODE, LAUNCH_OFFER_B_CODE } from './config'

export interface LaunchStripeConfig {
  /** Price ID Stripe de l'abonnement sous-jacent (mensuel ou trimestriel). */
  priceId: string
  /** Coupon Stripe appliqué à la première facture — OBLIGATOIRE pour une offre. */
  couponId: string
  /** Montant dû immédiatement (cents) — depuis le pricing serveur. */
  dueNowMinor: number
  /** Montant de renouvellement (cents) — depuis le pricing serveur. */
  renewalMinor: number
  renewalPeriod: string
  currency: string
}

/**
 * Résout la configuration Stripe d'une offre de lancement pour un forfait.
 * Retourne null si le forfait n'est pas vendu dans la durée requise, si le
 * price ID du catalogue n'est pas configuré, ou si le COUPON Stripe est absent
 * ou vide (aucune session sans coupon : l'offre ne doit jamais être émise à
 * plein tarif).
 */
export function getLaunchStripeConfig(offerCode: string, planId: PlanId): LaunchStripeConfig | null {
  const pricing = computeLaunchPricing(offerCode, planId)
  if (!pricing) return null

  // Le price ID provient du catalogue (plans.ts → STRIPE_PRICES), jamais d'une
  // valeur fournie par le navigateur.
  const durationKey = offerCode === LAUNCH_OFFER_B_CODE ? 'quarterly' : 'monthly'
  const productId = `${planId}_${durationKey}` as StripeProductId
  const priceId = STRIPE_PRICES[productId] || ''
  if (!priceId) return null

  // Coupon OBLIGATOIRE : lu depuis la variable dédiée de l'offre, trimé.
  let raw: string | undefined
  if (offerCode === LAUNCH_OFFER_A_CODE) {
    raw = process.env.AQWELIA_LAUNCH_STRIPE_COUPON_LAUNCH50_MONTHLY
  } else if (offerCode === LAUNCH_OFFER_B_CODE) {
    raw = process.env.AQWELIA_LAUNCH_STRIPE_COUPON_LAUNCH3FOR2_QUARTERLY
  }
  const couponId = raw?.trim() ?? ''
  if (!couponId) return null

  return {
    priceId,
    couponId,
    dueNowMinor: pricing.dueNowMinor,
    renewalMinor: pricing.renewalMinor,
    renewalPeriod: pricing.renewalPeriod,
    currency: pricing.currency,
  }
}

/** Vrai si la config Stripe de l'offre est complète pour ce forfait. */
export function isLaunchStripeConfigured(offerCode: string, planId: PlanId): boolean {
  return getLaunchStripeConfig(offerCode, planId) !== null
}
