'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  AlertTriangle,
  Check,
  Clock3,
  Gauge,
  Loader2,
  MapPin,
  Pencil,
  Phone,
  RefreshCw,
  Save,
  ShieldCheck,
  Truck,
  UserRound,
  UsersRound,
  X,
} from 'lucide-react'

const DAYS = [1, 2, 3, 4, 5, 6, 0] as const

type Workload = {
  interventionCount: number
  scheduledMinutes: number
  urgentCount: number
  inProgressCount: number
  weeklyCapacityMinutes: number
  utilizationPercent: number
}

type TeamMember = {
  memberId: string | null
  userId: string
  role: string
  name: string | null
  email: string
  dispatchEnabled: boolean
  skills: string[]
  serviceZones: string[]
  workingDays: number[]
  dayStart: string
  dayEnd: string
  timeZone: string
  dailyCapacityMinutes: number
  dispatchColor: string | null
  phone: string | null
  vehicle: string | null
  workload: Workload
}

type TeamResponse = {
  members: TeamMember[]
  summary: {
    interventionCount: number
    unassignedCount: number
    unassignedUrgentCount: number
    from: string
    to: string
  }
  access: { role: string; canManage: boolean }
}

type EditForm = {
  dispatchEnabled: boolean
  skills: string
  serviceZones: string
  workingDays: number[]
  dayStart: string
  dayEnd: string
  timeZone: string
  dailyCapacityMinutes: string
  dispatchColor: string
  phone: string
  vehicle: string
}

export default function ProTeamPage() {
  const t = useTranslations('proApp')
  const [data, setData] = useState<TeamResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<TeamMember | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/pro/team', { cache: 'no-store' })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      setData(await response.json() as TeamResponse)
    } catch {
      setError(t('errorGeneric'))
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    const timer = window.setTimeout(() => { void load() }, 0)
    return () => window.clearTimeout(timer)
  }, [load])

  const activeMembers = useMemo(
    () => data?.members.filter((member) => member.dispatchEnabled).length ?? 0,
    [data],
  )

  return <div className="space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <span className="section-label inline-flex items-center gap-1"><UsersRound className="h-3 w-3" />AQWELIA Pro</span>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">{t('dispatchTeamTitle')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('dispatchTeamSubtitle')}</p>
      </div>
      <button onClick={load} disabled={loading} className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs font-semibold disabled:opacity-50">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}{t('retry')}
      </button>
    </header>

    {error ? <div className="rounded-2xl border border-red-400/40 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-300">{error}</div> : null}

    {data ? <>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={<UsersRound className="h-4 w-4" />} label={t('dispatchActiveTechnicians')} value={String(activeMembers)} />
        <Metric icon={<Clock3 className="h-4 w-4" />} label={t('dispatchWeekInterventions')} value={String(data.summary.interventionCount)} />
        <Metric icon={<AlertTriangle className="h-4 w-4" />} label={t('dispatchUnassigned')} value={String(data.summary.unassignedCount)} emphasis={data.summary.unassignedCount > 0} />
        <Metric icon={<ShieldCheck className="h-4 w-4" />} label={t('dispatchUrgentUnassigned')} value={String(data.summary.unassignedUrgentCount)} emphasis={data.summary.unassignedUrgentCount > 0} />
      </section>

      <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {data.members.map((member) => <article key={member.userId} className="relative overflow-hidden rounded-2xl border border-white/40 bg-white/60 p-5 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04]">
          <span className="absolute inset-x-0 top-0 h-1" style={{ background: member.dispatchColor || 'linear-gradient(90deg, var(--primary), var(--gold))' }} />
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><UserRound className="h-5 w-5" /></div>
              <div className="min-w-0"><h2 className="truncate font-semibold">{member.name || member.email}</h2><p className="truncate text-xs text-muted-foreground">{member.email}</p><span className="mt-1 inline-flex rounded-full bg-secondary px-2 py-0.5 text-[9px] font-bold uppercase">{member.role}</span></div>
            </div>
            {data.access.canManage && member.memberId ? <button onClick={() => setEditing(member)} className="rounded-lg border border-border p-2 text-muted-foreground hover:border-gold/50 hover:text-gold" aria-label={t('dispatchEditProfile')}><Pencil className="h-4 w-4" /></button> : null}
          </div>

          <div className="mt-5">
            <div className="flex items-center justify-between text-xs"><span className="font-semibold">{t('dispatchWeeklyLoad')}</span><span>{member.workload.scheduledMinutes} / {member.workload.weeklyCapacityMinutes} min</span></div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary"><div className={`h-full rounded-full ${member.workload.utilizationPercent > 100 ? 'bg-red-500' : member.workload.utilizationPercent > 85 ? 'bg-amber-500' : 'bg-primary'}`} style={{ width: `${Math.min(100, member.workload.utilizationPercent)}%` }} /></div>
            <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-muted-foreground"><span>{member.workload.interventionCount} {t('dispatchVisitsShort')}</span><span>{member.workload.urgentCount} {t('dispatchUrgentShort')}</span><span>{member.workload.inProgressCount} {t('dispatchInProgressShort')}</span></div>
          </div>

          <div className="mt-4 grid gap-2 text-xs text-muted-foreground">
            <Info icon={<Clock3 className="h-3.5 w-3.5" />} value={`${member.dayStart}–${member.dayEnd} · ${member.timeZone}`} />
            <Info icon={<Gauge className="h-3.5 w-3.5" />} value={`${member.dailyCapacityMinutes} min / ${t('dispatchDay')}`} />
            <Info icon={<MapPin className="h-3.5 w-3.5" />} value={member.serviceZones.join(', ') || t('dispatchNoZones')} />
            <Info icon={<Phone className="h-3.5 w-3.5" />} value={member.phone || '—'} />
            <Info icon={<Truck className="h-3.5 w-3.5" />} value={member.vehicle || '—'} />
          </div>

          <div className="mt-4 flex flex-wrap gap-1.5">{member.skills.length ? member.skills.map((skill) => <span key={skill} className="rounded-full bg-primary/10 px-2 py-1 text-[9px] font-semibold text-primary">{skill}</span>) : <span className="text-[10px] text-muted-foreground">{t('dispatchNoSkills')}</span>}</div>
          {!member.dispatchEnabled ? <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-2 text-xs text-amber-700 dark:text-amber-300">{t('dispatchDisabled')}</div> : null}
          {!member.memberId ? <div className="mt-4 rounded-xl border border-border bg-secondary/30 p-2 text-xs text-muted-foreground">{t('dispatchCompanyRequiredToEdit')}</div> : null}
        </article>)}
      </section>
    </> : null}

    {loading && !data ? <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div> : null}
    {editing ? <EditTechnicianModal member={editing} t={t} onClose={() => setEditing(null)} onSaved={async () => { setEditing(null); await load() }} /> : null}
  </div>
}

