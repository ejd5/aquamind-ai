/**
 * AQWELIA Launch offers — service central (spec v1.0 §3-§10).
 *
 * Le backend est l'autorité pour l'éligibilité, les quotas, les réservations et
 * l'unicité interplateforme. Les compteurs sont protégés par des UPDATE
 * conditionnels atomiques (équivalent SQLite/PostgreSQL du verrou en base) et
 * des contraintes uniques — pas par lecture puis écriture non atomique.
 *
 * Disponibilité : available = quota - confirmed - reserved - safety_buffer.
 * Le quota n'est consommé qu'après vérification serveur du paiement.
 */

import { randomUUID, createHash, createHmac } from 'crypto'
import { db } from '@/lib/db'
import {
  launchOffersEnabled,
  launchCampaignCode,
  launchReservationTtlSeconds,
  launchExactRemainingThresholdRatio,
  launchEligibleCountries,
  launchEligiblePlanIds,
  launchExcludedRoles,
  launchQuotaA,
  launchQuotaB,
  launchAllocationDefaults,
  LAUNCH_OFFER_A_CODE,
  LAUNCH_OFFER_B_CODE,
  isLaunchPlatform,
  type LaunchPlatform,
} from './config'
import { computeLaunchPricing, marketingConsistency, type LaunchPricing } from './pricing'
import type { PlanId } from '@/lib/billing/plans'
import { trackEventServer } from '@/lib/analytics-server'

export type EligibilityReason =
  | 'CAMPAIGN_NOT_STARTED'
  | 'CAMPAIGN_ENDED'
  | 'CAMPAIGN_PAUSED'
  | 'QUOTA_EXHAUSTED'
  | 'ALLOCATION_EXHAUSTED'
  | 'ACCOUNT_NOT_VERIFIED'
  | 'ALREADY_SUBSCRIBED'
  | 'OFFER_ALREADY_REDEEMED'
  | 'ACTIVE_RESERVATION_EXISTS'
  | 'PLAN_NOT_ELIGIBLE'
  | 'COUNTRY_NOT_ELIGIBLE'
  | 'PLATFORM_NOT_ELIGIBLE'
  | 'STORE_ACCOUNT_NOT_ELIGIBLE'
  | 'RISK_REVIEW_REQUIRED'
  | 'PRICE_CONFIGURATION_INVALID'

export interface OfferView {
  code: string
  eligible: boolean
  reasonCode: EligibilityReason | null
  pricing: LaunchPricing | null
  availability: { state: 'AVAILABLE' | 'EXHAUSTED'; remaining: number | null; showExactRemaining: boolean }
}

export interface CampaignView {
  code: string
  status: string
  endsAt: string | null
}

/** Jeton signé, lié à user/variant/plan/platform/reservation. Hash seul stocké. */
export function signReservationToken(payload: { reservationId: string; userId: string; offerCode: string; planId: string; platform: string; expiresAt: string }): string {
  const secret = process.env.AQWELIA_LAUNCH_TOKEN_SECRET || process.env.NEXTAUTH_SECRET || 'launch-offers-dev-only'
  return createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex')
}

export function hashReservationToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

function isBusyError(err: any): boolean {
  return err?.code === 'SQLITE_BUSY' || /SQLITE_BUSY|database is locked|Database is locked/i.test(String(err?.message || ''))
}

/** Relance les transactions sur verrou transitoire SQLite (équivalent d'une file de priorité en prod PG). */
async function withBusyRetry<T>(fn: () => Promise<T>, attempts = 8, delayMs = 25): Promise<T> {
  let lastErr: unknown
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await fn()
    } catch (err) {
      lastErr = err
      if (!isBusyError(err) || i === attempts - 1) throw err
      await new Promise((r) => setTimeout(r, delayMs))
    }
  }
  throw lastErr
}

function parseJsonArray(raw: string | null | undefined): string[] {
  if (!raw) return []
  try {
    const v = JSON.parse(raw)
    return Array.isArray(v) ? v.map(String) : []
  } catch {
    return []
  }
}

