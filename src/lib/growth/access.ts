import { db } from '@/lib/db'

/**
 * Return the Growth workspace organization for the given user.
 *
 * Only matches organizations with `type: 'growth'`.  Users who also own a
 * Pro or Business workspace will never see those organizations here.
 *
 * When no `select` is passed, returns `{ id: string } | null`.
 * Pass a Prisma `select` to request additional fields:
 * ```ts
 * const org = await getGrowthOrganization(userId, { id: true, name: true, plan: true })
 * ```
 */
export async function getGrowthOrganization(
  userId: string,
  select?: Record<string, true>,
): Promise<{ [key: string]: any } | null> {
  const sel = select ?? { id: true }
  const owned = await db.organization.findFirst({
    where: { ownerId: userId, type: 'growth' },
    orderBy: { createdAt: 'asc' },
    select: sel,
  })
  if (owned) return owned
  const membership = await db.organizationMember.findFirst({
    where: { userId, status: 'active', organization: { type: 'growth' } },
    orderBy: { createdAt: 'asc' },
    select: { organization: { select: sel } },
  })
  return membership?.organization ?? null
}
