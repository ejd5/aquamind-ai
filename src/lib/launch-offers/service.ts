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
 *
 * Sécurité :
 *  - pays d'éligibilité = User.country (valeur serveur), jamais le paramètre
 *    client ;
 *  - idempotencyKey : une clé existante n'est réutilisée que si elle appartient
 *    au même utilisateur ET correspond à la même offre/formule/plateforme ;
 *  - échec sécurisé si la campagne est active sans secret de signature ;
 *  - confirmation validée contre le pricing serveur (montants jamais dérivés du
 *    client) et appliquée atomiquement aux quotas global ET par allocation.
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

/** Client Prisma injectable (permet d'isoler la base SQLite d'un test). */
export type LaunchDb = typeof db

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
  | 'IDEMPOTENCY_KEY_CONFLICT'
  | 'PLAN_NOT_ELIGIBLE'
  | 'COUNTRY_NOT_ELIGIBLE'
  | 'PLATFORM_NOT_ELIGIBLE'
  | 'STORE_ACCOUNT_NOT_ELIGIBLE'
  | 'RISK_REVIEW_REQUIRED'
  | 'PRICE_CONFIGURATION_INVALID'
  | 'SIGNING_SECRET_MISSING'
  | 'RESERVATION_MISMATCH'
  | 'PAYMENT_CONTEXT_MISMATCH'

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

/**
 * Jeton signé, lié à user/variant/plan/platform/reservation. Hash seul stocké.
 * Échec sécurisé : aucun secret configuré → erreur explicite (jamais de fallback
 * en clair). NEXTAUTH_SECRET sert de repli explicite en environnement.
 */
export function signReservationToken(payload: { reservationId: string; userId: string; offerCode: string; planId: string; platform: string; expiresAt: string }): string {
  const secret = requireSigningSecret()
  return createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex')
}

function requireSigningSecret(): string {
  const secret = process.env.AQWELIA_LAUNCH_TOKEN_SECRET || process.env.NEXTAUTH_SECRET
  if (!secret) throw new Error('launch_offers_signing_secret_missing')
  return secret
}

export function hashReservationToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

function isBusyError(err: any): boolean {
  return err?.code === 'SQLITE_BUSY' || /SQLITE_BUSY|database is locked|Database is locked/i.test(String(err?.message || ''))
}

/** Conflit d'allocation (CAS version/quota/compteurs échoué) : rollback + relecture fraîche. */
export class AllocationVersionConflict extends Error {
  constructor() {
    super('launch_allocation_version_conflict')
    this.name = 'AllocationVersionConflict'
  }
}

/**
 * Relance les transactions sur verrou transitoire SQLite (équivalent d'une file
 * de priorité en prod PG) ET sur conflit de version d'allocation : après un
 * rollback, l'état frais est relu lors de la tentative suivante (borné).
 */