/** Charge (ou crée à la demande) la campagne + variantes + allocations. */
export async function loadCampaign(): Promise<{
  campaign: NonNullable<Awaited<ReturnType<typeof db.promotionCampaign.findUnique>>>
  variants: Awaited<ReturnType<typeof db.promotionVariant.findMany>>
  allocations: Awaited<ReturnType<typeof db.promotionAllocation.findMany>>
} | null> {
  if (!launchOffersEnabled()) return null
  const campaign = await db.promotionCampaign.findUnique({ where: { code: launchCampaignCode() } })
  if (!campaign) return null
  const variants = await db.promotionVariant.findMany({ where: { campaignId: campaign.id } })
  const allocations = await db.promotionAllocation.findMany({
    where: { variantId: { in: variants.map((v) => v.id) } },
  })
  return { campaign, variants, allocations }
}

/**
 * Détermine si la campagne est globalement active (statut + dates).
 * Retourne un code de raison stable sinon.
 */
function campaignState(campaign: { status: string; startsAt: Date | null; endsAt: Date | null }): EligibilityReason | null {
  const now = new Date()
  if (campaign.status === 'SCHEDULED' && campaign.startsAt && now < campaign.startsAt) return 'CAMPAIGN_NOT_STARTED'
  if (campaign.status === 'PAUSED') return 'CAMPAIGN_PAUSED'
  if (campaign.status === 'EXHAUSTED' || campaign.status === 'ENDED') return 'CAMPAIGN_ENDED'
  if (campaign.status !== 'ACTIVE') return 'CAMPAIGN_NOT_STARTED'
  if (campaign.endsAt && now > campaign.endsAt) return 'CAMPAIGN_ENDED'
  return null
}

function variantState(variant: { status: string }): boolean {
  return variant.status === 'ACTIVE'
}

function allocationFor(variants: Awaited<ReturnType<typeof db.promotionVariant.findMany>>, allocations: Awaited<ReturnType<typeof db.promotionAllocation.findMany>>, offerCode: string, platform: LaunchPlatform, planId: string) {
  const variant = variants.find((v) => v.code === offerCode)
  if (!variant) return null
  const allocation = allocations.find((a) => a.variantId === variant.id && a.platform === platform && (a.planId === planId || a.planId === null))
  return allocation ?? allocations.find((a) => a.variantId === variant.id && a.platform === platform && a.planId === null) ?? null
}

function allocationAvailable(allocation: { quota: number; confirmedCount: number; reservedCount: number; safetyBuffer: number }): number {
  return allocation.quota - allocation.confirmedCount - allocation.reservedCount - allocation.safetyBuffer
}

