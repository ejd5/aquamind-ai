/**
 * AQWELIA Launch offers — checkout Web (spec v1.0 §5/§6).
 *
 * Orchestration serveur :
 *   1. vérifie la campagne active ;
 *   2. éligibilité côté serveur (checkEligibility) ;
 *   3. réservation atomique 30 min (createReservation, idempotente) ;
 *   4. résolution Stripe côté serveur (getLaunchStripeConfig) ;
 *   5. création de la session Checkout avec metadata de campagne ;
 *   6. en cas d'échec de session, libération de la réservation.
 *
 * Le navigateur n'envoie que { offerCode, planId, platform, idempotencyKey }.
 * Aucun montant ni price ID ne vient du client.
 */
import { getStripe } from '@/lib/stripe'
import { db } from '@/lib/db'
import type { PlanId } from '@/lib/billing/plans'
import {
  checkEligibility,
  createReservation,
  releaseReservation,
  type EligibilityReason,
  type LaunchDb,
} from './service'
import { getLaunchStripeConfig } from './stripe'
import { launchOffersEnabled, launchCampaignCode, LAUNCH_OFFER_A_CODE, LAUNCH_OFFER_B_CODE } from './config'

export type LaunchCheckoutResult =
  | { ok: true; url: string; sessionId: string; reservationId: string; expiresAt: Date }
  | { ok: false; reasonCode: EligibilityReason | 'STRIPE_NOT_CONFIGURED' | 'STRIPE_ERROR' | 'INVALID_REQUEST'; error?: string }

const OFFER_CODES = new Set([LAUNCH_OFFER_A_CODE, LAUNCH_OFFER_B_CODE])

/**
 * Crée une session Stripe Checkout pour une offre de lancement.
 */
export async function createLaunchCheckoutSession(args: {
  userId: string
  userEmail?: string
  offerCode: string
  planId: string
  platform?: string
  idempotencyKey: string
  origin: string
  locale?: string | null
}, client: LaunchDb = db): Promise<LaunchCheckoutResult> {
  if (!launchOffersEnabled()) return { ok: false, reasonCode: 'CAMPAIGN_NOT_STARTED' }
  if (!OFFER_CODES.has(args.offerCode)) return { ok: false, reasonCode: 'PLAN_NOT_ELIGIBLE', error: 'unknown_offer' }

  const planId = args.planId as PlanId
  const platform = args.platform || 'WEB'

  // 1. Éligibilité serveur.
  const eligibility = await checkEligibility({ userId: args.userId, offerCode: args.offerCode, planId: args.planId, platform }, client)
  if (!eligibility.eligible) return { ok: false, reasonCode: eligibility.reasonCode ?? 'PLAN_NOT_ELIGIBLE' }

  // 2. Réservation atomique (idempotente via idempotencyKey).
  const reservation = await createReservation({
    userId: args.userId,
    offerCode: args.offerCode,
    planId: args.planId,
    platform,
    idempotencyKey: args.idempotencyKey,
  }, client)
  if (!reservation.ok) return { ok: false, reasonCode: reservation.reasonCode }

  // 3. Config Stripe serveur.
  const stripeConfig = getLaunchStripeConfig(args.offerCode, planId)
  if (!stripeConfig) {
    // L'offre n'est pas configurable (price ID manquant) → libère la réservation.
    await releaseReservation(reservation.reservationId, args.userId, client)
    return { ok: false, reasonCode: 'STRIPE_NOT_CONFIGURED' }
  }

  try {
    const stripe = getStripe()
    const campaignCode = launchCampaignCode()
    const metadata = {
      campaignCode,
      offerCode: args.offerCode,
      planId: args.planId,
      platform,
      reservationId: reservation.reservationId,
      idempotencyKey: args.idempotencyKey,
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: stripeConfig.priceId, quantity: 1 }],
      // Coupon : montant dérivé côté serveur (jamais client).
      ...(stripeConfig.couponId ? { discounts: [{ coupon: stripeConfig.couponId }] } : {}),
      client_reference_id: args.userId,
      customer_email: args.userEmail || undefined,
      locale: (args.locale as 'fr' | 'en') || undefined,
      metadata,
      subscription_data: { metadata },
      success_url: `${args.origin}/?subscription=success&launch_offer=${args.offerCode}`,
      cancel_url: `${args.origin}/?subscription=cancelled&launch_offer=${args.offerCode}`,
    })

    // Lie la session Stripe à la réservation (traçabilité webhook).
    await client.promotionReservation.update({
      where: { id: reservation.reservationId },
      data: { providerCheckoutId: checkoutSession.id },
    })

    return {
      ok: true,
      url: checkoutSession.url!,
      sessionId: checkoutSession.id,
      reservationId: reservation.reservationId,
      expiresAt: reservation.expiresAt,
    }
  } catch (err) {
    console.error('[launch.checkout] Stripe session error:', err)
    await releaseReservation(reservation.reservationId, args.userId, client)
    return { ok: false, reasonCode: 'STRIPE_ERROR', error: err instanceof Error ? err.message : String(err) }
  }
}