async function withBusyRetry<T>(fn: () => Promise<T>, attempts = 8, delayMs = 25): Promise<T> {
  let lastErr: unknown
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await fn()
    } catch (err) {
      lastErr = err
      const retryable = isBusyError(err) || err instanceof AllocationVersionConflict
      if (!retryable || i === attempts - 1) throw err
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
export async function loadCampaign(client: LaunchDb = db): Promise<{
  campaign: NonNullable<Awaited<ReturnType<LaunchDb['promotionCampaign']['findUnique']>>>
  variants: Awaited<ReturnType<LaunchDb['promotionVariant']['findMany']>>
  allocations: Awaited<ReturnType<LaunchDb['promotionAllocation']['findMany']>>
} | null> {
  if (!launchOffersEnabled()) return null
  const campaign = await client.promotionCampaign.findUnique({ where: { code: launchCampaignCode() } })
  if (!campaign) return null
  const variants = await client.promotionVariant.findMany({ where: { campaignId: campaign.id } })
  const allocations = await client.promotionAllocation.findMany({
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

type LoadedCampaign = NonNullable<Awaited<ReturnType<typeof loadCampaign>>>

function allocationFor(variants: LoadedCampaign['variants'], allocations: LoadedCampaign['allocations'], offerCode: string, platform: LaunchPlatform, planId: string) {
  const variant = variants.find((v) => v.code === offerCode)
  if (!variant) return null
  const allocation = allocations.find((a) => a.variantId === variant.id && a.platform === platform && (a.planId === planId || a.planId === null))
  return allocation ?? allocations.find((a) => a.variantId === variant.id && a.platform === platform && a.planId === null) ?? null
}

function allocationAvailable(allocation: { quota: number; confirmedCount: number; reservedCount: number; safetyBuffer: number }): number {
  return allocation.quota - allocation.confirmedCount - allocation.reservedCount - allocation.safetyBuffer
}

/** Clé d'unicité d'une réservation ACTIVE par (campaignId, userId). */
export function activeUserKeyFor(campaignId: string, userId: string): string {
  return `u:${userId}:c:${campaignId}`
}

/**
 * Expire les réservations ACTIVE périmées (expiresAt < now) d'une campagne pour
 * un utilisateur, DANS la transaction : transition EXPIRED + décrément CAS
 * versionné de chaque allocation concernée + libération de la clé d'unicité.
 * Retourne le nombre d'expirations effectives. Conflit → AllocationVersionConflict.
 */
async function expireUserReservationsInTx(tx: any, campaignId: string, userId: string, now: Date): Promise<number> {
  const due = await tx.promotionReservation.findMany({
    where: { campaignId, userId, status: 'ACTIVE', expiresAt: { lt: now } },
    select: { id: true, allocationId: true },
  })
  for (const r of due) {
    const updated = await tx.promotionReservation.updateMany({
      where: { id: r.id, status: 'ACTIVE', expiresAt: { lt: now } },
      data: { status: 'EXPIRED', activeUserKey: null },
    })
    if (updated.count === 1) {
      const fresh = await freshAllocation(tx, r.allocationId)
      if (!fresh) throw new AllocationVersionConflict()
      const decOk = await casAllocation(tx, fresh, { reservedCount: { decrement: 1 } })
      if (!decOk) throw new AllocationVersionConflict()
    }
  }
  return due.length
}

/** Relecture de l'allocation DANS la transaction (état frais, jamais capturé avant). */
async function freshAllocation(tx: any, allocationId: string): Promise<{
  id: string
  quota: number
  confirmedCount: number
  reservedCount: number
  safetyBuffer: number
  version: number
} | null> {
  return tx.promotionAllocation.findUnique({
    where: { id: allocationId },
    select: { id: true, quota: true, confirmedCount: true, reservedCount: true, safetyBuffer: true, version: true },
  })
}

/**
 * CAS atomique sur l'allocation : inclut id, quota, version, confirmedCount et
 * reservedCount dans le prédicat et incrémente `version` avec toute mutation.
 * Retourne false si un concurrent (réallocation/réservation/confirmation) a
 * modifié l'allocation entre la relecture et la mutation.
 */
async function casAllocation(tx: any, alloc: {
  id: string
  quota: number
  confirmedCount: number
  reservedCount: number
  version: number
}, data: { quota?: number; confirmedCount?: { increment: number } | { decrement: number }; reservedCount?: { increment: number } | { decrement: number } }): Promise<boolean> {
  const res = await tx.promotionAllocation.updateMany({
    where: {
      id: alloc.id,
      quota: alloc.quota,
      version: alloc.version,
      confirmedCount: alloc.confirmedCount,
      reservedCount: alloc.reservedCount,
    },
    data: { ...data, version: { increment: 1 } },
  })
  return res.count === 1
}

/** Règles d'éligibilité communes (compte, pays serveur vérifié, abonnement, historique). */
async function assertAccountEligibility(client: LaunchDb, campaignId: string, userId: string): Promise<EligibilityReason | null> {
  const user = await client.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, country: true, countryVerifiedAt: true },
  })
  if (!user) return 'ACCOUNT_NOT_VERIFIED'
  if (launchExcludedRoles().includes(user.role)) return 'RISK_REVIEW_REQUIRED'
  // Pays : SEULEMENT une valeur vérifiée côté serveur (User.countryVerifiedAt
  // non null). La valeur par défaut FR (jamais vérifiée) n'est pas une preuve :
  // les inscriptions credentials/OAuth ne renseignent aucun pays fiable, donc
  // tout compte sans preuve serveur est INÉLIGIBLE (échec fermé). Aucun pays
  // provenant du body/query/session/client n'est accepté.
  if (launchEligibleCountries().length > 0) {
    if (!user.countryVerifiedAt) return 'COUNTRY_NOT_ELIGIBLE'
    if (!launchEligibleCountries().includes(user.country)) return 'COUNTRY_NOT_ELIGIBLE'
  }
  // N'a jamais eu d'abonnement payant.
  const paidSub = await client.subscription.findFirst({
    where: { userId, plan: { not: 'decouverte' } },
    select: { id: true },
  })
  if (paidSub) return 'ALREADY_SUBSCRIBED'
  // N'a jamais consommé la campagne.
  const redeemed = await client.promotionRedemption.findUnique({
    where: { campaignId_userId: { campaignId, userId } },
    select: { id: true },
  })
  if (redeemed) return 'OFFER_ALREADY_REDEEMED'
  // Réservation active existante : une réservation périmée (expiresAt < now)
  // ne bloque PAS (elle sera expirée par le nettoyage dans la transaction).
  const activeReservation = await client.promotionReservation.findFirst({
    where: { campaignId, userId, status: 'ACTIVE', expiresAt: { gte: new Date() } },
    select: { id: true },
  })
  if (activeReservation) return 'ACTIVE_RESERVATION_EXISTS'
  return null
}

export async function checkEligibility(args: {
  userId: string
  offerCode: string
  planId: string
  platform: string
  countryHint?: string
}, client: LaunchDb = db): Promise<{ eligible: boolean; reasonCode: EligibilityReason | null; offer: OfferView | null; campaign: CampaignView | null }> {
  const c = await loadCampaign(client)
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

  const accountReason = await assertAccountEligibility(client, campaign.id, args.userId)
  if (accountReason) return { eligible: false, reasonCode: accountReason, offer: null, campaign: null }

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
 *  - toutes les règles d'éligibilité s'appliquent (compte, pays serveur,
 *    abonnement, historique, formulaire, plateforme, quotas) ;
 *  - UPDATE conditionnel atomique sur l'allocation ;
 *  - insertion de la réservation (idempotence par idempotencyKey unique) ;
 *  - une idempotencyKey existante n'est réutilisée que si elle appartient au
 *    même utilisateur ET correspond à la même offre/formule/plateforme ;
 *  - jeton signé, hash seul stocké ; échec sécurisé si aucun secret.
 */
export async function createReservation(args: {
  userId: string
  offerCode: string
  planId: string
  platform: string
  idempotencyKey: string
  countryHint?: string
}, client: LaunchDb = db): Promise<ReserveResult> {
  if (!launchOffersEnabled()) return { ok: false, reasonCode: 'CAMPAIGN_NOT_STARTED' }
  // Échec sécurisé : campagne active sans secret de signature.
  try {
    requireSigningSecret()
  } catch {
    return { ok: false, reasonCode: 'SIGNING_SECRET_MISSING' }
  }

  const c = await loadCampaign(client)
  if (!c) return { ok: false, reasonCode: 'CAMPAIGN_NOT_STARTED' }
  const { campaign, variants, allocations } = c

  const stateReason = campaignState(campaign)
  if (stateReason) return { ok: false, reasonCode: stateReason }

  const variant = variants.find((v) => v.code === args.offerCode)
  if (!variant || !variantState(variant)) return { ok: false, reasonCode: 'CAMPAIGN_ENDED' }
  if (!isLaunchPlatform(args.platform)) return { ok: false, reasonCode: 'PLATFORM_NOT_ELIGIBLE' }

  // Plan éligible (mêmes règles que checkEligibility).
  const eligiblePlans = parseJsonArray(variant.eligiblePlanIds || campaign.eligiblePlanIds || null).length
    ? parseJsonArray(variant.eligiblePlanIds || campaign.eligiblePlanIds || null)
    : launchEligiblePlanIds()
  if (!eligiblePlans.includes(args.planId)) return { ok: false, reasonCode: 'PLAN_NOT_ELIGIBLE' }

  const pricing = computeLaunchPricing(args.offerCode, args.planId as PlanId)
  if (!pricing) return { ok: false, reasonCode: 'PRICE_CONFIGURATION_INVALID' }

  // Idempotence (AVANT les règles de compte) : une même clé ne doit être
  // réutilisée que par le même utilisateur avec la même offre/formule/
  // plateforme. Un replay légitime retourne la réservation existante ; une clé
  // réutilisée par un autre utilisateur/contexte → conflit sans exposer.
  const existing = await client.promotionReservation.findUnique({ where: { idempotencyKey: args.idempotencyKey } })
  if (existing) {
    const matches = existing.userId === args.userId
      && existing.variantId === variant.id
      && existing.planId === args.planId
      && existing.platform === args.platform
    if (!matches) return { ok: false, reasonCode: 'IDEMPOTENCY_KEY_CONFLICT' }
    return {
      ok: true,
      reservationId: existing.id,
      reservationToken: signReservationToken({ reservationId: existing.id, userId: existing.userId, offerCode: args.offerCode, planId: existing.planId, platform: existing.platform, expiresAt: existing.expiresAt.toISOString() }),
      expiresAt: existing.expiresAt,
      offerCode: args.offerCode,
    }
  }

  // Compte + pays serveur + historique.
  const accountReason = await assertAccountEligibility(client, campaign.id, args.userId)
  if (accountReason) return { ok: false, reasonCode: accountReason }

  const allocation = allocationFor(variants, allocations, args.offerCode, args.platform as LaunchPlatform, args.planId)
  if (!allocation) return { ok: false, reasonCode: 'ALLOCATION_EXHAUSTED' }

  const now = new Date()
  const expiresAt = new Date(now.getTime() + launchReservationTtlSeconds() * 1000)

  try {
    const result = await withBusyRetry(() => client.$transaction(async (tx) => {
      // Relire la campagne DANS la transaction (P2#3) : une pause/fin peut être
      // intervenue après `campaignState`. CAS/fence sur campaign.version et
      // status ACTIVE pour sérialiser avec setCampaignStatus.
      const freshCampaign = await tx.promotionCampaign.findUnique({
        where: { code: launchCampaignCode() },
        select: { id: true, status: true, startsAt: true, endsAt: true, version: true },
      })
      if (!freshCampaign) return { ok: false as const, reasonCode: 'CAMPAIGN_NOT_STARTED' as EligibilityReason }
      const freshState = campaignState(freshCampaign)
      if (freshState) return { ok: false as const, reasonCode: freshState }

      // Expire d'ABORD les réservations périmées de CET utilisateur (P1#2) :
      // une réservation ACTIVE avec expiresAt < now ne bloque plus une nouvelle
      // tentative (l'ancienne place est libérée + clé d'unicité supprimée).
      await expireUserReservationsInTx(tx, campaign.id, args.userId, now)

      // Relecture FRAÎCHE de l'allocation dans la transaction (jamais la valeur
      // capturée avant) : un reallocate concurrent peut avoir changé quota/version.
      const fresh = await freshAllocation(tx, allocation.id)
      if (!fresh) return { ok: false as const, reasonCode: 'ALLOCATION_EXHAUSTED' as EligibilityReason }

      // Unicité d'UNIQUE réservation ACTIVE par (campaignId, userId) : après
      // expiration des périmées, toute réservation encore ACTIVE est réellement
      // active (expiresAt >= now) et bloque.
      const stillActive = await tx.promotionReservation.findFirst({
        where: { campaignId: campaign.id, userId: args.userId, status: 'ACTIVE' },
        select: { id: true },
      })
      if (stillActive) return { ok: false as const, reasonCode: 'ACTIVE_RESERVATION_EXISTS' as EligibilityReason }

      // Nettoyage paresseux des réservations expirées de cette allocation
      // (autres utilisateurs). Statut ET compteur dans la même transaction.
      const expired = await tx.promotionReservation.updateMany({
        where: { allocationId: allocation.id, status: 'ACTIVE', expiresAt: { lt: now } },
        data: { status: 'EXPIRED', activeUserKey: null },
      })
      if (expired.count > 0) {
        // CAS avec version : si une réallocation est intervenue, le CAS échoue
        // → exception → rollback complet (le return COMMITTERAIT l'expiration).
        const decOk = await casAllocation(tx, fresh, { reservedCount: { decrement: expired.count } })
        if (!decOk) throw new AllocationVersionConflict()
        // Relecture fraîche après le décrément (version incrémentée).
        const afterClean = await freshAllocation(tx, allocation.id)
        if (!afterClean) return { ok: false as const, reasonCode: 'ALLOCATION_EXHAUSTED' as EligibilityReason }
        // Recalcul fiable des compteurs depuis les lignes (pas seulement les caches).
        const activeReservationsAfter = await tx.promotionReservation.count({ where: { allocationId: allocation.id, status: 'ACTIVE' } })
        const confirmedAfter = await tx.promotionRedemption.count({ where: { allocationId: allocation.id } })
        const availableAfter = afterClean.quota - confirmedAfter - activeReservationsAfter - afterClean.safetyBuffer
        if (availableAfter <= 0) return { ok: false as const, reasonCode: 'ALLOCATION_EXHAUSTED' as EligibilityReason }
        // Claim atomique avec CAS (version fraîche post-nettoyage).
        const claimed = await casAllocation(tx, afterClean, { reservedCount: { increment: 1 } })
        if (!claimed) throw new AllocationVersionConflict()
      } else {
        // Aucun nettoyage : relecture fraîche + compteurs depuis les lignes.
        const activeReservations = await tx.promotionReservation.count({ where: { allocationId: allocation.id, status: 'ACTIVE' } })
        const confirmed = await tx.promotionRedemption.count({ where: { allocationId: allocation.id } })
        const available = fresh.quota - confirmed - activeReservations - fresh.safetyBuffer
        if (available <= 0) return { ok: false as const, reasonCode: 'ALLOCATION_EXHAUSTED' as EligibilityReason }
        // Claim atomique avec CAS incluant quota+version+compteurs.
        const claimed = await casAllocation(tx, fresh, { reservedCount: { increment: 1 } })
        if (!claimed) throw new AllocationVersionConflict()
      }

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
          activeUserKey: activeUserKeyFor(campaign.id, args.userId),
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
    if (err instanceof AllocationVersionConflict) {
      // Après épuisement des tentatives bornées : l'état a changé trop souvent.
      return { ok: false, reasonCode: 'ALLOCATION_EXHAUSTED', error: 'allocation_conflict' }
    }
    if (err?.code === 'P2002') {
      // Conflit d'unicité : soit l'idempotencyKey (replay), soit la clé
      // activeUserKey (une réservation ACTIVE concurrente). On distingue les
      // deux précisément.
      const existingNow = await client.promotionReservation.findUnique({ where: { idempotencyKey: args.idempotencyKey } })
      if (existingNow && existingNow.userId === args.userId && existingNow.variantId === variant.id && existingNow.planId === args.planId && existingNow.platform === args.platform) {
        return {
          ok: true,
          reservationId: existingNow.id,
          reservationToken: signReservationToken({ reservationId: existingNow.id, userId: existingNow.userId, offerCode: args.offerCode, planId: existingNow.planId, platform: existingNow.platform, expiresAt: existingNow.expiresAt.toISOString() }),
          expiresAt: existingNow.expiresAt,
          offerCode: args.offerCode,
        }
      }
      // Sinon : conflit activeUserKey (réservation ACTIVE concurrente d'une
      // autre requête) → refus explicite.
      return { ok: false, reasonCode: 'ACTIVE_RESERVATION_EXISTS' }
    }
    return { ok: false, reasonCode: 'RISK_REVIEW_REQUIRED', error: err?.message }
  }
}

/** Libère explicitement une réservation abandonnée (idempotente). */
export async function releaseReservation(reservationId: string, userId: string, client: LaunchDb = db): Promise<{ ok: boolean }> {
  const reservation = await client.promotionReservation.findUnique({ where: { id: reservationId } })
  if (!reservation || reservation.userId !== userId) return { ok: false }
  if (reservation.status !== 'ACTIVE') return { ok: true }
  try {
    await withBusyRetry(() => client.$transaction(async (tx) => {
      // La transition ACTIVE → CANCELLED gâte le décrément : une réservation déjà
      // expirée, consommée ou annulée (par un traitement concurrent) ne décrémente
      // jamais une seconde fois, et c'est bien l'allocation de la réservation qui
      // est ciblée.
      const cancelled = await tx.promotionReservation.updateMany({
        where: { id: reservationId, status: 'ACTIVE' },
        data: { status: 'CANCELLED', activeUserKey: null },
      })
      if (cancelled.count === 1) {
        // Relecture FRAÎCHE + CAS (version/quota/compteurs) : une réallocation
        // concurrente invalide le décrément → rollback.
        const fresh = await freshAllocation(tx, reservation.allocationId)
        if (!fresh) throw new AllocationVersionConflict()
        const decOk = await casAllocation(tx, fresh, { reservedCount: { decrement: 1 } })
        if (!decOk) throw new AllocationVersionConflict()
      }
    }))
  } catch (err: any) {
    // Échec sûr : la transaction a été annulée (aucune mutation partielle).
    if (err instanceof AllocationVersionConflict) return { ok: false }
    return { ok: false }
  }
  void trackEventServer('launch_checkout_abandoned', { reservationId })
  return { ok: true }
}

/** Expire les réservations dépassées (job périodique ; le chemin de réservation nettoie aussi). */
export async function expireDueReservations(limit = 500, client: LaunchDb = db): Promise<number> {
  const now = new Date()
  const due = await client.promotionReservation.findMany({
    where: { status: 'ACTIVE', expiresAt: { lt: now } },
    take: limit,
    select: { id: true, allocationId: true },
  })
  if (due.length === 0) return 0
  await withBusyRetry(() => client.$transaction(async (tx) => {
    for (const r of due) {
      const updated = await tx.promotionReservation.updateMany({ where: { id: r.id, status: 'ACTIVE' }, data: { status: 'EXPIRED', activeUserKey: null } })
      if (updated.count === 1) {
        // Relecture FRAÎCHE + CAS (version/quota/compteurs) : une réallocation
        // concurrente invalide le décrément → rollback.
        const fresh = await freshAllocation(tx, r.allocationId)
        if (!fresh) throw new AllocationVersionConflict()
        const decOk = await casAllocation(tx, fresh, { reservedCount: { decrement: 1 } })
        if (!decOk) throw new AllocationVersionConflict()
      }
    }
  }))
  return due.length
}

export type ConfirmResult =
  | { ok: true; redemptionId: string; alreadyProcessed: boolean; lateConfirmation: boolean }
  | { ok: false; reasonCode: EligibilityReason | 'ALREADY_PROCESSED'; error?: string }

/**
 * Abandon d'une transaction interactive avec un code métier précis.
 *
 * Un simple `return` dans un `$transaction` interactif COMMIT les écritures déjà
 * effectuées ; seul un throw déclenche le rollback. Les rejets métier qui
 * surviennent APRÈS une écriture (ex. transition de réservation) doivent donc
 * lever cette erreur pour annuler proprement la transaction sans laisser
 * d'état partiel, tout en remontant le bon code de raison.
 */
class TxAbort extends Error {
  constructor(readonly reasonCode: EligibilityReason) {
    super(reasonCode)
    this.name = 'TxAbort'
  }
}

/**
 * Consomme le quota après vérification serveur du paiement (idempotent).
 *  - montants validés contre le pricing serveur (plans.ts) — jamais dérivés du
 *    client ;
 *  - contrainte unique (provider, providerTransactionId) et (campaignId, userId) ;
 *  - application atomique des quotas GLOBAL (campaign.confirmedCount vs
 *    totalQuota) ET par allocation (allocation.confirmedCount vs quota) ;
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
}, client: LaunchDb = db): Promise<ConfirmResult> {
  if (!launchOffersEnabled()) return { ok: false, reasonCode: 'CAMPAIGN_NOT_STARTED' }

  const c = await loadCampaign(client)
  if (!c) return { ok: false, reasonCode: 'CAMPAIGN_NOT_STARTED' }
  const { campaign, variants, allocations } = c
  const variant = variants.find((v) => v.code === args.offerCode)
  if (!variant) return { ok: false, reasonCode: 'CAMPAIGN_ENDED' }

  // Correspondance fournisseur → plateforme (P2#4) : STRIPE→WEB, APPLE→IOS,
  // GOOGLE→ANDROID. Imposée AVANT la sélection de l'allocation et avant toute
  // mutation : toute autre combinaison est refusée sans redemption ni changement
  // de compteur (provenance de paiement incohérente → ne pas consommer le quota
  // du mauvais canal).
  const providerPlatform: Record<'STRIPE' | 'APPLE' | 'GOOGLE', string> = { STRIPE: 'WEB', APPLE: 'IOS', GOOGLE: 'ANDROID' }
  if (providerPlatform[args.provider] !== args.platform) {
    return { ok: false, reasonCode: 'PLATFORM_NOT_ELIGIBLE' }
  }

  const allocation = allocationFor(variants, allocations, args.offerCode, args.platform as LaunchPlatform, args.planId)
  if (!allocation) return { ok: false, reasonCode: 'ALLOCATION_EXHAUSTED' }

  // Montants = pricing serveur uniquement. Une valeur différente (fournie par le
  // client ou incohérente avec le catalogue) est rejetée.
  const pricing = computeLaunchPricing(args.offerCode, args.planId as PlanId)
  if (!pricing) return { ok: false, reasonCode: 'PRICE_CONFIGURATION_INVALID' }
  if (args.normalAmountMinor !== pricing.renewalMinor || args.paidAmountMinor !== pricing.dueNowMinor) {
    return { ok: false, reasonCode: 'PRICE_CONFIGURATION_INVALID', error: 'amount_mismatch_server_pricing' }
  }
  // Devise (P2#4) : normalisée en majuscules ; si absente, la devise serveur du
  // pricing est utilisée ; sinon EXIGENCE exacte currency === pricing.currency.
  // Toute autre devise est refusée AVANT la transaction (aucune mutation).
  const normalizedCurrency = (args.currency || pricing.currency).trim().toUpperCase()
  if (normalizedCurrency !== pricing.currency) {
    return { ok: false, reasonCode: 'PRICE_CONFIGURATION_INVALID', error: 'currency_mismatch_server_pricing' }
  }

  try {
    const result = await withBusyRetry(() => client.$transaction(async (tx) => {
      // Relecture FRAÎCHE de l'allocation dans la transaction (jamais la valeur
      // capturée avant) : un reallocate concurrent peut avoir changé quota/version.
      const fresh = await freshAllocation(tx, allocation.id)
      if (!fresh) return { ok: false as const, reasonCode: 'ALLOCATION_EXHAUSTED' as EligibilityReason }

      // Idempotence fournisseur (P2#4) : l'identité est composite
      // (provider, providerTransactionId). Une redemption existante n'est
      // réutilisée comme `alreadyProcessed` QUE si elle correspond au même
      // provider, utilisateur, campagne, variante/offre, allocation, plan,
      // plateforme et contexte de réservation compatible. Toute différence est
      // un refus sûr sans aucune mutation de quota.
      const existing = await tx.promotionRedemption.findUnique({
        where: { provider_providerTransactionId: { provider: args.provider, providerTransactionId: args.providerTransactionId } },
      })
      if (existing) {
        const ctxOk =
          existing.provider === args.provider &&
          existing.userId === args.userId &&
          existing.campaignId === campaign.id &&
          existing.variantId === variant.id &&
          existing.allocationId === allocation.id &&
          existing.planId === args.planId &&
          existing.platform === args.platform &&
          existing.currency === normalizedCurrency
        if (!ctxOk) {
          // Le même ID existe chez un autre contexte (collision de fournisseur,
          // webhook malformé, rejeu avec mauvais user/offre) → refus sûr.
          return { ok: false as const, reasonCode: 'PAYMENT_CONTEXT_MISMATCH' as EligibilityReason }
        }
        return { ok: true as const, redemptionId: existing.id, alreadyProcessed: true, lateConfirmation: false }
      }

      const now = new Date()

      // Réservation : validation COMPLÈTE du contexte avant toute mutation de
      // quota (P1#5). La réservation doit appartenir au payeur et correspondre
      // exactement à la campagne, la variante, l'allocation, la formule et la
      // plateforme réellement payées.
      let reservation: Awaited<ReturnType<LaunchDb['promotionReservation']['findUnique']>> = null
      let lateConfirmation = false
      let convertActive = false
      // Par défaut, une confirmation sans réservation passe par le chemin
      // « capacité non réservée ».
      let useUnreservedPath = !args.reservationId
      if (args.reservationId) {
        reservation = await tx.promotionReservation.findUnique({ where: { id: args.reservationId } })
        if (!reservation) {
          return { ok: false as const, reasonCode: 'ACTIVE_RESERVATION_EXISTS' as EligibilityReason }
        }
        const ctxOk =
          reservation.userId === args.userId &&
          reservation.campaignId === campaign.id &&
          reservation.variantId === variant.id &&
          reservation.allocationId === allocation.id &&
          reservation.planId === args.planId &&
          reservation.platform === args.platform
        if (!ctxOk) {
          // Erreur métier sûre : aucun quota consommé, aucun compteur modifié,
          // aucune donnée d'un autre utilisateur révélée.
          return { ok: false as const, reasonCode: 'RESERVATION_MISMATCH' as EligibilityReason }
        }
        // Statuts admissibles : ACTIVE (conversion ou tardif) ou EXPIRED (tardif).
        // Tout autre statut est refusé SANS aucune mutation de quota.
        if (reservation.status !== 'ACTIVE' && reservation.status !== 'EXPIRED') {
          return { ok: false as const, reasonCode: 'ACTIVE_RESERVATION_EXISTS' as EligibilityReason }
        }

        if (reservation.status === 'ACTIVE') {
          if (reservation.expiresAt >= now) {
            // Conversion directe de la réservation ACTIVE du payeur.
            convertActive = true
          } else {
            // Confirmation tardive DIRECTE : la réservation est ACTIVE mais son
            // TTL est dépassé, et reservedCount inclut encore cette réservation.
            // On effectue ATOMIQUEMENT la transition ACTIVE → EXPIRED puis on
            // décrémente reservedCount exactement une fois — uniquement si la
            // transition a réellement affecté CETTE réservation, et sur SON
            // allocationId (jamais la réservation d'un autre utilisateur).
            const expired = await tx.promotionReservation.updateMany({
              where: { id: reservation.id, status: 'ACTIVE', expiresAt: { lt: now } },
              data: { status: 'EXPIRED', activeUserKey: null },
            })
            if (expired.count === 1) {
              // Décrément versionné via CAS : une réallocation concurrente
              // invalide la mutation → rollback.
              const freshNow = await freshAllocation(tx, reservation.allocationId)
              if (!freshNow) throw new AllocationVersionConflict()
              const decOk = await casAllocation(tx, freshNow, { reservedCount: { decrement: 1 } })
              if (!decOk) throw new AllocationVersionConflict()
            }
            // expired.count === 0 → un traitement concurrent a déjà expiré la
            // réservation : aucun décrément supplémentaire.
            lateConfirmation = true
            useUnreservedPath = true
          }
        } else {
          // status === 'EXPIRED' : confirmation tardive, chemin capacité libre.
          lateConfirmation = true
          useUnreservedPath = true
        }
      }

      // Unicité compte/campagne.
      const dup = await tx.promotionRedemption.findUnique({
        where: { campaignId_userId: { campaignId: campaign.id, userId: args.userId } },
      })
      if (dup) return { ok: false as const, reasonCode: 'OFFER_ALREADY_REDEEMED' as EligibilityReason }

      if (convertActive && reservation) {
        // CHEMIN 1 — Conversion de la réservation ACTIVE appartenant au payeur :
        // sa propre place réservée devient confirmée. AUCUNE place libre
        // supplémentaire n'est réclamée. La transition ACTIVE → CONSUMED est
        // effectuée D'ABORD (atomicité) : si elle n'affecte pas la réservation
        // attendue, aucun quota n'est consommé.
        const transitioned = await tx.promotionReservation.updateMany({
          where: { id: reservation.id, status: 'ACTIVE', expiresAt: { gte: now } },
          data: { status: 'CONSUMED', activeUserKey: null },
        })
        if (transitioned.count !== 1) {
          // Réservation plus active (expirée entre-temps) → confirmation tardive :
          // même traitement que la confirmation tardive directe (transition
          // ACTIVE → EXPIRED + décrément unique via CAS versionné).
          const expired = await tx.promotionReservation.updateMany({
            where: { id: reservation.id, status: 'ACTIVE', expiresAt: { lt: now } },
            data: { status: 'EXPIRED', activeUserKey: null },
          })
          if (expired.count === 1) {
            const freshNow = await freshAllocation(tx, reservation.allocationId)
            if (!freshNow) throw new AllocationVersionConflict()
            const decOk = await casAllocation(tx, freshNow, { reservedCount: { decrement: 1 } })
            if (!decOk) throw new AllocationVersionConflict()
          }
          lateConfirmation = true
          useUnreservedPath = true
        } else {
          // Conversion 1:1 : +1 confirmé / -1 réservé en UNE instruction
          // atomique avec CAS (version/quota/compteurs). Un concurrent
          // (réallocation/réservation) invalide la mutation → rollback de la
          // transition ACTIVE → CONSUMED.
          const freshNow = await freshAllocation(tx, allocation.id)
          if (!freshNow) throw new AllocationVersionConflict()
          const allocOk = await casAllocation(tx, freshNow, { confirmedCount: { increment: 1 }, reservedCount: { decrement: 1 } })
          if (!allocOk) throw new AllocationVersionConflict()
        }
      }

      if (useUnreservedPath) {
        // CHEMIN 2 — Confirmation sans réservation active (absente), réservation
        // EXPIRED, ou réservation ACTIVE récemment expirée (transition faite
        // plus haut) : consomme UNIQUEMENT une capacité réellement non réservée.
        // On relit l'allocation fraîche + compteurs depuis les lignes — la
        // réservation expirée n'est plus ACTIVE donc plus comptée dans
        // reservedNow — puis on réclame la place via un CAS atomique versionné
        // (quota/version/compteurs) : la capacité détenue par une réservation
        // active d'un autre client est toujours préservée, et deux confirmations
        // concurrentes ne peuvent jamais dépasser le quota.
        const freshNow = await freshAllocation(tx, allocation.id)
        if (!freshNow) throw new AllocationVersionConflict()
        const confirmedNow = await tx.promotionRedemption.count({ where: { allocationId: allocation.id } })
        const reservedNow = await tx.promotionReservation.count({ where: { allocationId: allocation.id, status: 'ACTIVE' } })
        const available = freshNow.quota - confirmedNow - reservedNow - freshNow.safetyBuffer
        if (available <= 0) return { ok: false as const, reasonCode: 'ALLOCATION_EXHAUSTED' as EligibilityReason }
        const allocOk = await casAllocation(tx, freshNow, { confirmedCount: { increment: 1 } })
        if (!allocOk) throw new AllocationVersionConflict()
      }

      // Quota global : claim atomique conditionnel. En cas d'échec, la
      // transaction entière est annulée (claims + transition réservation).
      const globalClaim = await tx.promotionCampaign.updateMany({
        where: { id: campaign.id, confirmedCount: { lt: campaign.totalQuota } },
        data: { confirmedCount: { increment: 1 } },
      })
      if (globalClaim.count === 0) throw new TxAbort('QUOTA_EXHAUSTED')

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
          normalAmountMinor: pricing.renewalMinor,
          paidAmountMinor: pricing.dueNowMinor,
          discountAmountMinor: pricing.renewalMinor - pricing.dueNowMinor,
          currency: normalizedCurrency,
          status: 'CONFIRMED',
          confirmedAt: new Date(),
          metadata: lateConfirmation ? JSON.stringify({ late_confirmation: true }) : null,
        },
      })

      // Une confirmation tardive laisse la réservation associée dans un état
      // final cohérent : CONSUMED (elle a été consommée par cette redemption).
      // Idempotent : si un concurrent l'a déjà consommée/expirée, aucun effet.
      if (reservation && lateConfirmation) {
        await tx.promotionReservation.updateMany({
          where: { id: reservation.id, status: 'EXPIRED' },
          data: { status: 'CONSUMED' },
        })
      }

      return { ok: true as const, redemptionId: redemption.id, alreadyProcessed: false, lateConfirmation }
    }))

    if (!result.ok) return { ok: false, reasonCode: result.reasonCode }
    void trackEventServer(result.lateConfirmation ? 'launch_purchase_late_confirmation' : 'launch_purchase_confirmed', { campaign: campaign.code, variant: args.offerCode, plan: args.planId, platform: args.platform, provider: args.provider })
    return { ok: true, redemptionId: result.redemptionId, alreadyProcessed: result.alreadyProcessed, lateConfirmation: result.lateConfirmation }
  } catch (err: any) {
    if (err instanceof AllocationVersionConflict) {
      // Après épuisement des tentatives bornées : l'état a changé trop souvent.
      return { ok: false, reasonCode: 'ALLOCATION_EXHAUSTED', error: 'allocation_conflict' }
    }
    if (err instanceof TxAbort) return { ok: false, reasonCode: err.reasonCode }
    if (err?.code === 'P2002') {
      // Course sur la clé composite (provider, providerTransactionId) : relire
      // la redemption et valider le contexte avant de retourner alreadyProcessed.
      const raced = await client.promotionRedemption.findUnique({
        where: { provider_providerTransactionId: { provider: args.provider, providerTransactionId: args.providerTransactionId } },
      })
      if (raced) {
        const ctxOk =
          raced.userId === args.userId &&
          raced.campaignId === c!.campaign.id &&
          raced.variantId === variant.id &&
          raced.allocationId === allocation.id &&
          raced.planId === args.planId &&
          raced.platform === args.platform &&
          raced.currency === normalizedCurrency
        if (ctxOk) return { ok: true, redemptionId: raced.id, alreadyProcessed: true, lateConfirmation: false }
        return { ok: false, reasonCode: 'PAYMENT_CONTEXT_MISMATCH' }
      }
      return { ok: false, reasonCode: 'ALREADY_PROCESSED', error: 'duplicate' }
    }
    return { ok: false, reasonCode: 'RISK_REVIEW_REQUIRED', error: err?.message }
  }
}