export async function checkEligibility(args: {
  userId: string
  offerCode: string
  planId: string
  platform: string
  countryHint?: string
}): Promise<{ eligible: boolean; reasonCode: EligibilityReason | null; offer: OfferView | null; campaign: CampaignView | null }> {
  const c = await loadCampaign()
  if (!c) return { eligible: false, reasonCode: 'CAMPAIGN_NOT_STARTED', offer: null, campaign: null }
  const { campaign, variants, allocations } = c

  const stateReason = campaignState(campaign)
  if (stateReason) return { eligible: false, reasonCode: stateReason, offer: null, campaign: { code: campaign.code, status: campaign.status, endsAt: campaign.endsAt?.toISOString() ?? null } }

  const variant = variants.find((v) => v.code === args.offerCode)
  if (!variant || !variantState(variant)) return { eligible: false, reasonCode: 'CAMPAIGN_ENDED', offer: null, campaign: null }

  if (!isLaunchPlatform(args.platform)) return { eligible: false, reasonCode: 'PLATFORM_NOT_ELIGIBLE', offer: null, campaign: null }

  // Plan éligible.
  const eligiblePlans = parseJsonArray(variant.eligiblePlanIds || campaign.eligiblePlanIds || null).length
    ? parseJsonArray(variant.eligiblePlanIds || campaign.eligiblePlanIds || null)
    : launchEligiblePlanIds()
  if (!eligiblePlans.includes(args.planId)) return { eligible: false, reasonCode: 'PLAN_NOT_ELIGIBLE', offer: null, campaign: null }

  // Prix valide (marketing consistency). Bloque si l'étiquette ne correspond pas aux montants.
  const consistency = marketingConsistency(args.planId as PlanId)
  const pricing = computeLaunchPricing(args.offerCode, args.planId as PlanId)
  if (!pricing) return { eligible: false, reasonCode: 'PRICE_CONFIGURATION_INVALID', offer: null, campaign: null }
  if (args.offerCode === LAUNCH_OFFER_A_CODE && !consistency.labelA50) return { eligible: false, reasonCode: 'PRICE_CONFIGURATION_INVALID', offer: null, campaign: null }
  if (args.offerCode === LAUNCH_OFFER_B_CODE && !consistency.labelB3for2) return { eligible: false, reasonCode: 'PRICE_CONFIGURATION_INVALID', offer: null, campaign: null }

  // Compte exclu.
  const user = await db.user.findUnique({ where: { id: args.userId }, select: { id: true, role: true, country: true } })
  if (!user) return { eligible: false, reasonCode: 'ACCOUNT_NOT_VERIFIED', offer: null, campaign: null }
  if (launchExcludedRoles().includes(user.role)) return { eligible: false, reasonCode: 'RISK_REVIEW_REQUIRED', offer: null, campaign: null }

  // Pays : uniquement le pays enregistré côté serveur (User.country), jamais le
  // paramètre client (query/body) qui peut être falsifié. Le hint client ne
  // sert qu'à l'affichage localisé du prix, pas à la décision d'éligibilité.
  if (launchEligibleCountries().length > 0 && !launchEligibleCountries().includes(user.country)) {
    return { eligible: false, reasonCode: 'COUNTRY_NOT_ELIGIBLE', offer: null, campaign: null }
  }

  // N'a jamais eu d'abonnement payant.
  const paidSub = await db.subscription.findFirst({
    where: { userId: args.userId, plan: { not: 'decouverte' } },
    select: { id: true },
  })
  if (paidSub) return { eligible: false, reasonCode: 'ALREADY_SUBSCRIBED', offer: null, campaign: null }

  // N'a jamais consommé la campagne.
  const redeemed = await db.promotionRedemption.findUnique({
    where: { campaignId_userId: { campaignId: campaign.id, userId: args.userId } },
    select: { id: true },
  })
  if (redeemed) return { eligible: false, reasonCode: 'OFFER_ALREADY_REDEEMED', offer: null, campaign: null }

  // Réservation active existante.
  const activeReservation = await db.promotionReservation.findFirst({
    where: { campaignId: campaign.id, userId: args.userId, status: 'ACTIVE' },
    select: { id: true },
  })
  if (activeReservation) return { eligible: false, reasonCode: 'ACTIVE_RESERVATION_EXISTS', offer: null, campaign: null }

  const allocation = allocationFor(variants, allocations, args.offerCode, args.platform as LaunchPlatform, args.planId)
  if (!allocation) return { eligible: false, reasonCode: 'ALLOCATION_EXHAUSTED', offer: null, campaign: null }

  const available = allocationAvailable(allocation)
  if (available <= 0) return { eligible: false, reasonCode: 'ALLOCATION_EXHAUSTED', offer: null, campaign: null }

  const showExactRemaining = available <= Math.round(allocation.quota * launchExactRemainingThresholdRatio())

  return {
    eligible: true,
    reasonCode: null,
    campaign: { code: campaign.code, status: campaign.status, endsAt: campaign.endsAt?.toISOString() ?? null },
    offer: {
      code: args.offerCode,
      eligible: true,
      reasonCode: null,
      pricing,
      availability: { state: 'AVAILABLE', remaining: available, showExactRemaining },
    },
  }
}

export type ReserveResult =
  | { ok: true; reservationId: string; reservationToken: string; expiresAt: Date; offerCode: string }
  | { ok: false; reasonCode: EligibilityReason; error?: string }

/**
 * Crée une réservation atomique de 30 min.
 *  - UPDATE conditionnel atomique sur l'allocation (ne consomme que si une place
 *    est disponible) ;
 *  - insertion de la réservation (idempotence par idempotencyKey unique) ;
 *  - jeton signé, hash seul stocké.
 */
