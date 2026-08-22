/**
 * AQWELIA — Admin Control Plane · Promotions V2.
 *
 * GET   /api/admin/v1/promotions  -> lecture détaillée sans seed implicite.
 * PATCH /api/admin/v1/promotions  -> mutations humaines, explicites et auditées.
 *
 * Périmètre sûr : cycle de vie, fenêtre temporelle et quotas uniquement.
 * Cette route ne modifie jamais prix, remises, Stripe, RevenueCat, plans,
 * droits produit ou configuration fournisseur.
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdminFromDb } from '@/lib/admin-auth'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ADMIN_STATUSES = new Set(['DRAFT', 'SCHEDULED', 'ACTIVE', 'PAUSED', 'ENDED'])

const TRANSITIONS: Record<string, Set<string>> = {
  DRAFT: new Set(['DRAFT', 'SCHEDULED', 'ACTIVE', 'PAUSED', 'ENDED']),
  SCHEDULED: new Set(['DRAFT', 'SCHEDULED', 'ACTIVE', 'PAUSED', 'ENDED']),
  ACTIVE: new Set(['ACTIVE', 'PAUSED', 'ENDED']),
  PAUSED: new Set(['DRAFT', 'SCHEDULED', 'ACTIVE', 'PAUSED', 'ENDED']),
  EXHAUSTED: new Set(['EXHAUSTED', 'ENDED']),
  ENDED: new Set(['ENDED']),
}

function errorResponse(error: string, status: number) {
  return NextResponse.json({ error }, { status })
}

function parseJsonArray(value: string | null): string[] {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []
  } catch {
    return []
  }
}

function parseDateInput(value: unknown): { ok: true; value: Date | null | undefined } | { ok: false } {
  if (value === undefined) return { ok: true, value: undefined }
  if (value === null || value === '') return { ok: true, value: null }
  if (typeof value !== 'string') return { ok: false }
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? { ok: false } : { ok: true, value: parsed }
}

function parseReason(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const reason = value.trim()
  return reason.length >= 4 && reason.length <= 500 ? reason : null
}

function parseNonNegativeInt(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null
}

async function requireAdmin() {
  const auth = await requireAdminFromDb()
  if (auth.authorized) return { ok: true as const, userId: auth.userId }
  return { ok: false as const, status: auth.reason === 'no-session' ? 401 : 403 }
}

export async function GET() {
  const admin = await requireAdmin()
  if (!admin.ok) return errorResponse(admin.status === 401 ? 'Unauthorized' : 'Forbidden', admin.status)

  const campaigns = await db.promotionCampaign.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      variants: {
        orderBy: { createdAt: 'asc' },
        include: { allocations: { orderBy: [{ platform: 'asc' }, { planId: 'asc' }] } },
      },
      auditLogs: { take: 25, orderBy: { createdAt: 'desc' } },
    },
  })

  return NextResponse.json(
    {
      campaigns: campaigns.map((campaign) => ({
        ...campaign,
        eligibleCountries: parseJsonArray(campaign.eligibleCountries),
        eligiblePlanIds: parseJsonArray(campaign.eligiblePlanIds),
        reservedCount: campaign.variants
          .flatMap((variant) => variant.allocations)
          .reduce((sum, allocation) => sum + allocation.reservedCount, 0),
        variants: campaign.variants.map((variant) => ({
          ...variant,
          eligiblePlanIds: parseJsonArray(variant.eligiblePlanIds),
        })),
      })),
    },
    {
      status: 200,
      headers: { 'Cache-Control': 'private, no-store, max-age=0' },
    }
  )
}

export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin.ok) return errorResponse(admin.status === 401 ? 'Unauthorized' : 'Forbidden', admin.status)

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') return errorResponse('invalid_json', 400)

  const action = typeof body.action === 'string' ? body.action : ''
  const campaignId = typeof body.campaignId === 'string' ? body.campaignId : ''
  const expectedVersion = parseNonNegativeInt(body.expectedVersion)
  const reason = parseReason(body.reason)

  if (!campaignId) return errorResponse('campaign_id_required', 400)
  if (expectedVersion === null) return errorResponse('expected_version_required', 400)
  if (!reason) return errorResponse('reason_required', 400)

  if (action === 'campaign_update') {
    const status = body.status === undefined ? undefined : String(body.status)
    if (status !== undefined && !ADMIN_STATUSES.has(status)) return errorResponse('invalid_status', 400)

    const startsAt = parseDateInput(body.startsAt)
    const endsAt = parseDateInput(body.endsAt)
    if (!startsAt.ok || !endsAt.ok) return errorResponse('invalid_date', 400)

    const requestedQuota = body.totalQuota === undefined ? undefined : parseNonNegativeInt(body.totalQuota)
    if (body.totalQuota !== undefined && requestedQuota === null) return errorResponse('invalid_quota', 400)

    try {
      const result = await db.$transaction(async (tx) => {
        const campaign = await tx.promotionCampaign.findUnique({
          where: { id: campaignId },
          include: { variants: { include: { allocations: true } } },
        })
        if (!campaign) return { ok: false as const, error: 'campaign_not_found', status: 404 }
        if (campaign.version !== expectedVersion) return { ok: false as const, error: 'version_conflict', status: 409 }

        const nextStatus = status ?? campaign.status
        const allowed = TRANSITIONS[campaign.status]
        if (!allowed?.has(nextStatus)) return { ok: false as const, error: 'invalid_transition', status: 409 }

        const nextStartsAt = startsAt.value === undefined ? campaign.startsAt : startsAt.value
        const nextEndsAt = endsAt.value === undefined ? campaign.endsAt : endsAt.value
        if (nextStartsAt && nextEndsAt && nextStartsAt.getTime() >= nextEndsAt.getTime()) {
          return { ok: false as const, error: 'invalid_window', status: 400 }
        }
        if (nextStatus === 'SCHEDULED') {
          if (!nextStartsAt) return { ok: false as const, error: 'scheduled_requires_start', status: 400 }
          if (nextStartsAt.getTime() <= Date.now()) {
            return { ok: false as const, error: 'scheduled_start_must_be_future', status: 400 }
          }
        }
        if (nextStatus === 'ACTIVE' && nextEndsAt && nextEndsAt.getTime() <= Date.now()) {
          return { ok: false as const, error: 'active_campaign_already_ended', status: 400 }
        }

        const allocations = campaign.variants.flatMap((variant) => variant.allocations)
        const reserved = allocations.reduce((sum, allocation) => sum + allocation.reservedCount, 0)
        const allocationQuota = allocations.reduce((sum, allocation) => sum + allocation.quota, 0)
        const variantQuota = campaign.variants.reduce((sum, variant) => sum + variant.quota, 0)
        const nextQuota = requestedQuota ?? campaign.totalQuota
        const minimumQuota = Math.max(campaign.confirmedCount + reserved, allocationQuota, variantQuota)
        if (nextQuota < minimumQuota) {
          return { ok: false as const, error: 'quota_below_committed_capacity', status: 409 }
        }

        const before = {
          status: campaign.status,
          startsAt: campaign.startsAt,
          endsAt: campaign.endsAt,
          totalQuota: campaign.totalQuota,
          version: campaign.version,
        }
        const after = {
          status: nextStatus,
          startsAt: nextStartsAt,
          endsAt: nextEndsAt,
          totalQuota: nextQuota,
          version: campaign.version + 1,
        }

        const updated = await tx.promotionCampaign.updateMany({
          where: { id: campaign.id, version: expectedVersion },
          data: {
            status: nextStatus,
            startsAt: nextStartsAt,
            endsAt: nextEndsAt,
            totalQuota: nextQuota,
            version: { increment: 1 },
          },
        })
        if (updated.count !== 1) return { ok: false as const, error: 'version_conflict', status: 409 }

        await tx.promotionAuditLog.create({
          data: {
            campaignId: campaign.id,
            actor: admin.userId,
            action: 'control_plane_update',
            before: JSON.stringify(before),
            after: JSON.stringify(after),
            reason,
          },
        })
        await tx.adminAuditLog.create({
          data: {
            actor: admin.userId,
            action: 'PROMOTION_CAMPAIGN_UPDATED',
            entityType: 'PromotionCampaign',
            entityId: campaign.id,
            before: JSON.stringify(before),
            after: JSON.stringify(after),
            metadata: JSON.stringify({ reason }),
          },
        })

        return { ok: true as const }
      })

      if (!result.ok) return errorResponse(result.error, result.status)
      return NextResponse.json({ ok: true }, { status: 200 })
    } catch (error) {
      console.error('[admin-promotions] campaign update failed', error)
      return errorResponse('campaign_update_failed', 500)
    }
  }

  if (action === 'variant_quota') {
    const variantId = typeof body.variantId === 'string' ? body.variantId : ''
    const newQuota = parseNonNegativeInt(body.newQuota)
    if (!variantId || newQuota === null) return errorResponse('invalid_variant_quota', 400)

    try {
      const result = await db.$transaction(async (tx) => {
        const campaign = await tx.promotionCampaign.findUnique({ where: { id: campaignId } })
        if (!campaign) return { ok: false as const, error: 'campaign_not_found', status: 404 }
        if (campaign.version !== expectedVersion) return { ok: false as const, error: 'version_conflict', status: 409 }

        const variant = await tx.promotionVariant.findUnique({ where: { id: variantId } })
        if (!variant || variant.campaignId !== campaign.id) {
          return { ok: false as const, error: 'variant_not_found', status: 404 }
        }

        const allocations = await tx.promotionAllocation.findMany({ where: { variantId: variant.id } })
        const allocated = allocations.reduce((sum, allocation) => sum + allocation.quota, 0)
        if (newQuota < allocated) return { ok: false as const, error: 'variant_quota_below_allocations', status: 409 }

        const siblings = await tx.promotionVariant.findMany({ where: { campaignId: campaign.id } })
        const nextVariantTotal = siblings.reduce(
          (sum, item) => sum + (item.id === variant.id ? newQuota : item.quota),
          0
        )
        if (nextVariantTotal > campaign.totalQuota) {
          return { ok: false as const, error: 'variant_quotas_exceed_campaign', status: 409 }
        }

        const changed = await tx.promotionVariant.updateMany({
          where: { id: variant.id, campaignId: campaign.id, quota: variant.quota },
          data: { quota: newQuota },
        })
        if (changed.count !== 1) return { ok: false as const, error: 'variant_conflict', status: 409 }

        const bumped = await tx.promotionCampaign.updateMany({
          where: { id: campaign.id, version: expectedVersion },
          data: { version: { increment: 1 } },
        })
        if (bumped.count !== 1) throw new Error('campaign_version_conflict')

        const before = { variantId: variant.id, code: variant.code, quota: variant.quota }
        const after = { variantId: variant.id, code: variant.code, quota: newQuota }
        await tx.promotionAuditLog.create({
          data: {
            campaignId: campaign.id,
            actor: admin.userId,
            action: 'variant_quota_change',
            before: JSON.stringify(before),
            after: JSON.stringify(after),
            reason,
          },
        })
        await tx.adminAuditLog.create({
          data: {
            actor: admin.userId,
            action: 'PROMOTION_VARIANT_QUOTA_UPDATED',
            entityType: 'PromotionVariant',
            entityId: variant.id,
            before: JSON.stringify(before),
            after: JSON.stringify(after),
            metadata: JSON.stringify({ reason, campaignId: campaign.id }),
          },
        })
        return { ok: true as const }
      })

      if (!result.ok) return errorResponse(result.error, result.status)
      return NextResponse.json({ ok: true }, { status: 200 })
    } catch (error) {
      if (error instanceof Error && error.message === 'campaign_version_conflict') {
        return errorResponse('version_conflict', 409)
      }
      console.error('[admin-promotions] variant quota update failed', error)
      return errorResponse('variant_quota_update_failed', 500)
    }
  }

  if (action === 'allocation_quota') {
    const allocationId = typeof body.allocationId === 'string' ? body.allocationId : ''
    const expectedAllocationVersion = parseNonNegativeInt(body.expectedAllocationVersion)
    const newQuota = parseNonNegativeInt(body.newQuota)
    if (!allocationId || expectedAllocationVersion === null || newQuota === null) {
      return errorResponse('invalid_allocation_quota', 400)
    }

    try {
      const result = await db.$transaction(async (tx) => {
        const campaign = await tx.promotionCampaign.findUnique({ where: { id: campaignId } })
        if (!campaign) return { ok: false as const, error: 'campaign_not_found', status: 404 }
        if (campaign.version !== expectedVersion) return { ok: false as const, error: 'version_conflict', status: 409 }

        const allocation = await tx.promotionAllocation.findUnique({ where: { id: allocationId } })
        if (!allocation) return { ok: false as const, error: 'allocation_not_found', status: 404 }
        if (allocation.version !== expectedAllocationVersion) {
          return { ok: false as const, error: 'allocation_conflict', status: 409 }
        }

        const variant = await tx.promotionVariant.findUnique({ where: { id: allocation.variantId } })
        if (!variant || variant.campaignId !== campaign.id) {
          return { ok: false as const, error: 'allocation_not_found', status: 404 }
        }

        const floor = allocation.confirmedCount + allocation.reservedCount
        if (newQuota < floor) return { ok: false as const, error: 'allocation_quota_below_committed', status: 409 }

        const variantAllocations = await tx.promotionAllocation.findMany({ where: { variantId: variant.id } })
        const nextVariantAllocationTotal = variantAllocations.reduce(
          (sum, item) => sum + (item.id === allocation.id ? newQuota : item.quota),
          0
        )
        if (nextVariantAllocationTotal > variant.quota) {
          return { ok: false as const, error: 'allocations_exceed_variant', status: 409 }
        }

        const campaignVariantIds = (
          await tx.promotionVariant.findMany({ where: { campaignId: campaign.id }, select: { id: true } })
        ).map((item) => item.id)
        const campaignAllocations = await tx.promotionAllocation.findMany({
          where: { variantId: { in: campaignVariantIds } },
        })
        const nextCampaignAllocationTotal = campaignAllocations.reduce(
          (sum, item) => sum + (item.id === allocation.id ? newQuota : item.quota),
          0
        )
        if (nextCampaignAllocationTotal > campaign.totalQuota) {
          return { ok: false as const, error: 'allocations_exceed_campaign', status: 409 }
        }

        const changed = await tx.promotionAllocation.updateMany({
          where: {
            id: allocation.id,
            variantId: variant.id,
            quota: allocation.quota,
            confirmedCount: allocation.confirmedCount,
            reservedCount: allocation.reservedCount,
            version: expectedAllocationVersion,
          },
          data: { quota: newQuota, version: { increment: 1 } },
        })
        if (changed.count !== 1) return { ok: false as const, error: 'allocation_conflict', status: 409 }

        const bumped = await tx.promotionCampaign.updateMany({
          where: { id: campaign.id, version: expectedVersion },
          data: { version: { increment: 1 } },
        })
        if (bumped.count !== 1) throw new Error('campaign_version_conflict')

        const before = {
          allocationId: allocation.id,
          variantCode: variant.code,
          platform: allocation.platform,
          quota: allocation.quota,
        }
        const after = { ...before, quota: newQuota }
        await tx.promotionAuditLog.create({
          data: {
            campaignId: campaign.id,
            actor: admin.userId,
            action: 'reallocate',
            before: JSON.stringify(before),
            after: JSON.stringify(after),
            reason,
          },
        })
        await tx.adminAuditLog.create({
          data: {
            actor: admin.userId,
            action: 'PROMOTION_ALLOCATION_QUOTA_UPDATED',
            entityType: 'PromotionAllocation',
            entityId: allocation.id,
            before: JSON.stringify(before),
            after: JSON.stringify(after),
            metadata: JSON.stringify({ reason, campaignId: campaign.id }),
          },
        })
        return { ok: true as const }
      })

      if (!result.ok) return errorResponse(result.error, result.status)
      return NextResponse.json({ ok: true }, { status: 200 })
    } catch (error) {
      if (error instanceof Error && error.message === 'campaign_version_conflict') {
        return errorResponse('version_conflict', 409)
      }
      console.error('[admin-promotions] allocation quota update failed', error)
      return errorResponse('allocation_quota_update_failed', 500)
    }
  }

  return errorResponse('unknown_action', 400)
}
