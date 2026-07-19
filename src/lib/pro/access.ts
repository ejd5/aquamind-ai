import { db } from '@/lib/db'

export type ProRole = 'owner' | 'admin' | 'manager' | 'technician' | 'viewer'
export type ProAccess = { ownerUserId: string; organizationId: string | null; role: ProRole; canWrite: boolean; canManage: boolean }

export async function getProAccess(userId: string): Promise<ProAccess> {
  const owned = await db.organization.findFirst({ where: { ownerId: userId, type: 'pro' }, orderBy: { createdAt: 'asc' }, select: { id: true } })
  if (owned) return { ownerUserId: userId, organizationId: owned.id, role: 'owner', canWrite: true, canManage: true }
  const membership = await db.organizationMember.findFirst({
    where: { userId, status: 'active', organization: { type: 'pro' } },
    orderBy: { createdAt: 'asc' }, include: { organization: { select: { id: true, ownerId: true } } },
  })
  if (membership) {
    const role = normalizeRole(membership.role)
    return { ownerUserId: membership.organization.ownerId, organizationId: membership.organization.id, role, canWrite: role !== 'viewer', canManage: ['owner','admin','manager'].includes(role) }
  }
  return { ownerUserId: userId, organizationId: null, role: 'owner', canWrite: true, canManage: true }
}

function normalizeRole(role: string): ProRole { return ['owner','admin','manager','technician','viewer'].includes(role) ? role as ProRole : 'viewer' }
