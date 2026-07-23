from pathlib import Path

path = Path('src/app/pro/app/interventions/[id]/page.tsx')
text = path.read_text(encoding='utf-8')

intervention_end = '''  pool?: { id: string; name: string; type: string; accessInstructions?: string | null; brand?: string | null; model?: string | null } | null
}
'''
team_type = '''  pool?: { id: string; name: string; type: string; accessInstructions?: string | null; brand?: string | null; model?: string | null } | null
}

type TeamMember = {
  userId: string
  name: string | null
  email: string
  role: string
  dispatchEnabled: boolean
}
'''
if intervention_end not in text:
    raise RuntimeError('Intervention type marker missing')
text = text.replace(intervention_end, team_type, 1)

state_marker = '''  const [test, setTest] = useState({ ph: '', freeChlorine: '', alkalinity: '', temperature: '' })
'''
state_insert = '''  const [test, setTest] = useState({ ph: '', freeChlorine: '', alkalinity: '', temperature: '' })
  const [team, setTeam] = useState<TeamMember[]>([])
  const [technicianId, setTechnicianId] = useState('')
'''
if state_marker not in text:
    raise RuntimeError('State marker missing')
text = text.replace(state_marker, state_insert, 1)

old_load = '''  const load = useCallback(async () => {
    setLoading(true)
    const response = await fetch(`/api/pro/interventions/${id}`, { cache: 'no-store' })
    if (response.ok) {
      const value = (await response.json()).intervention as Intervention
      setIntervention(value)
'''
new_load = '''  const load = useCallback(async () => {
    setLoading(true)
    const [response, teamResponse] = await Promise.all([
      fetch(`/api/pro/interventions/${id}`, { cache: 'no-store' }),
      fetch('/api/pro/team', { cache: 'no-store' }),
    ])
    if (response.ok) {
      const value = (await response.json()).intervention as Intervention
      setIntervention(value)
      setTechnicianId(value.technicianId || '')
      if (teamResponse.ok) {
        const teamData = await teamResponse.json() as { members?: TeamMember[] }
        setTeam((teamData.members ?? []).filter((member) => member.dispatchEnabled))
      } else setTeam([])
'''
if old_load not in text:
    raise RuntimeError('Load marker missing')
text = text.replace(old_load, new_load, 1)

payload_marker = '''        currency: 'EUR',
        ...extra,
'''
payload_insert = '''        currency: 'EUR',
        technicianId: technicianId || null,
        ...extra,
'''
if payload_marker not in text:
    raise RuntimeError('Save payload marker missing')
text = text.replace(payload_marker, payload_insert, 1)

old_response = '''    setSaving(false)
    if (response.ok) { setMessage(t('crmReportSaved')); await load() }
    else setMessage(t('errorGeneric'))
'''
new_response = '''    const responseBody = await response.json().catch(() => null)
    setSaving(false)
    if (response.ok) { setMessage(t('crmReportSaved')); await load() }
    else setMessage(dispatchError(responseBody?.code, t) || responseBody?.error || t('errorGeneric'))
'''
if old_response not in text:
    raise RuntimeError('Save response marker missing')
text = text.replace(old_response, new_response, 1)

form_marker = '''        <div className="grid gap-3 sm:grid-cols-2"><Field label={t('crmInterventionPriority')}><select className="input-glass" value={priority} onChange={(event) => setPriority(event.target.value as (typeof PRIORITIES)[number])}>{PRIORITIES.map((value) => <option key={value} value={value}>{t(`crmPriority${cap(value)}` as never)}</option>)}</select></Field><Field label={t('interventionDuration')}><input className="input-glass" type="number" min="0" value={duration} onChange={(event) => setDuration(event.target.value)} /></Field></div>
'''
form_insert = '''        <div className="grid gap-3 sm:grid-cols-2"><Field label={t('interventionTechnician')}><select className="input-glass" value={technicianId} onChange={(event) => setTechnicianId(event.target.value)}><option value="">{t('dispatchLeaveUnassigned')}</option>{team.map((member) => <option key={member.userId} value={member.userId}>{member.name || member.email} · {member.role}</option>)}</select></Field><Field label={t('crmInterventionPriority')}><select className="input-glass" value={priority} onChange={(event) => setPriority(event.target.value as (typeof PRIORITIES)[number])}>{PRIORITIES.map((value) => <option key={value} value={value}>{t(`crmPriority${cap(value)}` as never)}</option>)}</select></Field><Field label={t('interventionDuration')}><input className="input-glass" type="number" min="0" value={duration} onChange={(event) => setDuration(event.target.value)} /></Field></div>
'''
if form_marker not in text:
    raise RuntimeError('Field report grid marker missing')
text = text.replace(form_marker, form_insert, 1)

helper_marker = '''function statusKey(value: string) { return value === 'in_progress' ? 'InProgress' : cap(value) }
'''
helper_insert = '''function statusKey(value: string) { return value === 'in_progress' ? 'InProgress' : cap(value) }
function dispatchError(code: unknown, t: ReturnType<typeof useTranslations>): string | null {
  if (typeof code !== 'string') return null
  const keys: Record<string, string> = {
    technician_not_found: 'dispatchErrorTechnicianNotFound',
    technician_disabled: 'dispatchErrorTechnicianDisabled',
    outside_working_day: 'dispatchErrorWorkingDay',
    outside_working_hours: 'dispatchErrorWorkingHours',
    schedule_conflict: 'dispatchErrorConflict',
    daily_capacity_exceeded: 'dispatchErrorCapacity',
  }
  return keys[code] ? t(keys[code] as never) : null
}
'''
if helper_marker not in text:
    raise RuntimeError('Helper marker missing')
text = text.replace(helper_marker, helper_insert, 1)
path.write_text(text, encoding='utf-8')
print('P1-B intervention reassignment UI applied')
