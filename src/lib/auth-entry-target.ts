import { db } from '@/lib/db'

export type WorkspaceEntryContext = {
  ownsProOrganization: boolean
  proMembershipRole: string | null
  ownsGrowthOrganization: boolean
  hasGrowthMembership: boolean
}

/**
 * Resolve the first screen shown after a login without an explicit callback.
 *
 * Technicians are sent to their operational intervention list instead of the
 * consumer pool onboarding. Managers and owners land on the Pro dashboard.
 */
export function workspaceEntryTarget(context: WorkspaceEntryContext): string {
  if (context.ownsProOrganization) return '/pro/app'

  if (context.proMembershipRole) {
    return context.proMembershipRole === 'technician'
      ? '/pro/app/interventions'
      : '/pro/app'
  }

  if (context.ownsGrowthOrganization || context.hasGrowthMembership) {
    return '/growth/app'
  }

  return '/'
}

export async function resolveWorkspaceEntryTarget(userId: string): Promise<string> {
  const [ownedPro, proMembership, ownedGrowth, growthMembership] = await Promise.all([
    db.organization.findFirst({
      where: { ownerId: userId, type: 'pro', status: { in: ['active', 'trial'] } },
      select: { id: true },
    }),
    db.organizationMember.findFirst({
      where: {
        userId,
        status: 'active',
        organization: { type: 'pro', status: { in: ['active', 'trial'] } },
      },
      orderBy: { createdAt: 'asc' },
      select: { role: true },
    }),
    db.organization.findFirst({
      where: { ownerId: userId, type: 'growth', status: { in: ['active', 'trial'] } },
      select: { id: true },
    }),
    db.organizationMember.findFirst({
      where: {
        userId,
        status: 'active',
        organization: { type: 'growth', status: { in: ['active', 'trial'] } },
      },
      select: { id: true },
    }),
  ])

  return workspaceEntryTarget({
    ownsProOrganization: Boolean(ownedPro),
    proMembershipRole: proMembership?.role ?? null,
    ownsGrowthOrganization: Boolean(ownedGrowth),
    hasGrowthMembership: Boolean(growthMembership),
  })
}
