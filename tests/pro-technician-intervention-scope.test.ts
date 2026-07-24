import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { ProAccess } from '@/lib/pro/access'
import {
  proClientAccessWhere,
  proInterventionAccessWhere,
  proNestedInterventionWhere,
  proPoolAccessWhere,
} from '@/lib/pro/intervention-scope'

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

describe('Pro technician data scopes', () => {
  it('keeps managers inside the owner workspace', () => {
    expect(proInterventionAccessWhere(managerAccess, 'manager-1')).toEqual({
      client: { proUserId: 'owner-1' },
    })
    expect(proClientAccessWhere(managerAccess, 'manager-1')).toEqual({
      proUserId: 'owner-1',
    })
    expect(proPoolAccessWhere(managerAccess, 'manager-1')).toEqual({
      client: { proUserId: 'owner-1' },
    })
    expect(proNestedInterventionWhere(managerAccess, 'manager-1')).toBeUndefined()
  })

  it('restricts technicians to assigned interventions, clients and pools', () => {
    expect(proNestedInterventionWhere(technicianAccess, 'technician-1')).toEqual({
      technicianId: 'technician-1',
    })
    expect(proInterventionAccessWhere(technicianAccess, 'technician-1')).toEqual({
      client: { proUserId: 'owner-1' },
      technicianId: 'technician-1',
    })
    expect(proClientAccessWhere(technicianAccess, 'technician-1')).toEqual({
      proUserId: 'owner-1',
      interventions: { some: { technicianId: 'technician-1' } },
    })
    expect(proPoolAccessWhere(technicianAccess, 'technician-1')).toEqual({
      client: { proUserId: 'owner-1' },
      interventions: { some: { technicianId: 'technician-1' } },
    })
  })

  it('applies mandatory scoping to every intervention delivery surface', () => {
    const routeExpectations = new Map<string, string>([
      ['src/app/api/pro/interventions/route.ts', 'proInterventionAccessWhere'],
      ['src/app/api/pro/interventions/[id]/route.ts', 'proInterventionAccessWhere'],
      ['src/app/api/pro/interventions/[id]/report/route.tsx', 'proInterventionAccessWhere'],
      ['src/app/api/pro/clients/route.ts', 'proClientAccessWhere'],
      ['src/app/api/pro/clients/[id]/route.ts', 'proNestedInterventionWhere'],
      ['src/app/api/pro/pools/route.ts', 'proPoolAccessWhere'],
      ['src/app/api/pro/pools/[id]/route.ts', 'proNestedInterventionWhere'],
      ['src/app/api/pro/pools/[id]/report/route.tsx', 'proPoolAccessWhere'],
      ['src/app/api/pro/dashboard/route.ts', 'proInterventionAccessWhere'],
      ['src/app/api/pro/export/route.ts', 'proNestedInterventionWhere'],
    ])

    for (const [route, helper] of routeExpectations) {
      expect(read(route)).toContain(helper)
    }
  })

  it('filters nested intervention relations and relation counts', () => {
    const nestedRoutes = [
      'src/app/api/pro/clients/route.ts',
      'src/app/api/pro/clients/[id]/route.ts',
      'src/app/api/pro/pools/route.ts',
      'src/app/api/pro/pools/[id]/route.ts',
      'src/app/api/pro/pools/[id]/report/route.tsx',
      'src/app/api/pro/export/route.ts',
    ]

    for (const route of nestedRoutes) {
      expect(read(route)).toContain('where: interventionWhere')
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
