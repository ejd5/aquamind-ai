/**
 * AQWELIA Launch offers — administration (spec v1.0 §15).
 *
 * Toutes les actions d'administration sont auditées (PromotionAuditLog).
 * Garde-fous :
 *   - impossible de définir un quota < confirmed + active_reserved ;
 *   - la réallocation ne déplace que les places non consommées et non réservées ;
 *   - jamais de changement silencieux de quota global.
 */

import { db } from '@/lib/db'
import { randomUUID } from 'crypto'
import type { LaunchDb } from './service'
import {
  launchOffersEnabled,
  launchCampaignCode,
  launchTotalQuota,
  launchQuotaA,
  launchQuotaB,
  launchAllocationDefaults,
  launchEligibleCountries,
  launchEligiblePlanIds,
} from './config'

/** Crée la campagne + variantes + allocations si absentes (idempotent). */
export async function seedCampaign(client: LaunchDb = db): Promise<{ created: boolean }> {
  const existing = await client.promotionCampaign.findUnique({ where: { code: launchCampaignCode() } })
  if (existing) return { created: false }

  const campaign = await client.promotionCampaign.create({
    data: {
      code: launchCampaignCode(),
      name: 'Offres de lancement AQWELIA',
      status: 'DRAFT',
      totalQuota: launchTotalQuota(),
      confirmedCount: 0,
      eligibleCountries: JSON.stringify(launchEligibleCountries()),
      eligiblePlanIds: JSON.stringify(launchEligiblePlanIds()),
    },
  })

  const variants = [
    { code: 'LAUNCH50_MONTHLY', quota: launchQuotaA(), billingPeriod: 'P1M', discountKind: 'PERCENT_ONCE', discountValue: 50 },
    { code: 'LAUNCH3FOR2_QUARTERLY', quota: launchQuotaB(), billingPeriod: 'P3M', discountKind: 'AMOUNT_ONCE', discountValue: 0 },
  ]
  for (const v of variants) {
    const variant = await client.promotionVariant.create({ data: { campaignId: campaign.id, ...v } })
    const alloc = launchAllocationDefaults()[v.code]
    for (const platform of ['WEB', 'IOS', 'ANDROID'] as const) {
      const quota = alloc[platform.toLowerCase() as keyof typeof alloc]
      await client.promotionAllocation.create({
        data: { variantId: variant.id, platform, planId: null, quota },
      })
    }
  }
  return { created: true }
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
 * Réallocation sûre : ne déplace que les places non confirmées et non réservées.
 * Garde-fou : impossible de réduire sous confirmed + active_reserved.
 */
export async function reallocate(args: {
  variantCode: string
  platform: string
  newQuota: number
  actor: string
  reason?: string
}, client: LaunchDb = db): Promise<{ ok: boolean; error?: string }> {
  if (!launchOffersEnabled()) return { ok: false, error: 'campaign_disabled' }
  const campaign = await client.promotionCampaign.findUnique({ where: { code: launchCampaignCode() } })
  if (!campaign) return { ok: false, error: 'campaign_not_found' }
  const variant = await client.promotionVariant.findFirst({ where: { campaignId: campaign.id, code: args.variantCode } })
  if (!variant) return { ok: false, error: 'variant_not_found' }
  const allocation = await client.promotionAllocation.findFirst({ where: { variantId: variant.id, platform: args.platform, planId: null } })
  if (!allocation) return { ok: false, error: 'allocation_not_found' }

  const floor = allocation.confirmedCount + allocation.reservedCount
  if (args.newQuota < floor) {
    return { ok: false, error: `cannot_set_below_${floor}` }
  }
  // Ne jamais dépasser le quota global de la campagne.
  const totalAllocations = await client.promotionAllocation.aggregate({ _sum: { quota: true } })
  const newTotal = (totalAllocations._sum.quota ?? 0) - allocation.quota + args.newQuota
  if (newTotal > campaign.totalQuota) return { ok: false, error: 'exceeds_global_quota' }

  await client.$transaction([
    client.promotionAllocation.update({ where: { id: allocation.id }, data: { quota: args.newQuota, version: { increment: 1 } } }),
    client.promotionAuditLog.create({
      data: {
        campaignId: campaign.id,
        actor: args.actor,
        action: 'reallocate',
        before: JSON.stringify({ variantCode: variant.code, platform: args.platform, quota: allocation.quota }),
        after: JSON.stringify({ variantCode: variant.code, platform: args.platform, quota: args.newQuota }),
        reason: args.reason,
      },
    }),
  ])
  return { ok: true }
}

/**
 * Remise de place (spec §3 — remboursements et annulations).
 *
 * Par défaut, un remboursement/annulation à la demande du client ne remet PAS
 * la place (anti-abus). Une remise de place est réservée aux cas administratifs
 * (doublon technique, capture double, annulation imputable à AQWELIA) et doit
 * être explicitement validée par un admin. Action auditée.
 */
export async function restoreRedemptionSlot(args: {
  redemptionId: string
  actor: string
  reason: string
}, client: LaunchDb = db): Promise<{ ok: boolean; error?: string }> {
  if (!launchOffersEnabled()) return { ok: false, error: 'campaign_disabled' }
  const redemption = await client.promotionRedemption.findUnique({
    where: { id: args.redemptionId },
    include: { campaign: true, allocation: true },
  })
  if (!redemption) return { ok: false, error: 'redemption_not_found' }
  // Ne remet la place qu'une fois : statut CONFIRMED uniquement.
  if (redemption.status !== 'CONFIRMED') {
    return { ok: false, error: 'redemption_not_restorable' }
  }

  const campaign = redemption.campaign
  const allocation = redemption.allocation
  if (!campaign || !allocation) return { ok: false, error: 'campaign_not_found' }

  // Décrémente atomiquement (jamais en dessous de 0).
  await client.$transaction([
    client.promotionAllocation.updateMany({
      where: { id: allocation.id, confirmedCount: { gt: 0 } },
      data: { confirmedCount: { decrement: 1 } },
    }),
    client.promotionCampaign.updateMany({
      where: { id: campaign.id, confirmedCount: { gt: 0 } },
      data: { confirmedCount: { decrement: 1 } },
    }),
    client.promotionRedemption.update({
      where: { id: redemption.id },
      data: { status: 'TECHNICAL_CANCEL' },
    }),
    client.promotionAuditLog.create({
      data: {
        campaignId: campaign.id,
        actor: args.actor,
        action: 'restore_slot',
        before: JSON.stringify({ redemptionId: redemption.id, status: redemption.status }),
        after: JSON.stringify({ redemptionId: redemption.id, status: 'TECHNICAL_CANCEL' }),
        reason: args.reason,
      },
    }),
  ])
  return { ok: true }
}
