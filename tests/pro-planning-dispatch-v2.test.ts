import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = readFileSync(
  join(process.cwd(), 'src/app/pro/app/planning/page.tsx'),
  'utf8',
)
const copySource = readFileSync(
  join(process.cwd(), 'src/i18n/locales/pro-planning-copy.ts'),
  'utf8',
)

describe('AQWELIA Pro dispatch planning V2', () => {
  it('provides a full 24-hour vertically scrollable weekly agenda', () => {
    expect(source).toContain("type PlanningView = 'agenda' | 'team'")
    expect(source).toContain('function AgendaWeekView')
    expect(source).toContain('height: hourHeight * 24')
    expect(source).toContain('max-h-[720px] overflow-auto')
    expect(source).toContain('CurrentTimeLine')
    expect(source).toContain('scrollTo({ top: 7 * hourHeight')
  })

  it('provides a resource-week view with sticky technician names', () => {
    expect(source).toContain('function TeamWeekView')
    expect(source).toContain('sticky left-0')
    expect(source).toContain('visibleTechnicianIds')
    expect(source).toContain('teamFullDay')
    expect(source).toContain("rangeStartHour = fullDay ? 0 : 6")
    expect(source).toContain("rangeEndHour = fullDay ? 24 : 22")
  })

  it('supports operational filters and persistent display preferences', () => {
    expect(source).toContain("fetch('/api/pro/team'")
    expect(source).toContain("pageSize: '100'")
    expect(source).toContain('selectedTechnicians')
    expect(source).toContain('showUnassigned')
    expect(source).toContain('showWeekend')
    expect(source).toContain('aqwelia-pro-planning-preferences-v2')
    expect(source).toContain("['compact', 'comfortable', 'spacious']")
  })

  it('keeps the new planning controls available in every supported locale', () => {
    expect(source).toContain("from '@/i18n/locales/pro-planning-copy'")
    for (const locale of ['fr', 'en', 'es', 'pt', 'de', 'it', 'nl']) {
      expect(copySource).toContain(`  ${locale}: {`)
    }
  })
})