export async function createReservation(args: {
  userId: string
  offerCode: string
  planId: string
  platform: string
  idempotencyKey: string
  countryHint?: string
}): Promise<ReserveResult> {
  if (!launchOffersEnabled()) return { ok: false, reasonCode: 'CAMPAIGN_NOT_STARTED' }

  // Idempotence : une même clé retourne la réservation existante.
  const existing = await db.promotionReservation.findUnique({ where: { idempotencyKey: args.idempotencyKey } })
  if (existing) {
    return { ok: true, reservationId: existing.id, reservationToken: signReservationToken({ reservationId: existing.id, userId: existing.userId, offerCode: existing.variantId, planId: existing.planId, platform: existing.platform, expiresAt: existing.expiresAt.toISOString() }), expiresAt: existing.expiresAt, offerCode: args.offerCode }
  }

  const c = await loadCampaign()
  if (!c) return { ok: false, reasonCode: 'CAMPAIGN_NOT_STARTED' }
  const { campaign, variants, allocations } = c

  const stateReason = campaignState(campaign)
  if (stateReason) return { ok: false, reasonCode: stateReason }

  const variant = variants.find((v) => v.code === args.offerCode)
  if (!variant || !variantState(variant)) return { ok: false, reasonCode: 'CAMPAIGN_ENDED' }
  if (!isLaunchPlatform(args.platform)) return { ok: false, reasonCode: 'PLATFORM_NOT_ELIGIBLE' }

  // Pays : uniquement la valeur enregistrée côté serveur (User.country), jamais
  // le paramètre client. Les hints (query/body) ne servent qu'à l'affichage.
  const user = await db.user.findUnique({ where: { id: args.userId }, select: { id: true, role: true, country: true } })
  if (!user) return { ok: false, reasonCode: 'ACCOUNT_NOT_VERIFIED' }
  if (launchExcludedRoles().includes(user.role)) return { ok: false, reasonCode: 'RISK_REVIEW_REQUIRED' }
  if (launchEligibleCountries().length > 0 && !launchEligibleCountries().includes(user.country)) {
    return { ok: false, reasonCode: 'COUNTRY_NOT_ELIGIBLE' }
  }

  const allocation = allocationFor(variants, allocations, args.offerCode, args.platform as LaunchPlatform, args.planId)
  if (!allocation) return { ok: false, reasonCode: 'ALLOCATION_EXHAUSTED' }

  const pricing = computeLaunchPricing(args.offerCode, args.planId as PlanId)
  if (!pricing) return { ok: false, reasonCode: 'PRICE_CONFIGURATION_INVALID' }

  const now = new Date()
  const expiresAt = new Date(now.getTime() + launchReservationTtlSeconds() * 1000)

  try {
    const result = await withBusyRetry(() => db.$transaction(async (tx) => {
      // Nettoyage paresseux des réservations expirées de cette allocation.
      await tx.promotionReservation.updateMany({
        where: { allocationId: allocation.id, status: 'ACTIVE', expiresAt: { lt: now } },
        data: { status: 'EXPIRED' },
      })
      // Recalcul fiable des compteurs depuis les lignes (pas seulement les caches).
      const activeReservations = await tx.promotionReservation.count({ where: { allocationId: allocation.id, status: 'ACTIVE' } })
      const confirmed = await tx.promotionRedemption.count({ where: { allocationId: allocation.id } })

      const available = allocation.quota - confirmed - activeReservations - allocation.safetyBuffer
      if (available <= 0) return { ok: false as const, reasonCode: 'ALLOCATION_EXHAUSTED' as EligibilityReason }

      // Claim atomique (sécurité supplémentaire, même prédicat).
      const claimed = await tx.promotionAllocation.updateMany({
        where: {
          id: allocation.id,
          confirmedCount: confirmed,
          reservedCount: activeReservations,
        },
        data: { reservedCount: { increment: 1 } },
      })
      if (claimed.count === 0) return { ok: false as const, reasonCode: 'ALLOCATION_EXHAUSTED' as EligibilityReason }

      const reservation = await tx.promotionReservation.create({
        data: {
          campaignId: campaign.id,
          variantId: variant.id,
          allocationId: allocation.id,
          userId: args.userId,
          planId: args.planId,
          platform: args.platform,
          status: 'ACTIVE',
          expiresAt,
          idempotencyKey: args.idempotencyKey,
        },
      })

      const token = signReservationToken({ reservationId: reservation.id, userId: args.userId, offerCode: args.offerCode, planId: args.planId, platform: args.platform, expiresAt: expiresAt.toISOString() })
      await tx.promotionReservation.update({
        where: { id: reservation.id },
        data: { signedTokenHash: hashReservationToken(token) },
      })

      return { ok: true as const, reservation, token, expiresAt }
    }))

    if (!result.ok) return { ok: false, reasonCode: result.reasonCode }
    void trackEventServer('launch_offer_reservation_created', { campaign: campaign.code, variant: args.offerCode, plan: args.planId, platform: args.platform })
    return { ok: true, reservationId: result.reservation.id, reservationToken: result.token, expiresAt: result.expiresAt, offerCode: args.offerCode }
  } catch (err: any) {
    if (err?.code === 'P2002') {
      const existingNow = await db.promotionReservation.findUnique({ where: { idempotencyKey: args.idempotencyKey } })
      if (existingNow) {
        return { ok: true, reservationId: existingNow.id, reservationToken: signReservationToken({ reservationId: existingNow.id, userId: existingNow.userId, offerCode: existingNow.variantId, planId: existingNow.planId, platform: existingNow.platform, expiresAt: existingNow.expiresAt.toISOString() }), expiresAt: existingNow.expiresAt, offerCode: args.offerCode }
      }
      return { ok: false, reasonCode: 'ACTIVE_RESERVATION_EXISTS' }
    }
    return { ok: false, reasonCode: 'RISK_REVIEW_REQUIRED', error: err?.message }
  }
}

