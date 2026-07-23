'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  CheckCircle2,
  FlaskConical,
  Loader2,
  Play,
  Save,
} from 'lucide-react'

const PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const

type Intervention = {
  id: string
  type: string
  status: string
  priority: string
  scheduledAt: string
  startedAt?: string | null
  completedAt?: string | null
  duration?: number | null
  technicianId?: string | null
  summary?: string | null
  customerNotes?: string | null
  internalNotes?: string | null
  notes?: string | null
  photos?: string | null
  actions?: string | null
  productsUsed?: string | null
  billable: boolean
  amount?: number | null
  currency: string
  client: { id: string; firstName: string; lastName: string; companyName?: string | null; email?: string | null; phone?: string | null }
  pool?: { id: string; name: string; type: string; accessInstructions?: string | null; brand?: string | null; model?: string | null } | null
}

type TeamMember = {
  userId: string
  name: string | null
  email: string
  role: string
  dispatchEnabled: boolean
}

export default function ProInterventionDetailPage() {
  const t = useTranslations('proApp')
  const { id } = useParams<{ id: string }>()
  const [intervention, setIntervention] = useState<Intervention | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [summary, setSummary] = useState('')
  const [customerNotes, setCustomerNotes] = useState('')
  const [internalNotes, setInternalNotes] = useState('')
  const [duration, setDuration] = useState('')
  const [priority, setPriority] = useState<(typeof PRIORITIES)[number]>('normal')
  const [actions, setActions] = useState('')
  const [products, setProducts] = useState('')
  const [billable, setBillable] = useState(true)
  const [amount, setAmount] = useState('')
  const [test, setTest] = useState({ ph: '', freeChlorine: '', alkalinity: '', temperature: '' })
  const [team, setTeam] = useState<TeamMember[]>([])
  const [technicianId, setTechnicianId] = useState('')

  const load = useCallback(async () => {
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
      setSummary(value.summary ?? '')
      setCustomerNotes(value.customerNotes ?? value.notes ?? '')
      setInternalNotes(value.internalNotes ?? '')
      setDuration(value.duration != null ? String(value.duration) : '')
      setPriority(PRIORITIES.includes(value.priority as (typeof PRIORITIES)[number]) ? value.priority as (typeof PRIORITIES)[number] : 'normal')
      setActions(parseLabels(value.actions).join('\n'))
      setProducts(parseLabels(value.productsUsed).join('\n'))
      setBillable(value.billable !== false)
      setAmount(value.amount != null ? String(value.amount) : '')
    } else setIntervention(null)
    setLoading(false)
  }, [id])

  useEffect(() => {
    const timer = window.setTimeout(() => { void load() }, 0)
    return () => window.clearTimeout(timer)
  }, [load])

  async function save(extra: Record<string, unknown> = {}) {
    setSaving(true); setMessage('')
    const response = await fetch(`/api/pro/interventions/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        summary: summary.trim() || null,
        customerNotes: customerNotes.trim() || null,
        internalNotes: internalNotes.trim() || null,
        duration: duration ? Number(duration) : null,
        priority,
        actions: lines(actions),
        productsUsed: lines(products),
        billable,
        amount: billable && amount ? Number(amount) : null,
        currency: 'EUR',
        technicianId: technicianId || null,
        ...extra,
      }),
    })
    const responseBody = await response.json().catch(() => null)
    setSaving(false)
    if (response.ok) { setMessage(t('crmReportSaved')); await load() }
    else setMessage(dispatchError(responseBody?.code, t) || responseBody?.error || t('errorGeneric'))
  }

  async function addWaterTest() {
    if (!intervention?.pool?.id) return
    setSaving(true)
    const response = await fetch('/api/pro/water-tests', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ proPoolId: intervention.pool.id, ...test, notes: `crm.intervention:${id}` }),
    })
    setSaving(false)
    setMessage(response.ok ? t('crmWaterTestSaved') : t('errorGeneric'))
    if (response.ok) setTest({ ph: '', freeChlorine: '', alkalinity: '', temperature: '' })
  }


  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div>
  if (!intervention) return <div className="rounded-xl border border-red-400/40 bg-red-500/10 p-4">{t('crmInterventionNotFound')}</div>

  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Link href="/pro/app/interventions" className="inline-flex items-center gap-1 text-xs text-muted-foreground"><ArrowLeft className="h-3.5 w-3.5" />{t('crmBackInterventions')}</Link>
    </div>

    <section className="rounded-2xl border border-white/40 bg-white/60 p-6 dark:border-white/10 dark:bg-white/[0.04]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><span className="section-label">{t(`type${cap(intervention.type)}` as never)}</span><h1 className="mt-2 font-display text-3xl font-bold">{intervention.client.firstName} {intervention.client.lastName}</h1><p className="text-sm text-muted-foreground">{intervention.client.companyName || intervention.pool?.name || t('noPool')} · {new Date(intervention.scheduledAt).toLocaleString()}</p></div>
        <div className="flex flex-wrap items-center gap-2">
          <PriorityBadge priority={intervention.priority} label={t(`crmPriority${cap(intervention.priority)}` as never)} />
          {intervention.status === 'scheduled' ? <button onClick={() => save({ status: 'in_progress' })} className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-4 py-2 text-xs font-bold text-white"><Play className="h-4 w-4" />{t('crmStartIntervention')}</button> : null}
          {!['completed', 'cancelled'].includes(intervention.status) ? <button onClick={() => save({ status: 'completed' })} className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-xs font-bold text-white"><CheckCircle2 className="h-4 w-4" />{t('crmCompleteIntervention')}</button> : null}
          <span className="rounded-full bg-secondary px-3 py-2 text-xs font-bold">{t(`status${statusKey(intervention.status)}` as never)}</span>
        </div>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label={t('interventionScheduledAt')} value={new Date(intervention.scheduledAt).toLocaleString()} />
        <Metric label={t('crmStartedAt')} value={intervention.startedAt ? new Date(intervention.startedAt).toLocaleString() : '—'} />
        <Metric label={t('crmCompletedAt')} value={intervention.completedAt ? new Date(intervention.completedAt).toLocaleString() : '—'} />
        <Metric label={t('crmAmount')} value={intervention.amount != null ? new Intl.NumberFormat(undefined, { style: 'currency', currency: intervention.currency || 'EUR' }).format(intervention.amount) : '—'} />
      </div>
      {intervention.pool?.accessInstructions ? <p className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs"><strong>{t('crmPoolAccessInstructions')}:</strong> {intervention.pool.accessInstructions}</p> : null}
    </section>

    {message ? <div className="rounded-xl border border-primary/30 bg-primary/10 p-3 text-sm">{message}</div> : null}

    <div className="grid gap-6 lg:grid-cols-2">
      <section className="space-y-4 rounded-2xl border border-white/40 bg-white/60 p-5 dark:border-white/10 dark:bg-white/[0.04]">
        <h2 className="font-display text-lg font-bold">{t('crmFieldReport')}</h2>
        <div className="grid gap-3 sm:grid-cols-2"><Field label={t('interventionTechnician')}><select className="input-glass" value={technicianId} onChange={(event) => setTechnicianId(event.target.value)}><option value="">{t('dispatchLeaveUnassigned')}</option>{team.map((member) => <option key={member.userId} value={member.userId}>{member.name || member.email} · {member.role}</option>)}</select></Field><Field label={t('crmInterventionPriority')}><select className="input-glass" value={priority} onChange={(event) => setPriority(event.target.value as (typeof PRIORITIES)[number])}>{PRIORITIES.map((value) => <option key={value} value={value}>{t(`crmPriority${cap(value)}` as never)}</option>)}</select></Field><Field label={t('interventionDuration')}><input className="input-glass" type="number" min="0" value={duration} onChange={(event) => setDuration(event.target.value)} /></Field></div>
        <Field label={t('crmInterventionSummary')}><input className="input-glass" value={summary} onChange={(event) => setSummary(event.target.value)} /></Field>
        <Field label={t('crmCustomerNotes')}><textarea className="input-glass min-h-24 resize-y" value={customerNotes} onChange={(event) => setCustomerNotes(event.target.value)} /></Field>
        <Field label={t('crmInternalNotes')}><textarea className="input-glass min-h-24 resize-y" value={internalNotes} onChange={(event) => setInternalNotes(event.target.value)} /></Field>
        <Field label={t('crmFieldActions')}><textarea className="input-glass min-h-24 resize-y" value={actions} onChange={(event) => setActions(event.target.value)} /></Field>
        <Field label={t('crmFieldProducts')}><textarea className="input-glass min-h-20 resize-y" value={products} onChange={(event) => setProducts(event.target.value)} /></Field>
        <label className="flex items-center gap-2"><input type="checkbox" checked={billable} onChange={(event) => setBillable(event.target.checked)} /><span className="text-xs font-semibold">{t('crmBillable')}</span></label>
        {billable ? <Field label={t('crmAmount')}><input className="input-glass" type="number" min="0" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} /></Field> : null}
        <button onClick={() => save()} disabled={saving} className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{t('crmSaveReport')}</button>
      </section>

      <div className="space-y-6">
        {intervention.pool ? <section className="rounded-2xl border border-white/40 bg-white/60 p-5 dark:border-white/10 dark:bg-white/[0.04]">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold"><FlaskConical className="h-5 w-5 text-primary" />{t('crmWaterTest')}</h2>
          <div className="mt-4 grid grid-cols-2 gap-3"><TestField label="pH" value={test.ph} onChange={(value) => setTest({ ...test, ph: value })} /><TestField label={t('crmFreeChlorine')} value={test.freeChlorine} onChange={(value) => setTest({ ...test, freeChlorine: value })} /><TestField label="TAC" value={test.alkalinity} onChange={(value) => setTest({ ...test, alkalinity: value })} /><TestField label={t('crmTemperature')} value={test.temperature} onChange={(value) => setTest({ ...test, temperature: value })} /></div>
          <button onClick={addWaterTest} disabled={saving} className="mt-3 rounded-full border border-primary/40 bg-primary/5 px-4 py-2 text-xs font-semibold text-primary">{t('crmSaveWaterTest')}</button>
        </section> : null}
      </div>
    </div>
  </div>
}

function lines(value: string) { return value.split('\n').map((item) => item.trim()).filter(Boolean) }
function parseLabels(value?: string | null): string[] { if (!value) return []; try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed.map((item) => typeof item === 'string' ? item : item.label || item.name || JSON.stringify(item)) : [] } catch { return [] } }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block text-xs font-semibold"><span className="mb-1 block">{label}</span>{children}</label> }
function TestField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="text-xs font-semibold text-muted-foreground">{label}<input type="number" step="any" value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-xl border border-border bg-background p-2 text-sm text-foreground" /></label> }
function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-secondary/50 p-3"><p className="text-[10px] uppercase text-muted-foreground">{label}</p><p className="mt-1 text-sm font-semibold">{value}</p></div> }
function PriorityBadge({ priority, label }: { priority: string; label: string }) { return <span className={`rounded-full px-3 py-2 text-xs font-bold ${priority === 'urgent' ? 'bg-red-500/10 text-red-700 dark:text-red-300' : priority === 'high' ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300' : 'bg-secondary text-muted-foreground'}`}>{label}</span> }
function cap(value: string) { return value.split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join('') }
function statusKey(value: string) { return value === 'in_progress' ? 'InProgress' : cap(value) }
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
