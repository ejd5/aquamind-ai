/**
 * AQWELIA Launch offers — checkout Web (spec v1.0 §5/§6).
 *
 * Orchestration serveur :
 *   1. vérifie la campagne active ;
 *   2. réservation atomique 30 min (createReservation, idempotente) — autorité
 *      d'éligibilité ET d'idempotence (replay → même réservation) ;
 *   3. résolution Stripe côté serveur (getLaunchStripeConfig, coupon obligatoire) ;
 *   4. clé Stripe stable `aqwelia-launch-checkout:{reservationId}` pour une
 *      facturation idempotente (une seule session par réservation) ;
 *   5. si providerCheckoutId existe déjà, récupérer et retourner la même session ;
 *   6. création de la session Checkout avec metadata de campagne.
 *
 * Libération de la réservation : uniquement pour un échec CERTAIN avant tout
 * appel Stripe (config manquante). Une erreur Stripe ambigüe (pouvant survenir
 * après la création distante) ne libère PAS la réservation : on la conserve
 * jusqu'au retry ou au TTL.
 *
 * Le navigateur n'envoie que { offerCode, planId, platform, idempotencyKey }.
 * Aucun montant ni price ID ne vient du client.
 */
import { getStripe } from '@/lib/stripe'
import { db } from '@/lib/db'
import type { PlanId } from '@/lib/billing/plans'
import {
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

/** Clé d'idempotence Stripe stable : une seule session Checkout par réservation. */
function checkoutIdempotencyKey(reservationId: string): string {
  return `aqwelia-launch-checkout:${reservationId}`
}

/**
 * Crée (ou réutilise) une session Stripe Checkout pour une offre de lancement.
 * Idempotent : deux appels concurrents ou séquentiels avec la même idempotencyKey
 * retournent le même reservationId, sessionId et URL.
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

  // 1. Réservation atomique + idempotente (createReservation EST l'autorité) :
  //    un replay avec la même clé retourne la même réservation sans ré-appliquer
  //    l'éligibilité. Le pré-contrôle d'éligibilité ne doit JAMAIS bloquer le
  //    replay d'une clé existante.
  const reservation = await createReservation({
    userId: args.userId,
    offerCode: args.offerCode,
    planId: args.planId,
    platform,
    idempotencyKey: args.idempotencyKey,
  }, client)
  if (!reservation.ok) return { ok: false, reasonCode: reservation.reasonCode }

  // Replay : si une session Stripe existe déjà pour cette réservation, la
  // récupérer et la retourner (même sessionId, même URL, aucune double création).
  if (reservation.providerCheckoutId) {
    try {
      const stripe = getStripe()
      const existing = await stripe.checkout.sessions.retrieve(reservation.providerCheckoutId)
      if (existing?.id && existing?.url) {
        return {
          ok: true,
          url: existing.url,
          sessionId: existing.id,
          reservationId: reservation.reservationId,
          expiresAt: reservation.expiresAt,
        }
      }
    } catch (err) {
      // Session introuvable/expirée côté Stripe → on retente une création.
      console.warn('[launch.checkout] replay session retrieve failed:', err)
    }
  }

  // 2. Config Stripe serveur (coupon OBLIGATOIRE). Échec certain AVANT tout
  //    appel Stripe → on libère la réservation.
  const stripeConfig = getLaunchStripeConfig(args.offerCode, planId)
  if (!stripeConfig) {
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
      // Coupon OBLIGATOIRE : toujours transmis (jamais de session sans coupon).
      discounts: [{ coupon: stripeConfig.couponId }],
      client_reference_id: args.userId,
      customer_email: args.userEmail || undefined,
      locale: (args.locale as 'fr' | 'en') || undefined,
      metadata,
      subscription_data: { metadata },
      success_url: `${args.origin}/?subscription=success&launch_offer=${args.offerCode}`,
      cancel_url: `${args.origin}/?subscription=cancelled&launch_offer=${args.offerCode}`,
    }, { idempotencyKey: checkoutIdempotencyKey(reservation.reservationId) })

    // Lie la session Stripe à la réservation (traçabilité webhook + replay).
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
    // Erreur AMBIGÜE (possiblement après création distante) : on conserve la
    // réservation jusqu'au retry ou au TTL — pas de libération ici.
    console.error('[launch.checkout] Stripe session error:', err)
    return { ok: false, reasonCode: 'STRIPE_ERROR', error: err instanceof Error ? err.message : String(err) }
  }
}