/** Libère explicitement une réservation abandonnée (idempotente). */
export async function releaseReservation(reservationId: string, userId: string): Promise<{ ok: boolean }> {
  const reservation = await db.promotionReservation.findUnique({ where: { id: reservationId } })
  if (!reservation || reservation.userId !== userId) return { ok: false }
  if (reservation.status !== 'ACTIVE') return { ok: true }
  await db.$transaction(async (tx) => {
    await tx.promotionReservation.updateMany({
      where: { id: reservationId, status: 'ACTIVE' },
      data: { status: 'CANCELLED' },
    })
    await tx.promotionAllocation.updateMany({
      where: { id: reservation.allocationId, reservedCount: { gt: 0 } },
      data: { reservedCount: { decrement: 1 } },
    })
  })
  void trackEventServer('launch_checkout_abandoned', { reservationId })
  return { ok: true }
}

/** Expire les réservations dépassées (job périodique ; le chemin de réservation nettoie aussi). */
export async function expireDueReservations(limit = 500): Promise<number> {
  const now = new Date()
  const due = await db.promotionReservation.findMany({
    where: { status: 'ACTIVE', expiresAt: { lt: now } },
    take: limit,
    select: { id: true, allocationId: true },
  })
  if (due.length === 0) return 0
  await db.$transaction(async (tx) => {
    for (const r of due) {
      const updated = await tx.promotionReservation.updateMany({ where: { id: r.id, status: 'ACTIVE' }, data: { status: 'EXPIRED' } })
      if (updated.count === 1) {
        await tx.promotionAllocation.updateMany({ where: { id: r.allocationId, reservedCount: { gt: 0 } }, data: { reservedCount: { decrement: 1 } } })
      }
    }
  })
  return due.length
}

export type ConfirmResult =
  | { ok: true; redemptionId: string; alreadyProcessed: boolean; lateConfirmation: boolean }
  | { ok: false; reasonCode: EligibilityReason | 'ALREADY_PROCESSED'; error?: string }

/**
 * Consomme le quota après vérification serveur du paiement (idempotent).
 *  - contrainte unique (provider, providerTransactionId) et (campaignId, userId) ;
 *  - réserve la récompense puis met à jour compteurs + statut de réservation ;
 *  - confirmation tardive → marquée LATE_CONFIRMATION (droit honoré, alerte).
 */
