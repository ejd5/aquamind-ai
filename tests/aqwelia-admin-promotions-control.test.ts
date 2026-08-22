import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const route = readFileSync(resolve(process.cwd(), 'src/app/api/admin/v1/promotions/route.ts'), 'utf8')
const page = readFileSync(resolve(process.cwd(), 'src/app/admin/promotions/page.tsx'), 'utf8')
const layout = readFileSync(resolve(process.cwd(), 'src/app/admin/layout.tsx'), 'utf8')

describe('AQWELIA admin promotions control plane', () => {
  it('protects both read and mutation paths with the canonical DB admin guard', () => {
    expect(route).toContain("import { requireAdminFromDb } from '@/lib/admin-auth'")
    expect(route.match(/requireAdminFromDb\(\)/g)?.length).toBeGreaterThanOrEqual(1)
    expect(route).toContain('export async function GET()')
    expect(route).toContain('export async function PATCH(req: NextRequest)')
  })

  it('does not seed campaigns or touch payment providers', () => {
    expect(route).not.toContain('seedCampaign')
    expect(route).not.toContain('stripe')
    expect(route).not.toContain('Stripe')
    expect(route).not.toContain('RevenueCat')
    expect(route).not.toContain('revenuecat')
  })

  it('uses explicit reason plus optimistic concurrency for every mutation family', () => {
    expect(route).toContain("if (!reason) return errorResponse('reason_required', 400)")
    expect(route).toContain("action === 'campaign_update'")
    expect(route).toContain("action === 'variant_quota'")
    expect(route).toContain("action === 'allocation_quota'")
    expect(route).toContain('expectedVersion')
    expect(route).toContain('expectedAllocationVersion')
    expect(route).toContain('updateMany')
    expect(route).toContain("version: { increment: 1 }")
  })

  it('enforces quota floors and campaign/variant capacity invariants', () => {
    expect(route).toContain('quota_below_committed_capacity')
    expect(route).toContain('variant_quota_below_allocations')
    expect(route).toContain('variant_quotas_exceed_campaign')
    expect(route).toContain('allocation_quota_below_committed')
    expect(route).toContain('allocations_exceed_variant')
    expect(route).toContain('allocations_exceed_campaign')
  })

  it('writes both promotion-domain and control-plane audit logs', () => {
    expect(route).toContain('tx.promotionAuditLog.create')
    expect(route).toContain('tx.adminAuditLog.create')
    expect(route).toContain('PROMOTION_CAMPAIGN_UPDATED')
    expect(route).toContain('PROMOTION_VARIANT_QUOTA_UPDATED')
    expect(route).toContain('PROMOTION_ALLOCATION_QUOTA_UPDATED')
  })

  it('keeps pricing and discount fields outside mutation payloads', () => {
    const patchBody = route.slice(route.indexOf('export async function PATCH'))
    expect(patchBody).not.toContain('discountKind')
    expect(patchBody).not.toContain('discountValue')
    expect(patchBody).not.toContain('billingPeriod:')
    expect(patchBody).not.toContain('eligiblePlanIds:')
  })

  it('exposes a dedicated human-operated promotions page and admin navigation', () => {
    expect(page).toContain("method: 'PATCH'")
    expect(page).toContain("action: 'campaign_update'")
    expect(page).toContain("action: 'variant_quota'")
    expect(page).toContain("action: 'allocation_quota'")
    expect(page).toContain("useTranslations('admin')")
    expect(page).toContain("useTranslations('common')")
    expect(layout).toContain('href="/admin/promotions"')
  })
})
