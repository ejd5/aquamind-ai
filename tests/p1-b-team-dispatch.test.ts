import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  normalizeTimeZone,
  parseStoredStringArray,
  serializeStringArray,
  validateTechnicianSchedule,
  type TechnicianAvailability,
} from '@/lib/pro/dispatch'

const availability: TechnicianAvailability = {
  dispatchEnabled: true,
  workingDays: [1, 2, 3, 4, 5],
  dayStart: '08:00',
  dayEnd: '18:00',
  timeZone: 'Europe/Paris',
  dailyCapacityMinutes: 480,
}

function source(path: string): string {
  return readFileSync(join(process.cwd(), path), 'utf8')
}

describe('P1-B technician dispatch', () => {
  it('evaluates working hours in the technician timezone', () => {
    // 07:00 UTC is 09:00 in Paris in July.
    const result = validateTechnicianSchedule(
      availability,
      {
        scheduledAt: new Date('2026-07-27T07:00:00.000Z'),
        durationMinutes: 90,
      },
      [],
    )
    expect(result).toEqual({ ok: true, projectedDailyMinutes: 90 })
  })

  it('rejects a day outside the configured working week', () => {
    const result = validateTechnicianSchedule(
      availability,
      {
        scheduledAt: new Date('2026-07-26T08:00:00.000Z'),
        durationMinutes: 60,
      },
      [],
    )
    expect(result).toMatchObject({ ok: false, code: 'outside_working_day' })
  })

  it('rejects an overlapping intervention', () => {
    const result = validateTechnicianSchedule(
      availability,
      {
        id: 'candidate',
        scheduledAt: new Date('2026-07-27T09:30:00.000Z'),
        durationMinutes: 60,
      },
      [{
        id: 'existing',
        scheduledAt: new Date('2026-07-27T09:00:00.000Z'),
        durationMinutes: 90,
      }],
    )
    expect(result).toMatchObject({
      ok: false,
      code: 'schedule_conflict',
      conflictId: 'existing',
    })
  })

  it('rejects a daily capacity overflow without inventing route optimization', () => {
    const result = validateTechnicianSchedule(
      { ...availability, dailyCapacityMinutes: 180 },
      {
        scheduledAt: new Date('2026-07-27T13:00:00.000Z'),
        durationMinutes: 90,
      },
      [{
        id: 'morning',
        scheduledAt: new Date('2026-07-27T07:00:00.000Z'),
        durationMinutes: 120,
      }],
    )
    expect(result).toMatchObject({
      ok: false,
      code: 'daily_capacity_exceeded',
      projectedDailyMinutes: 210,
    })
  })

  it('normalizes profile arrays and invalid timezones safely', () => {
    const serialized = serializeStringArray([' Pompe ', 'pompe', 'Spa'])
    expect(parseStoredStringArray(serialized)).toEqual(['Pompe', 'pompe', 'Spa'])
    expect(normalizeTimeZone('Invalid/Timezone')).toBe('Europe/Paris')
  })

  it('keeps SQLite and PostgreSQL dispatch schemas aligned', () => {
    const sqlite = source('prisma/schema.prisma')
    const postgres = source('prisma/postgresql/schema.prisma')
    for (const field of [
      'dispatchEnabled',
      'skills',
      'serviceZones',
      'workingDays',
      'dayStart',
      'dayEnd',
      'timeZone',
      'dailyCapacityMinutes',
      'dispatchColor',
      'phone',
      'vehicle',
    ]) {
      expect(sqlite).toContain(field)
      expect(postgres).toContain(field)
    }
  })

  it('enforces assignment rules in both intervention write routes', () => {
    const createRoute = source('src/app/api/pro/interventions/route.ts')
    const updateRoute = source('src/app/api/pro/interventions/[id]/route.ts')
    expect(createRoute).toContain('validateTechnicianAssignment')
    expect(updateRoute).toContain('validateTechnicianAssignment')
    expect(createRoute).toContain('schedule_conflict')
    expect(updateRoute).toContain('excludeInterventionId')
  })

  it('does not claim geolocation or route optimization in the dispatch UI', () => {
    const planning = source('src/app/pro/app/planning/page.tsx')
    const team = source('src/app/pro/app/team/page.tsx')
    expect(planning).not.toMatch(/optimi[sz].*route|geolocat/i)
    expect(team).not.toMatch(/optimi[sz].*route|geolocat/i)
  })
})