export async function confirmRedemption(args: {
  userId: string
  offerCode: string
  planId: string
  platform: string
  provider: 'STRIPE' | 'APPLE' | 'GOOGLE'
  providerTransactionId: string
  providerOriginalTransactionId?: string
  reservationId?: string
  paidAmountMinor: number
  normalAmountMinor: number
  currency?: string
}): Promise<ConfirmResult> {
  if (!launchOffersEnabled()) return { ok: false, reasonCode: 'CAMPAIGN_NOT_STARTED' }

  const c = await loadCampaign()
  if (!c) return { ok: false, reasonCode: 'CAMPAIGN_NOT_STARTED' }
  const { campaign, variants, allocations } = c
  const variant = variants.find((v) => v.code === args.offerCode)
  if (!variant) return { ok: false, reasonCode: 'CAMPAIGN_ENDED' }
  const allocation = allocationFor(variants, allocations, args.offerCode, args.platform as LaunchPlatform, args.planId)
  if (!allocation) return { ok: false, reasonCode: 'ALLOCATION_EXHAUSTED' }

  try {
    const result = await withBusyRetry(() => db.$transaction(async (tx) => {
      // Idempotence fournisseur : déjà traitée → succès sans nouvel effet.
      const existing = await tx.promotionRedemption.findUnique({
        where: { providerTransactionId: args.providerTransactionId },
      })
      if (existing) return { ok: true as const, redemptionId: existing.id, alreadyProcessed: true, lateConfirmation: false }

      // Réservation : consomme si ACTIVE ; confirmation tardive si EXPIRED/ABSENTE.
      let reservation: Awaited<ReturnType<typeof db.promotionReservation.findUnique>> = null
      let lateConfirmation = false
      if (args.reservationId) {
        reservation = await tx.promotionReservation.findUnique({ where: { id: args.reservationId } })
        if (!reservation || reservation.userId !== args.userId || reservation.status === 'CANCELLED') {
          return { ok: false as const, reasonCode: 'ACTIVE_RESERVATION_EXISTS' as EligibilityReason }
        }
        if (reservation.status === 'EXPIRED' || reservation.expiresAt < new Date()) lateConfirmation = true
      }

      // Unicité compte/campagne.
      const dup = await tx.promotionRedemption.findUnique({
        where: { campaignId_userId: { campaignId: campaign.id, userId: args.userId } },
      })
      if (dup) return { ok: false as const, reasonCode: 'OFFER_ALREADY_REDEEMED' as EligibilityReason }

      const redemption = await tx.promotionRedemption.create({
        data: {
          campaignId: campaign.id,
          variantId: variant.id,
          allocationId: allocation.id,
          reservationId: reservation?.id ?? null,
          userId: args.userId,
          planId: args.planId,
          platform: args.platform,
          provider: args.provider,
          providerTransactionId: args.providerTransactionId,
          providerOriginalTransactionId: args.providerOriginalTransactionId,
          normalAmountMinor: args.normalAmountMinor,
          paidAmountMinor: args.paidAmountMinor,
          discountAmountMinor: args.normalAmountMinor - args.paidAmountMinor,
          currency: args.currency || 'EUR',
          status: 'CONFIRMED',
          confirmedAt: new Date(),
          metadata: lateConfirmation ? JSON.stringify({ late_confirmation: true }) : null,
        },
      })

      // Compteurs atomiques.
      await tx.promotionAllocation.update({
        where: { id: allocation.id },
        data: { confirmedCount: { increment: 1 } },
      })
      if (reservation) {
        await tx.promotionReservation.updateMany({
          where: { id: reservation.id, status: 'ACTIVE' },
          data: { status: 'CONSUMED' },
        })
        await tx.promotionAllocation.updateMany({
          where: { id: allocation.id, reservedCount: { gt: 0 } },
          data: { reservedCount: { decrement: 1 } },
        })
      }
      return { ok: true as const, redemptionId: redemption.id, alreadyProcessed: false, lateConfirmation }
    }))

    if (!result.ok) return { ok: false, reasonCode: result.reasonCode }
    void trackEventServer(result.lateConfirmation ? 'launch_purchase_late_confirmation' : 'launch_purchase_confirmed', { campaign: campaign.code, variant: args.offerCode, plan: args.planId, platform: args.platform, provider: args.provider })
    return { ok: true, redemptionId: result.redemptionId, alreadyProcessed: result.alreadyProcessed, lateConfirmation: result.lateConfirmation }
  } catch (err: any) {
    if (err?.code === 'P2002') return { ok: false, reasonCode: 'ALREADY_PROCESSED', error: 'duplicate' }
    return { ok: false, reasonCode: 'RISK_REVIEW_REQUIRED', error: err?.message }
  }
}
