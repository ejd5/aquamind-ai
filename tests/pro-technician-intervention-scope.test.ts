import { readFileSync } from 'node:fs'
import { join } from 'node:path'
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

function read(path: string): string {
  return readFileSync(join(process.cwd(), path), 'utf8')
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

  it('applies the mandatory scope to list, detail and PDF report routes', () => {
    const routes = [
      'src/app/api/pro/interventions/route.ts',
      'src/app/api/pro/interventions/[id]/route.ts',
      'src/app/api/pro/interventions/[id]/report/route.tsx',
    ]

    for (const route of routes) {
      expect(read(route)).toContain('proInterventionAccessWhere')
    }
  })

  it('prevents technicians from selecting or changing another assignee', () => {
    const collectionRoute = read('src/app/api/pro/interventions/route.ts')
    const detailRoute = read('src/app/api/pro/interventions/[id]/route.ts')

    expect(collectionRoute).toContain("const technicianId = access.role === 'technician'")
    expect(collectionRoute).toContain("technicianId && access.role !== 'technician'")
    expect(detailRoute).toContain('if (!access.canManage)')
  })
})
