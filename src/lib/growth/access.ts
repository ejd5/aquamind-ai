import { db } from '@/lib/db'

export async function getGrowthOrganization(userId: string) {
  const owned = await db.organization.findFirst({
    where: { ownerId: userId },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  })
  if (owned) return owned
  const membership = await db.organizationMember.findFirst({
    where: { userId, status: 'active' },
    orderBy: { createdAt: 'asc' },
    select: { organization: { select: { id: true } } },
  })
  return membership?.organization ?? null
}
