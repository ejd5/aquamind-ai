/**
 * AQWELIA Launch offers — administration (spec v1.0 §15).
 *
 * Toutes les actions d'administration sont auditées (PromotionAuditLog).
 * Garde-fous :
 *   - impossible de définir un quota < confirmed + active_reserved ;
 *   - la réallocation ne déplace que les places non consommées et non réservées ;
 *   - jamais de changement silencieux de quota global ;
 *   - la somme des allocations d'une variante ne dépasse jamais son quota ;
 *   - les agrégats de quotas sont limités à la campagne courante ;
 *   - seedCampaign est atomique (campagne + variantes + allocations dans une
 *     seule transaction, idempotent face aux initialisations concurrentes).
 */

import { db } from '@/lib/db'
import type { LaunchDb } from './service'
import { freshAllocation, casAllocation } from './service'
import {
  launchOffersEnabled,
  launchCampaignCode,
  launchTotalQuota,
  launchQuotaA,
  launchQuotaB,
  computeLaunchAllocationSplit,
  launchEligibleCountries,
  launchEligiblePlanIds,
} from './config'

const VARIANTS = [
  { code: 'LAUNCH50_MONTHLY', quota: () => launchQuotaA(), billingPeriod: 'P1M', discountKind: 'PERCENT_ONCE', discountValue: 50 },
  { code: 'LAUNCH3FOR2_QUARTERLY', quota: () => launchQuotaB(), billingPeriod: 'P3M', discountKind: 'AMOUNT_ONCE', discountValue: 0 },
] as const

const PLATFORMS = ['WEB', 'IOS', 'ANDROID'] as const

/**
 * Crée la campagne + variantes + allocations dans UNE SEULE transaction.
 *
 * - validation des quotas AVANT toute création (P2#3) : entiers non négatifs,
 *   quotaA + quotaB <= totalQuota ; sinon erreur explicite sans rien créer ;
 * - aucun graphe partiel possible : tout ou rien ;
 * - deux initialisations concurrentes : le second échec P2002 (code unique) est
 *   converti en résultat idempotent `{ created: false }` ;
 * - après création, vérifie que le graphe attendu est complet.
 */
export async function seedCampaign(client: LaunchDb = db): Promise<{ created: boolean; error?: string }> {
  const existing = await client.promotionCampaign.findUnique({ where: { code: launchCampaignCode() } })
  if (existing) return { created: false }

  // Cohérence des quotas (P2#3) : entiers valides non négatifs + somme <= total.
  const quotaA = launchQuotaA()
  const quotaB = launchQuotaB()
  const totalQuota = launchTotalQuota()
  for (const [name, value] of [['AQWELIA_LAUNCH_QUOTA_A', quotaA], ['AQWELIA_LAUNCH_QUOTA_B', quotaB], ['AQWELIA_LAUNCH_TOTAL_QUOTA', totalQuota]] as const) {
    if (!Number.isSafeInteger(value) || value < 0) {
      return { created: false, error: `${name} must be a non-negative integer, got ${value}` }
    }
  }
  if (quotaA + quotaB > totalQuota) {
    return { created: false, error: `launch quota A+B (${quotaA}+${quotaB}) exceeds total quota (${totalQuota})` }
  }

  try {
    await client.$transaction(async (tx) => {
      const campaign = await tx.promotionCampaign.create({
        data: {
          code: launchCampaignCode(),
          name: 'Offres de lancement AQWELIA',
          status: 'DRAFT',
          totalQuota,
          confirmedCount: 0,
          eligibleCountries: JSON.stringify(launchEligibleCountries()),
          eligiblePlanIds: JSON.stringify(launchEligiblePlanIds()),
        },
      })

      for (const v of VARIANTS) {
        const variantQuota = v.quota()
        const variant = await tx.promotionVariant.create({
          data: {
            campaignId: campaign.id,
            code: v.code,
            quota: variantQuota,
            billingPeriod: v.billingPeriod,
            discountKind: v.discountKind,
            discountValue: v.discountValue,
          },
        })
        // Allocations dérivées du quota réel de la variante (jamais le split
        // fixe 300/200) : la somme des allocations === quota de la variante.
        const split = computeLaunchAllocationSplit(v.code, variantQuota)
        for (const platform of PLATFORMS) {
          await tx.promotionAllocation.create({
            data: { variantId: variant.id, platform, planId: null, quota: split[platform.toLowerCase() as 'web' | 'ios' | 'android'] },
          })
        }
      }
    })

    // Vérifie que le graphe attendu est complet (2 variantes, 6 allocations).
    const c = await client.promotionCampaign.findUnique({ where: { code: launchCampaignCode() }, include: { variants: { include: { allocations: true } } } })
    const complete = c !== null && c.variants.length === VARIANTS.length && c.variants.flatMap((v) => v.allocations).length === VARIANTS.length * PLATFORMS.length
    if (!complete) return { created: false }
    return { created: true }
  } catch (err: any) {
    // Course d'initialisation : la campagne (ou une contrainte unique) a déjà
    // été créée par un concurrent → résultat idempotent, pas une erreur durable.
    if (err?.code === 'P2002') {
      return { created: false }
    }
    throw err
  }
}

