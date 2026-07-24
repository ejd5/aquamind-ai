import type { Prisma } from '@prisma/client'
import type { ProAccess } from '@/lib/pro/access'

/**
 * Return the assignment predicate that must be added to nested intervention
 * relations for a technician. Managers and owners do not need an additional
 * assignment predicate inside their organization workspace.
 */
export function proNestedInterventionWhere(
  access: ProAccess,
  actorUserId: string,
): Prisma.ProInterventionWhereInput | undefined {
  return access.role === 'technician'
    ? { technicianId: actorUserId }
    : undefined
}

/**
 * Build the mandatory database scope for Pro interventions.
 *
 * Managers and owners operate inside the owner's workspace. Technicians are
 * additionally restricted to interventions explicitly assigned to their own
 * user account. This scope must be applied server-side for lists, summaries,
 * detail reads and mutations; a client-provided technicianId is never trusted
 * as an authorization boundary.
 */
export function proInterventionAccessWhere(
  access: ProAccess,
  actorUserId: string,
): Prisma.ProInterventionWhereInput {
  return {
    client: { proUserId: access.ownerUserId },
    ...proNestedInterventionWhere(access, actorUserId),
  }
}

/**
 * Limit a technician to clients for which at least one intervention is
 * assigned to them. Other Pro roles keep the organization-wide client scope.
 */
export function proClientAccessWhere(
  access: ProAccess,
  actorUserId: string,
): Prisma.ProClientWhereInput {
  return {
    proUserId: access.ownerUserId,
    ...(access.role === 'technician'
      ? { interventions: { some: { technicianId: actorUserId } } }
      : {}),
  }
}

/**
 * Limit a technician to pools for which at least one intervention is assigned
 * to them. Other Pro roles keep the organization-wide pool scope.
 */
export function proPoolAccessWhere(
  access: ProAccess,
  actorUserId: string,
): Prisma.ProPoolWhereInput {
  return {
    client: { proUserId: access.ownerUserId },
    ...(access.role === 'technician'
      ? { interventions: { some: { technicianId: actorUserId } } }
      : {}),
  }
}
