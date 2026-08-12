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
 * - aucun graphe partiel possible : tout ou rien ;
 * - deux initialisations concurrentes : le second échec P2002 (code unique) est
 *   converti en résultat idempotent `{ created: false }` ;
 * - après création, vérifie que le graphe attendu est complet.
 */
export async function seedCampaign(client: LaunchDb = db): Promise<{ created: boolean }> {
  const existing = await client.promotionCampaign.findUnique({ where: { code: launchCampaignCode() } })
  if (existing) return { created: false }

  try {
    await client.$transaction(async (tx) => {
      const campaign = await tx.promotionCampaign.create({
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
 * Réallocation sûre : ne déplace que les places non confirmées et non réservées.
 * Garde-fous :
 *   - impossible de réduire sous confirmed + active_reserved ;
 *   - la somme des allocations de la variante ne dépasse jamais `variant.quota` ;
 *   - le total des allocations de la campagne ne dépasse jamais `campaign.totalQuota`
 *     (agrégation limitée aux variantes de la campagne courante).
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

  // Garde-fou variante : la somme des allocations de cette variante ne doit
  // jamais dépasser `variant.quota`.
  const variantAllocs = await client.promotionAllocation.findMany({ where: { variantId: variant.id } })
  const variantSum = variantAllocs.reduce((s, a) => s + a.quota, 0)
  const variantNewSum = variantSum - allocation.quota + args.newQuota
  if (variantNewSum > variant.quota) return { ok: false, error: 'exceeds_variant_quota' }

  // Garde-fou campagne : agrégation limitée AUX variantes de la campagne
  // courante (une ancienne campagne ne doit jamais influencer la réallocation).
  const variantIds = (await client.promotionVariant.findMany({ where: { campaignId: campaign.id }, select: { id: true } })).map((v) => v.id)
  const totalAllocations = await client.promotionAllocation.aggregate({
    where: { variantId: { in: variantIds } },
    _sum: { quota: true },
  })
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