function EditTechnicianModal({ member, t, onClose, onSaved }: { member: TeamMember; t: ReturnType<typeof useTranslations>; onClose: () => void; onSaved: () => Promise<void> }) {
  const [form, setForm] = useState<EditForm>({
    dispatchEnabled: member.dispatchEnabled,
    skills: member.skills.join(', '),
    serviceZones: member.serviceZones.join(', '),
    workingDays: member.workingDays,
    dayStart: member.dayStart,
    dayEnd: member.dayEnd,
    timeZone: member.timeZone,
    dailyCapacityMinutes: String(member.dailyCapacityMinutes),
    dispatchColor: member.dispatchColor || '#0EA5A8',
    phone: member.phone || '',
    vehicle: member.vehicle || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function toggleDay(day: number) {
    setForm((current) => ({
      ...current,
      workingDays: current.workingDays.includes(day)
        ? current.workingDays.filter((item) => item !== day)
        : [...current.workingDays, day].sort((a, b) => a - b),
    }))
  }

  async function save(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true); setError('')
    const response = await fetch('/api/pro/team', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        memberId: member.memberId,
        dispatchEnabled: form.dispatchEnabled,
        skills: form.skills,
        serviceZones: form.serviceZones,
        workingDays: form.workingDays,
        dayStart: form.dayStart,
        dayEnd: form.dayEnd,
        timeZone: form.timeZone,
        dailyCapacityMinutes: Number(form.dailyCapacityMinutes),
        dispatchColor: form.dispatchColor,
        phone: form.phone,
        vehicle: form.vehicle,
      }),
    })
    setSaving(false)
    if (!response.ok) {
      const body = await response.json().catch(() => null)
      setError(body?.error || t('errorGeneric'))
      return
    }
    await onSaved()
  }

  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose} role="dialog" aria-modal="true" aria-label={t('dispatchEditProfile')}>
    <form onSubmit={save} onClick={(event) => event.stopPropagation()} className="max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border border-white/40 bg-background/95 p-6 shadow-2xl sm:rounded-3xl sm:p-8">
      <div className="flex items-start justify-between gap-3"><div><h2 className="font-display text-xl font-bold">{member.name || member.email}</h2><p className="text-xs text-muted-foreground">{t('dispatchEditProfile')}</p></div><button type="button" onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:bg-secondary"><X className="h-4 w-4" /></button></div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="flex items-center gap-2 sm:col-span-2"><input type="checkbox" checked={form.dispatchEnabled} onChange={(event) => setForm({ ...form, dispatchEnabled: event.target.checked })} /><span className="text-sm font-semibold">{t('dispatchEnabled')}</span></label>
        <Field label={t('dispatchPhone')}><input className="input-glass" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></Field>
        <Field label={t('dispatchVehicle')}><input className="input-glass" value={form.vehicle} onChange={(event) => setForm({ ...form, vehicle: event.target.value })} /></Field>
        <Field label={t('dispatchSkills')} full><input className="input-glass" value={form.skills} onChange={(event) => setForm({ ...form, skills: event.target.value })} placeholder={t('dispatchSkillsPlaceholder')} /></Field>
        <Field label={t('dispatchZones')} full><input className="input-glass" value={form.serviceZones} onChange={(event) => setForm({ ...form, serviceZones: event.target.value })} placeholder={t('dispatchZonesPlaceholder')} /></Field>
        <div className="sm:col-span-2"><span className="mb-2 block text-xs font-semibold">{t('dispatchWorkingDays')}</span><div className="flex flex-wrap gap-2">{DAYS.map((day) => <button type="button" key={day} onClick={() => toggleDay(day)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${form.workingDays.includes(day) ? 'border-primary bg-primary text-primary-foreground' : 'border-border'}`}>{t(`dispatchDay${day}` as never)}</button>)}</div></div>
        <Field label={t('dispatchDayStart')}><input className="input-glass" type="time" value={form.dayStart} onChange={(event) => setForm({ ...form, dayStart: event.target.value })} /></Field>
        <Field label={t('dispatchDayEnd')}><input className="input-glass" type="time" value={form.dayEnd} onChange={(event) => setForm({ ...form, dayEnd: event.target.value })} /></Field>
        <Field label={t('dispatchTimeZone')}><input className="input-glass" value={form.timeZone} onChange={(event) => setForm({ ...form, timeZone: event.target.value })} /></Field>
        <Field label={t('dispatchDailyCapacity')}><input className="input-glass" type="number" min="30" max="1440" step="30" value={form.dailyCapacityMinutes} onChange={(event) => setForm({ ...form, dailyCapacityMinutes: event.target.value })} /></Field>
        <Field label={t('dispatchColor')}><input className="h-11 w-full rounded-xl border border-border bg-background p-1" type="color" value={form.dispatchColor} onChange={(event) => setForm({ ...form, dispatchColor: event.target.value })} /></Field>
      </div>
      {error ? <p className="mt-4 rounded-xl border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">{error}</p> : null}
      <div className="mt-6 flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-full border border-border px-4 py-2 text-xs font-semibold">{t('modalCancel')}</button><button disabled={saving} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{t('dispatchSaveProfile')}</button></div>
    </form>
  </div>
}

function Metric({ icon, label, value, emphasis }: { icon: React.ReactNode; label: string; value: string; emphasis?: boolean }) { return <div className={`rounded-2xl border p-4 ${emphasis ? 'border-amber-500/40 bg-amber-500/5' : 'border-white/40 bg-white/60 dark:border-white/10 dark:bg-white/[0.04]'}`}><p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase text-muted-foreground">{icon}{label}</p><p className="mt-2 text-2xl font-bold">{value}</p></div> }
function Info({ icon, value }: { icon: React.ReactNode; value: string }) { return <p className="flex items-start gap-2">{icon}<span className="break-words">{value}</span></p> }
function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) { return <label className={full ? 'block sm:col-span-2' : 'block'}><span className="mb-1.5 block text-xs font-semibold">{label}</span>{children}</label> }
