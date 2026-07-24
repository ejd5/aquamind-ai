import { describe, expect, it } from 'vitest'
import type { ProAccess } from '@/lib/pro/access'
import { proInterventionAccessWhere } from '@/lib/pro/intervention-scope'

const managerAccess: ProAccess = {
  ownerUserId: 'owner-1',
  organizationId: 'org-1',
  role: 'manager',
  canWrite: true,
  canManage: true,
}

const technicianAccess: ProAccess = {
  ownerUserId: 'owner-1',
  organizationId: 'org-1',
  role: 'technician',
  canWrite: true,
  canManage: false,
}

describe('proInterventionAccessWhere', () => {
  it('keeps managers inside the owner workspace', () => {
    expect(proInterventionAccessWhere(managerAccess, 'manager-1')).toEqual({
      client: { proUserId: 'owner-1' },
    })
  })

  it('restricts technicians to interventions assigned to their user account', () => {
    expect(proInterventionAccessWhere(technicianAccess, 'technician-1')).toEqual({
      client: { proUserId: 'owner-1' },
      technicianId: 'technician-1',
    })
  })
})
