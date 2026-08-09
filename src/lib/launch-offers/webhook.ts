/**
 * AQWELIA Launch offers — traitement webhook Stripe (spec v1.0 §8-§10).
 *
 * Après que `handleStripeEvent` a appliqué la transition d'abonnement
 * (applyTransition) pour un `checkout.session.completed` PAYÉ, ce module
 * vérifie si la session appartient à la campagne de lancement (via metadata) et
 * consomme le quota de façon atomique (`confirmRedemption`) avec les montants du
 * pricing SERVEUR.
 *
 * Sécurité :
 *  - `payment_status === 'paid'` exigé (contrôlé par l'appelant) ;
 *  - montants recalculés côté serveur via `computeLaunchPricing` et comparés à
 *    ce que Stripe a réellement encaissé (amount_total) ;
 *  - idempotence : `processEventIdempotently` (par eventId) + contraintes
 *    uniques (providerTransactionId, campaignId_userId) ;
 *  - webhooks dupliqués ou désordonnés → `alreadyProcessed` sans nouvel effet.
 */
import { getStripe } from '@/lib/stripe'
import { db } from '@/lib/db'
import { confirmRedemption, type LaunchDb } from './service'
import { computeLaunchPricing } from './pricing'
import { launchCampaignCode, LAUNCH_OFFER_A_CODE, LAUNCH_OFFER_B_CODE } from './config'
import type { PlanId } from '@/lib/billing/plans'

export type LaunchWebhookResult =
  | { handled: true; redemptionId?: string; alreadyProcessed?: boolean; lateConfirmation?: boolean }
  | { handled: false; reason: string }

const OFFER_CODES = new Set([LAUNCH_OFFER_A_CODE, LAUNCH_OFFER_B_CODE])

/**
 * Traite une session Checkout Stripe qui porte les metadata de la campagne.
 * Retourne `{ handled: false }` si la session n'appartient pas à la campagne
 * (l'appelant ne doit alors PAS considérer le webhook comme un échec).
 */
export async function handleLaunchCheckoutSession(checkoutSession: any, client: LaunchDb = db): Promise<LaunchWebhookResult> {
  const meta = checkoutSession?.metadata || {}
  const isLaunch = meta.campaignCode === launchCampaignCode() && OFFER_CODES.has(meta.offerCode)
  if (!isLaunch) return { handled: false, reason: 'not_launch_campaign' }

  const offerCode = meta.offerCode
  const planId = meta.planId
  const reservationId = meta.reservationId || null
  const platform = meta.platform || 'WEB'
  const userId = checkoutSession.client_reference_id || checkoutSession.metadata?.userId
  if (!userId || !planId) return { handled: false, reason: 'missing_user_or_plan' }

  // Montants : pricing serveur uniquement.
  const pricing = computeLaunchPricing(offerCode, planId as PlanId)
  if (!pricing) return { handled: false, reason: 'price_not_configurable' }

  // Vérifie que Stripe a bien encaissé le montant attendu (cents).
  const amountTotal = checkoutSession.amount_total as number | undefined
  if (typeof amountTotal === 'number' && amountTotal !== pricing.dueNowMinor) {
    return { handled: false, reason: 'amount_mismatch_with_server_pricing' }
  }

  // Identifiant de transaction : PaymentIntent (id stable) sinon session id.
  const paymentIntent = checkoutSession.payment_intent
  const providerTransactionId = typeof paymentIntent === 'string'
    ? paymentIntent
    : typeof paymentIntent?.id === 'string'
      ? paymentIntent.id
      : checkoutSession.id

  const result = await confirmRedemption({
    userId,
    offerCode,
    planId,
    platform,
    provider: 'STRIPE',
    providerTransactionId,
    reservationId,
    paidAmountMinor: pricing.dueNowMinor,
    normalAmountMinor: pricing.renewalMinor,
    currency: pricing.currency,
  }, client)

  if (!result.ok) {
    // Un doublon technique est déjà traité (succès) ; les autres raisons sont
    // des rejets métier (offre déjà consommée, quota épuisé) → à ne pas
    // considérer comme un échec du webhook (Stripe ne doit pas réessayer).
    return { handled: false, reason: result.reasonCode ?? 'redemption_rejected' }
  }

  return {
    handled: true,
    redemptionId: result.redemptionId,
    alreadyProcessed: result.alreadyProcessed,
    lateConfirmation: result.lateConfirmation,
  }
}

/**
 * Récupère l'utilisateur + la réservation d'une session de campagne (pour email).
 */
export async function getLaunchRedemptionUser(checkoutSession: any): Promise<{ userId: string; email?: string } | null> {
  const meta = checkoutSession?.metadata || {}
  if (meta.campaignCode !== launchCampaignCode()) return null
  const userId = checkoutSession.client_reference_id || meta.userId
  if (!userId) return null
  const user = await db.user.findUnique({ where: { id: userId }, select: { id: true, email: true, name: true } })
  if (!user) return null
  return { userId: user.id, email: user.email || undefined }
}

/**
 * Marque une redemption de campagne comme REFUNDED lors d'un remboursement
 * intégral Stripe. Conforme spec §3 : un remboursement à la demande du client
 * ne remet PAS la place automatiquement (seule une remise admin — auditée —
 * la restitue). Idempotent : les refunds suivants sont sans effet.
 */
export async function markLaunchRedemptionRefunded(args: {
  userId: string
  campaignCode?: string
}, client: LaunchDb = db): Promise<{ handled: boolean }> {
  const campaign = await client.promotionCampaign.findUnique({ where: { code: launchCampaignCode() } })
  if (!campaign) return { handled: false }

  const redemption = await client.promotionRedemption.findFirst({
    where: { campaignId: campaign.id, userId: args.userId, status: 'CONFIRMED' },
  })
  if (!redemption) return { handled: false }

  await client.promotionRedemption.update({
    where: { id: redemption.id },
    data: { status: 'REFUNDED' },
  })
  await client.promotionAuditLog.create({
    data: {
      campaignId: campaign.id,
      actor: 'stripe-webhook',
      action: 'refund',
      before: JSON.stringify({ redemptionId: redemption.id, status: redemption.status }),
      after: JSON.stringify({ redemptionId: redemption.id, status: 'REFUNDED' }),
      reason: 'full_refund',
    },
  })
  return { handled: true }
}
