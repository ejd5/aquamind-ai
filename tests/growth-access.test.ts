import { describe, it, expect, vi, beforeEach } from 'vitest'

const orgStore: Record<string, unknown>[] = []
const memberStore: Record<string, unknown>[] = []

vi.mock('@/lib/db', () => ({
  db: {
    organization: {
      findFirst: vi.fn(async ({ where, select }: { where: Record<string, unknown>; select?: Record<string, true> }) => {
        const match = orgStore.find((o) => {
          const m = o as Record<string, unknown>
          if (where.ownerId && m.ownerId !== where.ownerId) return false
          if (where.type && m.type !== where.type) return false
          return true
        })
        if (!match) return null
        if (!select) return match
        const projected: Record<string, unknown> = {}
        for (const key of Object.keys(select)) {
          if (key in match) projected[key] = (match as Record<string, unknown>)[key]
        }
        return projected
      }),
    },
    organizationMember: {
      findFirst: vi.fn(async ({ where, select }: { where: Record<string, unknown>; select?: Record<string, unknown> }) => {
        const match = memberStore.find((m) => {
          const rec = m as Record<string, unknown>
          if (where.userId && rec.userId !== where.userId) return false
          if (where.status && rec.status !== where.status) return false
          const orgFilter = where.organization as Record<string, unknown> | undefined
          if (orgFilter?.type && rec.orgType !== orgFilter.type) return false
          return true
        })
        if (!match) return null
        // Prisma select shape: { organization: { select: { id: true, name: true, ... } } }
        const orgSelectObj = select?.organization as Record<string, unknown> | undefined
        const orgFieldSelect = (orgSelectObj?.select ?? orgSelectObj) as Record<string, true> | undefined
        if (!orgFieldSelect) return { organization: match }
        const projected: Record<string, unknown> = {}
        for (const key of Object.keys(orgFieldSelect)) {
          if (key in match) projected[key] = (match as Record<string, unknown>)[key]
        }
        return { organization: projected }
      }),
    },
  },
}))

import { getGrowthOrganization } from '@/lib/growth/access'

function resetStores() {
  orgStore.length = 0
  memberStore.length = 0
}

describe('getGrowthOrganization — strict type: growth isolation', () => {
  beforeEach(() => {
    resetStores()
  })

  it('returns Growth org when user owns it', async () => {
    orgStore.push({ id: 'org-growth-1', ownerId: 'user-1', type: 'growth' })
    const result = await getGrowthOrganization('user-1')
    expect(result).toEqual({ id: 'org-growth-1' })
  })

  it('returns null when user owns only Pro org', async () => {
    orgStore.push({ id: 'org-pro-1', ownerId: 'user-1', type: 'pro' })
    const result = await getGrowthOrganization('user-1')
    expect(result).toBeNull()
  })

  it('returns null when user owns only Business org', async () => {
    orgStore.push({ id: 'org-biz-1', ownerId: 'user-1', type: 'business' })
    const result = await getGrowthOrganization('user-1')
    expect(result).toBeNull()
  })

  it('returns Growth org when user also owns Pro org', async () => {
    orgStore.push({ id: 'org-pro-1', ownerId: 'user-1', type: 'pro' })
    orgStore.push({ id: 'org-biz-1', ownerId: 'user-1', type: 'business' })
    orgStore.push({ id: 'org-growth-1', ownerId: 'user-1', type: 'growth' })
    const result = await getGrowthOrganization('user-1')
    expect(result).toEqual({ id: 'org-growth-1' })
  })

  it('returns Growth org via active membership', async () => {
    orgStore.push({ id: 'org-growth-2', ownerId: 'other-user', type: 'growth' })
    memberStore.push({ userId: 'user-1', id: 'org-growth-2', orgType: 'growth', status: 'active' })
    const result = await getGrowthOrganization('user-1')
    expect(result).toEqual({ id: 'org-growth-2' })
  })

  it('returns null for invited membership (status != active)', async () => {
    orgStore.push({ id: 'org-growth-3', ownerId: 'other-user', type: 'growth' })
    memberStore.push({ userId: 'user-1', id: 'org-growth-3', orgType: 'growth', status: 'invited' })
    const result = await getGrowthOrganization('user-1')
    expect(result).toBeNull()
  })

  it('returns null for suspended membership', async () => {
    orgStore.push({ id: 'org-growth-4', ownerId: 'other-user', type: 'growth' })
    memberStore.push({ userId: 'user-1', id: 'org-growth-4', orgType: 'growth', status: 'suspended' })
    const result = await getGrowthOrganization('user-1')
    expect(result).toBeNull()
  })

  it('returns null when user has no Growth organization', async () => {
    orgStore.push({ id: 'org-pro-2', ownerId: 'other-user', type: 'pro' })
    const result = await getGrowthOrganization('user-1')
    expect(result).toBeNull()
  })

  it('prefers owned org over membership', async () => {
    orgStore.push({ id: 'org-growth-owned', ownerId: 'user-1', type: 'growth' })
    orgStore.push({ id: 'org-growth-member', ownerId: 'other-user', type: 'growth' })
    memberStore.push({ userId: 'user-1', id: 'org-growth-member', orgType: 'growth', status: 'active' })
    const result = await getGrowthOrganization('user-1')
    expect(result).toEqual({ id: 'org-growth-owned' })
  })

  it('returns custom select fields', async () => {
    orgStore.push({ id: 'org-growth-5', ownerId: 'user-1', type: 'growth', name: 'My Growth', plan: 'growth_premium' })
    const result = await getGrowthOrganization('user-1', { id: true, name: true, plan: true })
    expect(result).toEqual({ id: 'org-growth-5', name: 'My Growth', plan: 'growth_premium' })
  })

  it('returns null for user with no organizations at all', async () => {
    const result = await getGrowthOrganization('user-999')
    expect(result).toBeNull()
  })

  it('returns Growth org when member of multiple orgs of different types', async () => {
    orgStore.push({ id: 'org-pro-other', ownerId: 'other-user', type: 'pro' })
    orgStore.push({ id: 'org-growth-target', ownerId: 'other-user', type: 'growth' })
    memberStore.push({ userId: 'user-1', id: 'org-pro-other', orgType: 'pro', status: 'active' })
    memberStore.push({ userId: 'user-1', id: 'org-growth-target', orgType: 'growth', status: 'active' })
    const result = await getGrowthOrganization('user-1')
    expect(result).toEqual({ id: 'org-growth-target' })
  })
})
