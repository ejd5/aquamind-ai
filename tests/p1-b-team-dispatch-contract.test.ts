import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

function read(path: string): string {
  return readFileSync(join(process.cwd(), path), 'utf8')
}

describe('P1-B dispatch contract', () => {
  it('stores availability on existing organization members in both databases', () => {
    const sqlite = read('prisma/schema.prisma')
    const postgres = read('prisma/postgresql/schema.prisma')
    for (const schema of [sqlite, postgres]) {
      expect(schema).toContain('dispatchEnabled')
      expect(schema).toContain('workingDays')
      expect(schema).toContain('timeZone')
      expect(schema).toContain('dailyCapacityMinutes')
      expect(schema).toContain('@@index([organizationId, dispatchEnabled])')
    }

    const sqliteMigration = read('prisma/migrations/20260724014500_p1_b_team_dispatch/migration.sql')
    const postgresMigration = read('prisma/postgresql/migrations/20260724014500_p1_b_team_dispatch/migration.sql')
    for (const migration of [sqliteMigration, postgresMigration]) {
      expect(migration).toContain('OrganizationMember_organizationId_dispatchEnabled_idx')
    }
  })

  it('scopes team workload to the Pro owner and protects profile writes', () => {
    const route = read('src/app/api/pro/team/route.ts')
    expect(route).toContain('client: { proUserId: access.ownerUserId }')
    expect(route).toContain('if (!access.canManage)')
    expect(route).toContain('organizationId: access.organizationId')
    expect(route).toContain("status: 'active'")
  })

  it('uses organization members for creation and dispatch data for reassignment', () => {
    const planning = read('src/app/pro/app/planning/page.tsx')
    const creation = read('src/components/pro/add-intervention-modal.tsx')
    const detail = read('src/app/pro/app/interventions/[id]/page.tsx')
    expect(planning).toContain('/api/pro/interventions?')
    expect(creation).toContain("fetch('/api/pro/settings'")
    expect(detail).toContain("fetch('/api/pro/team'")
    expect(creation).toContain('technicianId')
    expect(planning).toContain('technicianId')
    expect(detail).toContain('technicianId')
  })

  it('validates only genuine schedule changes on update', () => {
    const createRoute = read('src/app/api/pro/interventions/route.ts')
    const updateRoute = read('src/app/api/pro/interventions/[id]/route.ts')
    expect(createRoute).toContain('validateTechnicianAssignment')
    expect(updateRoute).toContain("const scheduleChanged = ['technicianId', 'scheduledAt', 'duration', 'status']")
    expect(updateRoute).toContain('excludeInterventionId: id')
  })

  it('does not advertise mapping or route optimization before it exists', () => {
    const planning = read('src/app/pro/app/planning/page.tsx')
    const team = read('src/app/pro/app/team/page.tsx')
    expect(`${planning}\n${team}`).not.toMatch(/Google Maps|route optimization|optimisation d.itin.raire/i)
  })
})