export async function getCampaignAdmin(client: LaunchDb = db) {
  const campaign = await client.promotionCampaign.findUnique({
    where: { code: launchCampaignCode() },
    include: {
      variants: { include: { allocations: true } },
      redemptions: { take: 50, orderBy: { createdAt: 'desc' } },
      auditLogs: { take: 50, orderBy: { createdAt: 'desc' } },
    },
  })
  if (!campaign) return null
  const confirmed = campaign.confirmedCount
  return { ...campaign, confirmed, reserved: campaign.variants.flatMap((v) => v.allocations).reduce((s, a) => s + a.reservedCount, 0) }
}

export async function setCampaignStatus(status: string, actor: string, reason?: string, client: LaunchDb = db): Promise<{ ok: boolean }> {
  const allowed = ['DRAFT', 'SCHEDULED', 'ACTIVE', 'PAUSED', 'EXHAUSTED', 'ENDED']
  if (!allowed.includes(status)) return { ok: false }
  const campaign = await client.promotionCampaign.findUnique({ where: { code: launchCampaignCode() } })
  if (!campaign) return { ok: false }
  await client.$transaction([
    client.promotionCampaign.update({ where: { id: campaign.id }, data: { status, version: { increment: 1 } } }),
    client.promotionAuditLog.create({ data: { campaignId: campaign.id, actor, action: 'status_change', before: JSON.stringify({ status: campaign.status }), after: JSON.stringify({ status }), reason } }),
  ])
  return { ok: true }
}

/**
 * Réallocation sûre et ATOMIQUE (P1#2) : ne déplace que les places non
 * confirmées et non réservées. Toute la relecture, les calculs, la mutation et
 * l'audit se déroulent DANS LA MÊME TRANSACTION, avec un CAS sur
 * `campaign.version` pour sérialiser les réallocations concurrentes :
 *  - impossible de réduire sous confirmed + active_reserved ;
 *  - la somme des allocations de la variante ne dépasse jamais `variant.quota` ;
 *  - le total des allocations de la campagne ne dépasse jamais `campaign.totalQuota`
 *    (agrégation limitée aux variantes de la campagne courante) ;
 *  - si un compteur ou la version a changé entre la relecture et la mutation, la
 *    transaction est annulée et retourne un conflit ;
 *  - aucun audit si la mutation n'a pas eu lieu.
 */
export async function reallocate(args: {
  variantCode: string
  platform: string
  newQuota: number
  actor: string
  reason?: string
}, client: LaunchDb = db): Promise<{ ok: boolean; error?: string }> {
  if (!launchOffersEnabled()) return { ok: false, error: 'campaign_disabled' }

  try {
    const result = await client.$transaction(async (tx) => {
      // Relecture à l'intérieur de la transaction (état courant).
      const campaign = await tx.promotionCampaign.findUnique({ where: { code: launchCampaignCode() } })
      if (!campaign) return { ok: false as const, error: 'campaign_not_found' }
      const variant = await tx.promotionVariant.findFirst({ where: { campaignId: campaign.id, code: args.variantCode } })
      if (!variant) return { ok: false as const, error: 'variant_not_found' }
      const allocation = await tx.promotionAllocation.findFirst({ where: { variantId: variant.id, platform: args.platform, planId: null } })
      if (!allocation) return { ok: false as const, error: 'allocation_not_found' }

      const floor = allocation.confirmedCount + allocation.reservedCount
      if (args.newQuota < floor) {
        return { ok: false as const, error: `cannot_set_below_${floor}` }
      }

      // Garde-fou variante : la somme des allocations de cette variante ne doit
      // jamais dépasser `variant.quota`.
      const variantAllocs = await tx.promotionAllocation.findMany({ where: { variantId: variant.id } })
      const variantSum = variantAllocs.reduce((s, a) => s + a.quota, 0)
      const variantNewSum = variantSum - allocation.quota + args.newQuota
      if (variantNewSum > variant.quota) return { ok: false as const, error: 'exceeds_variant_quota' }

      // Garde-fou campagne : agrégation limitée AUX variantes de la campagne
      // courante (une ancienne campagne ne doit jamais influencer la réallocation).
      const variantIds = (await tx.promotionVariant.findMany({ where: { campaignId: campaign.id }, select: { id: true } })).map((v) => v.id)
      const totalAllocations = await tx.promotionAllocation.aggregate({
        where: { variantId: { in: variantIds } },
        _sum: { quota: true },
      })
      const newTotal = (totalAllocations._sum.quota ?? 0) - allocation.quota + args.newQuota
      if (newTotal > campaign.totalQuota) return { ok: false as const, error: 'exceeds_global_quota' }

      // Mutation conditionnelle de l'allocation : CAS sur ses compteurs/version
      // actuels pour ne pas écraser une réservation/confirmation concurrente.
      const updated = await tx.promotionAllocation.updateMany({
        where: {
          id: allocation.id,
          quota: allocation.quota,
          confirmedCount: allocation.confirmedCount,
          reservedCount: allocation.reservedCount,
          version: allocation.version,
        },
        data: { quota: args.newQuota, version: { increment: 1 } },
      })
      if (updated.count !== 1) {
        // Un concurrent a modifié l'allocation entre la relecture et la mutation.
        return { ok: false as const, error: 'conflict_reallocate_retry' }
      }

      // Sérialise les réallocations concurrentes au niveau de la campagne : CAS
      // sur campaign.version. Si une autre réallocation est passée entre-temps,
      // celle-ci est annulée (rollback) → conflit.
      const bumped = await tx.promotionCampaign.updateMany({
        where: { id: campaign.id, version: campaign.version },
        data: { version: { increment: 1 } },
      })
      if (bumped.count !== 1) {
        throw new Error('launch_campaign_version_conflict')
      }

      // Audit uniquement si la mutation a eu lieu (dans la même transaction).
      await tx.promotionAuditLog.create({
        data: {
          campaignId: campaign.id,
          actor: args.actor,
          action: 'reallocate',
          before: JSON.stringify({ variantCode: variant.code, platform: args.platform, quota: allocation.quota }),
          after: JSON.stringify({ variantCode: variant.code, platform: args.platform, quota: args.newQuota }),
          reason: args.reason,
        },
      })

      return { ok: true as const }
    })
    return result
  } catch (err: any) {
    if (err?.message === 'launch_campaign_version_conflict') {
      return { ok: false, error: 'conflict_reallocate_retry' }
    }
    throw err
  }
}

