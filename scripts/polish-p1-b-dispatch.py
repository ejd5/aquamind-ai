from pathlib import Path

team_page = Path('src/app/pro/app/team/page.tsx')
text = team_page.read_text(encoding='utf-8').replace('  Check,\n', '', 1)
team_page.write_text(text, encoding='utf-8')

planning_page = Path('src/app/pro/app/planning/page.tsx')
text = planning_page.read_text(encoding='utf-8').replace('  Gauge,\n', '', 1)
text = text.replace(
    "  const urgentCount = interventions.filter((item) => item.priority === 'urgent' && item.status !== 'cancelled').length",
    "  const urgentCount = interventions.filter((item) => item.priority === 'urgent' && ['scheduled', 'in_progress'].includes(item.status)).length",
    1,
)
planning_page.write_text(text, encoding='utf-8')

team_route = Path('src/app/api/pro/team/route.ts')
text = team_route.read_text(encoding='utf-8')
old = '''    if (!intervention.technicianId) {
      unassignedCount += 1
      if (intervention.priority === 'urgent') unassignedUrgentCount += 1
      continue
    }'''
new = '''    if (!intervention.technicianId) {
      if (['scheduled', 'in_progress'].includes(intervention.status)) {
        unassignedCount += 1
        if (intervention.priority === 'urgent') unassignedUrgentCount += 1
      }
      continue
    }'''
if old not in text:
    raise RuntimeError('Team unassigned counter marker missing')
text = text.replace(old, new, 1)
text = text.replace(
    "    if (intervention.priority === 'urgent') current.urgentCount += 1",
    "    if (intervention.priority === 'urgent' && ['scheduled', 'in_progress'].includes(intervention.status)) current.urgentCount += 1",
    1,
)
team_route.write_text(text, encoding='utf-8')

test_path = Path('tests/p1-b-team-dispatch.test.ts')
test = test_path.read_text(encoding='utf-8')
test = test.replace(
    "    expect(createRoute).toContain('schedule_conflict')\n    expect(updateRoute).toContain('excludeInterventionId')",
    "    expect(createRoute).toContain('error.code')\n    expect(updateRoute).toContain('excludeInterventionId')\n    expect(source('src/lib/pro/dispatch.ts')).toContain(\"'schedule_conflict'\")",
    1,
)
closing = '\n})\n'
insert = '''

  it('ships the dispatch vocabulary in all seven locales', () => {
    for (const locale of ['de', 'en', 'es', 'fr', 'it', 'nl', 'pt']) {
      const messages = JSON.parse(source(`src/i18n/locales/${locale}.json`)) as {
        proApp?: Record<string, string>
      }
      expect(messages.proApp?.navTeam).toBeTruthy()
      expect(messages.proApp?.dispatchTeamTitle).toBeTruthy()
      expect(messages.proApp?.dispatchErrorConflict).toBeTruthy()
      expect(messages.proApp?.dispatchLeaveUnassigned).toBeTruthy()
    }
  })
'''
if not test.endswith(closing):
    raise RuntimeError('Dispatch test closing marker missing')
test = test[:-len(closing)] + insert + closing
test_path.write_text(test, encoding='utf-8')

print('P1-B dispatch consistency polish applied')
