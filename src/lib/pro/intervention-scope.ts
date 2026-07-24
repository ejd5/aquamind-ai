import type { Prisma } from '@prisma/client'
import type { ProAccess } from '@/lib/pro/access'

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
  const workspaceScope: Prisma.ProInterventionWhereInput = {
    client: { proUserId: access.ownerUserId },
  }

  if (access.role === 'technician') {
    return {
      ...workspaceScope,
      technicianId: actorUserId,
    }
  }

  return workspaceScope
}