/**
 * Remise de place (spec §3 — remboursements et annulations).
 *
 * Par défaut, un remboursement/annulation à la demande du client ne remet PAS
 * la place (anti-abus). Une remise de place est réservée aux cas administratifs
 * (doublon technique, capture double, annulation imputable à AQWELIA) et doit
 * être explicitement validée par un admin. Action auditée.
 *
 * ATOMICITÉ : toute la logique se déroule dans UNE transaction interactive —
 * relecture, transition conditionnelle CONFIRMED → TECHNICAL_CANCEL (count===1),
 * décréments (CAS versionné de l'allocation + campagne) et audit. Deux appels
 * concurrents sur la même redemption : un seul obtient count===1, l'autre voit
 * TECHNICAL_CANCEL → redemption_not_restorable sans mutation ni audit.
 */
export async function restoreRedemptionSlot(args: {
  redemptionId: string
  actor: string
  reason: string
}, client: LaunchDb = db): Promise<{ ok: boolean; error?: string }> {
  if (!launchOffersEnabled()) return { ok: false, error: 'campaign_disabled' }

  try {
    const result = await client.$transaction(async (tx) => {
      // Relire la redemption DANS la transaction (état courant).
      const redemption = await tx.promotionRedemption.findUnique({
        where: { id: args.redemptionId },
      })
      if (!redemption) return { ok: false as const, error: 'redemption_not_found' }
      if (redemption.status !== 'CONFIRMED') {
        return { ok: false as const, error: 'redemption_not_restorable' }
      }

      // Transition conditionnelle atomique : un seul appel gagne count===1.
      const transitioned = await tx.promotionRedemption.updateMany({
        where: { id: redemption.id, status: 'CONFIRMED' },
        data: { status: 'TECHNICAL_CANCEL' },
      })
      if (transitioned.count !== 1) {
        // Un concurrent a déjà traité → aucun décrément ni audit.
        return { ok: false as const, error: 'redemption_not_restorable' }
      }

      // Décrément de l'allocation : CAS versionné (version, compteurs, incrément).
      const allocation = await freshAllocation(tx, redemption.allocationId)
      if (!allocation) throw new Error('launch_restore_allocation_missing')
      const allocOk = await casAllocation(tx, allocation, { confirmedCount: { decrement: 1 } })
      if (!allocOk) throw new Error('launch_restore_allocation_conflict')

      // Décrément de la campagne : exactement une fois, jamais en dessous de 0.
      const campaignDec = await tx.promotionCampaign.updateMany({
        where: { id: redemption.campaignId, confirmedCount: { gt: 0 } },
        data: { confirmedCount: { decrement: 1 } },
      })
      if (campaignDec.count !== 1) throw new Error('launch_restore_campaign_conflict')

      // Audit uniquement après le succès de toutes les mutations (même transaction).
      await tx.promotionAuditLog.create({
        data: {
          campaignId: redemption.campaignId,
          actor: args.actor,
          action: 'restore_slot',
          before: JSON.stringify({ redemptionId: redemption.id, status: 'CONFIRMED' }),
          after: JSON.stringify({ redemptionId: redemption.id, status: 'TECHNICAL_CANCEL' }),
          reason: args.reason,
        },
      })

      return { ok: true as const }
    })

    if (!result.ok) return { ok: false, error: result.error }
    return { ok: true }
  } catch (err: any) {
    // Conflit de version d'allocation ou campagne → rollback complet (aucune
    // mutation partielle, aucun audit).
    if (err?.message?.startsWith('launch_restore_')) {
      return { ok: false, error: 'restore_conflict' }
    }
    throw err
  }
}
