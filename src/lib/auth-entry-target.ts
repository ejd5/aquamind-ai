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
 * Technicians are sent to their mobile-first daily route instead of the
 * consumer pool onboarding or the manager dashboard. Managers and owners land
 * on the Pro dashboard.
 */
export function workspaceEntryTarget(context: WorkspaceEntryContext): string {
  if (context.ownsProOrganization) return '/pro/app'

  if (context.proMembershipRole) {
    return context.proMembershipRole === 'technician'
      ? '/pro/app/today'
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

/**
 * Wave A3 — canonical mobile account type used by the native entry router.
 *
 *   - 'consumer'   → regular B2C user: route to the B2C shell (/dashboard);
 *   - 'technician' → Pro technician: route to the technician shell
 *                    (/pro/app/today);
 *   - 'pro'        → Pro manager/owner: route to the Pro shell (/pro/app/today);
 *   - 'growth'     → Growth OS owner/member: route to the Growth shell.
 */
export type MobileAccountType = 'consumer' | 'technician' | 'pro' | 'growth'

export function mobileAccountType(context: {
  proMembershipRole?: string | null
  ownsProOrganization?: boolean
  hasProMembership?: boolean
  ownsGrowthOrganization?: boolean
  hasGrowthMembership?: boolean
}): MobileAccountType {
  if (context.proMembershipRole === 'technician') return 'technician'
  if (context.ownsProOrganization || context.hasProMembership) return 'pro'
  if (context.ownsGrowthOrganization || context.hasGrowthMembership) return 'growth'
  return 'consumer'
}

export async function resolveMobileAccountType(userId: string): Promise<MobileAccountType> {
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

  return mobileAccountType({
    ownsProOrganization: Boolean(ownedPro),
    proMembershipRole: proMembership?.role ?? null,
    hasProMembership: Boolean(proMembership),
    ownsGrowthOrganization: Boolean(ownedGrowth),
    hasGrowthMembership: Boolean(growthMembership),
  })
}
