'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { AlertCircle, CalendarPlus, Check, Loader2, X } from 'lucide-react'

type Client = { id: string; firstName: string; lastName: string; companyName?: string | null }
type Pool = { id: string; name: string }
type TeamMember = { id: string; role: string; user: { id: string; name?: string | null; email: string } }
type Props = { open: boolean; onClose: () => void; onCreated?: () => void; initialClientId?: string }

const TYPES = ['maintenance', 'repair', 'opening', 'closing', 'emergency'] as const
const PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const
const RECURRENCES = ['none', 'weekly', 'biweekly', 'monthly'] as const

function defaultDateTime() {
  const date = new Date()
  date.setMinutes(0, 0, 0)
  date.setHours(date.getHours() + 1)
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

export function AddInterventionModal({ open, onClose, onCreated, initialClientId }: Props) {
  const t = useTranslations('proApp')
  const [clients, setClients] = useState<Client[]>([])
  const [pools, setPools] = useState<Pool[]>([])
  const [team, setTeam] = useState<TeamMember[]>([])
  const [clientId, setClientId] = useState(initialClientId ?? '')
  const [poolId, setPoolId] = useState('')
  const [technicianId, setTechnicianId] = useState('')
  const [type, setType] = useState<(typeof TYPES)[number]>('maintenance')
  const [priority, setPriority] = useState<(typeof PRIORITIES)[number]>('normal')
  const [scheduledAt, setScheduledAt] = useState(defaultDateTime)
  const [duration, setDuration] = useState('60')
  const [summary, setSummary] = useState('')
  const [customerNotes, setCustomerNotes] = useState('')
  const [internalNotes, setInternalNotes] = useState('')
  const [recurrence, setRecurrence] = useState<(typeof RECURRENCES)[number]>('none')
  const [occurrences, setOccurrences] = useState('4')
  const [billable, setBillable] = useState(true)
  const [amount, setAmount] = useState('')
  const [loadingClients, setLoadingClients] = useState(false)
  const [loadingPools, setLoadingPools] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedClient = useMemo(() => clients.find((client) => client.id === clientId), [clients, clientId])

  useEffect(() => {
    if (!open) return
    setClientId(initialClientId ?? '')
    setPoolId(''); setTechnicianId(''); setType('maintenance'); setPriority('normal')
    setScheduledAt(defaultDateTime()); setDuration('60'); setSummary('')
    setCustomerNotes(''); setInternalNotes(''); setRecurrence('none'); setOccurrences('4')
    setBillable(true); setAmount(''); setError(null); setSuccess(false)
    let active = true
    setLoadingClients(true)
    fetch('/api/pro/clients?pageSize=100&status=active', { cache: 'no-store' })
      .then(async (response) => { if (!response.ok) throw new Error(); return response.json() as Promise<{ clients?: Client[] }> })
      .then((data) => { if (active) setClients(data.clients ?? []) })
      .catch(() => { if (active) setError(t('errorGeneric')) })
      .finally(() => { if (active) setLoadingClients(false) })
    fetch('/api/pro/settings', { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : { members: [] })
      .then((data) => { if (active) setTeam(data.members ?? []) })
      .catch(() => { if (active) setTeam([]) })
    return () => { active = false }
  }, [initialClientId, open, t])

  useEffect(() => {
    if (!open || !clientId) { setPools([]); return }
    let active = true
    setLoadingPools(true)
    fetch(`/api/pro/clients/${clientId}`, { cache: 'no-store' })
      .then(async (response) => { if (!response.ok) throw new Error(); return response.json() as Promise<{ client?: { pools?: Pool[] } }> })
      .then((data) => { if (active) setPools(data.client?.pools ?? []) })
      .catch(() => { if (active) setError(t('errorGeneric')) })
      .finally(() => { if (active) setLoadingPools(false) })
    return () => { active = false }
  }, [clientId, open, t])

  function close() { if (!submitting) onClose() }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!clientId || submitting) return
    setSubmitting(true); setError(null)
    try {
      const response = await fetch('/api/pro/interventions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proClientId: clientId, proPoolId: poolId || undefined, technicianId: technicianId || undefined,
          type, priority, scheduledAt: new Date(scheduledAt).toISOString(),
          duration: duration ? Number(duration) : undefined,
          summary: summary.trim() || undefined,
          customerNotes: customerNotes.trim() || undefined,
          internalNotes: internalNotes.trim() || undefined,
          recurrence, occurrences: recurrence === 'none' ? 1 : Number(occurrences),
          billable, amount: billable && amount ? Number(amount) : undefined, currency: 'EUR',
        }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok || !data?.intervention) { setError(data?.error ?? t('errorGeneric')); return }
      setSuccess(true); onCreated?.(); window.setTimeout(onClose, 900)
    } catch { setError(t('errorGeneric')) } finally { setSubmitting(false) }
  }

  if (!open) return null

  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 backdrop-blur-sm sm:items-center sm:p-4" onClick={close} role="dialog" aria-modal="true" aria-label={t('interventionsNew')}>
    <div className="relative max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border border-white/40 bg-background/95 p-6 shadow-2xl backdrop-blur-2xl sm:rounded-3xl sm:p-8" onClick={(event) => event.stopPropagation()}>
      <div className="mb-5 flex items-start justify-between gap-3"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-gold text-white"><CalendarPlus className="h-5 w-5" /></div><div><h2 className="font-display text-lg font-bold">{t('interventionsNew')}</h2><p className="text-xs text-muted-foreground">{t('planningSubtitle')}</p></div></div><button type="button" onClick={close} className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary" aria-label={t('modalClose')}><X className="h-4 w-4" /></button></div>
      {success ? <div className="rounded-2xl border border-gold/40 bg-gold/5 p-8 text-center"><Check className="mx-auto h-10 w-10 text-gold" /><p className="mt-3 text-sm font-semibold">{t('statusScheduled')}</p></div> :
      <form onSubmit={submit} className="space-y-5">
        <section className="grid gap-4 sm:grid-cols-2">
          <Field label={t('interventionClient')}><select className="input-glass" value={clientId} disabled={loadingClients} onChange={(event) => { setClientId(event.target.value); setPoolId('') }} required><option value="">{loadingClients ? t('loading') : '—'}</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.firstName} {client.lastName}{client.companyName ? ` · ${client.companyName}` : ''}</option>)}</select></Field>
          <Field label={t('interventionPool')}><select className="input-glass" value={poolId} disabled={!clientId || loadingPools} onChange={(event) => setPoolId(event.target.value)}><option value="">{loadingPools ? t('loading') : t('noPool')}</option>{pools.map((pool) => <option key={pool.id} value={pool.id}>{pool.name}</option>)}</select></Field>
          <Field label={t('interventionType')}><select className="input-glass" value={type} onChange={(event) => setType(event.target.value as (typeof TYPES)[number])}>{TYPES.map((value) => <option key={value} value={value}>{t(`type${capitalize(value)}` as never)}</option>)}</select></Field>
          <Field label={t('crmInterventionPriority')}><select className="input-glass" value={priority} onChange={(event) => setPriority(event.target.value as (typeof PRIORITIES)[number])}>{PRIORITIES.map((value) => <option key={value} value={value}>{t(`crmPriority${capitalize(value)}` as never)}</option>)}</select></Field>
          <Field label={t('interventionScheduledAt')}><input className="input-glass" type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} required /></Field>
          <Field label={t('interventionDuration')}><input className="input-glass" type="number" min="0" step="5" value={duration} onChange={(event) => setDuration(event.target.value)} /></Field>
          <Field label={t('crmRecurrence')}><select className="input-glass" value={recurrence} onChange={(event) => setRecurrence(event.target.value as (typeof RECURRENCES)[number])}>{RECURRENCES.map((value) => <option key={value} value={value}>{t(`crmRecurrence${capitalize(value)}` as never)}</option>)}</select></Field>
          {recurrence !== 'none' ? <Field label={t('crmOccurrences')}><input className="input-glass" type="number" min="2" max="52" value={occurrences} onChange={(event) => setOccurrences(event.target.value)} /></Field> : <div />}
          <Field label={t('interventionTechnician')} full><select className="input-glass" value={technicianId} onChange={(event) => setTechnicianId(event.target.value)}><option value="">{t('noTechnician')}</option>{team.filter((member) => member.role !== 'viewer').map((member) => <option key={member.id} value={member.user.id}>{member.user.name || member.user.email} · {member.role}</option>)}</select></Field>
        </section>
        <section className="grid gap-4 rounded-2xl border border-border/40 bg-secondary/20 p-4 sm:grid-cols-2">
          <Field label={t('crmInterventionSummary')} full><input className="input-glass" value={summary} onChange={(event) => setSummary(event.target.value)} /></Field>
          <Field label={t('crmCustomerNotes')} full><textarea className="input-glass min-h-20 resize-y" value={customerNotes} onChange={(event) => setCustomerNotes(event.target.value)} /></Field>
          <Field label={t('crmInternalNotes')} full><textarea className="input-glass min-h-20 resize-y" value={internalNotes} onChange={(event) => setInternalNotes(event.target.value)} /></Field>
          <label className="flex items-center gap-2 sm:col-span-2"><input type="checkbox" checked={billable} onChange={(event) => setBillable(event.target.checked)} /><span className="text-xs font-semibold">{t('crmBillable')}</span></label>
          {billable ? <Field label={t('crmAmount')}><input className="input-glass" type="number" min="0" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} /></Field> : null}
        </section>
        {selectedClient ? <p className="text-xs text-muted-foreground">{selectedClient.firstName} {selectedClient.lastName}</p> : null}
        {error ? <p className="flex gap-2 rounded-xl border border-red-400/40 bg-red-500/10 p-3 text-xs text-red-700 dark:text-red-300"><AlertCircle className="h-4 w-4 shrink-0" />{error}</p> : null}
        <div className="flex justify-end gap-2"><button type="button" onClick={close} className="rounded-full border border-border px-4 py-2 text-xs font-semibold">{t('modalCancel')}</button><button type="submit" disabled={!clientId || submitting} className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-gold to-primary px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}{t('interventionsNew')}</button></div>
      </form>}
    </div>
  </div>
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) { return <label className={full ? 'block sm:col-span-2' : 'block'}><span className="mb-1.5 block text-xs font-semibold">{label}</span>{children}</label> }
function capitalize(value: string) { return value.split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join('') }
