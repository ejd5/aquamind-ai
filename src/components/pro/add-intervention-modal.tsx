'use client'

/**
 * AQWELIA Pro — intervention planner.
 *
 * The first field workflow for a pilot pro: pick a client, optionally pick one
 * of that client's pools, then schedule the visit.  Keeping this in a shared
 * component makes the action available from the client record, planning and
 * intervention list without duplicating the business rules.
 */
import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { AlertCircle, CalendarPlus, Check, Loader2, X } from 'lucide-react'

type Client = { id: string; firstName: string; lastName: string }
type Pool = { id: string; name: string }
type TeamMember = { id: string; role: string; user: { id: string; name?: string | null; email: string } }

type Props = {
  open: boolean
  onClose: () => void
  onCreated?: () => void
  initialClientId?: string
}

const TYPES = ['maintenance', 'repair', 'opening', 'closing', 'emergency'] as const

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
  const [clientId, setClientId] = useState(initialClientId ?? '')
  const [poolId, setPoolId] = useState('')
  const [team, setTeam] = useState<TeamMember[]>([])
  const [technicianId, setTechnicianId] = useState('')
  const [type, setType] = useState<(typeof TYPES)[number]>('maintenance')
  const [scheduledAt, setScheduledAt] = useState(defaultDateTime)
  const [duration, setDuration] = useState('60')
  const [notes, setNotes] = useState('')
  const [recurrence, setRecurrence] = useState('none')
  const [occurrences, setOccurrences] = useState('4')
  const [loadingClients, setLoadingClients] = useState(false)
  const [loadingPools, setLoadingPools] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedClient = useMemo(
    () => clients.find((client) => client.id === clientId),
    [clients, clientId]
  )

  useEffect(() => {
    if (!open) return
    setClientId(initialClientId ?? '')
    setPoolId('')
    setTechnicianId('')
    setScheduledAt(defaultDateTime())
    setDuration('60')
    setNotes('')
    setRecurrence('none')
    setOccurrences('4')
    setError(null)
    setSuccess(false)

    let active = true
    setLoadingClients(true)
    fetch('/api/pro/clients?pageSize=100', { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) throw new Error()
        return res.json() as Promise<{ clients?: Client[] }>
      })
      .then((data) => {
        if (active) setClients(data.clients ?? [])
      })
      .catch(() => {
        if (active) setError(t('errorGeneric'))
      })
      .finally(() => {
        if (active) setLoadingClients(false)
      })
    fetch('/api/pro/settings', { cache: 'no-store' })
      .then((res) => res.ok ? res.json() : { members: [] })
      .then((data) => { if (active) setTeam(data.members ?? []) })
      .catch(() => { if (active) setTeam([]) })
    return () => {
      active = false
    }
  }, [initialClientId, open, t])

  useEffect(() => {
    if (!open || !clientId) {
      setPools([])
      return
    }
    let active = true
    setLoadingPools(true)
    fetch(`/api/pro/clients/${clientId}`, { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) throw new Error()
        return res.json() as Promise<{ client?: { pools?: Pool[] } }>
      })
      .then((data) => {
        if (active) setPools(data.client?.pools ?? [])
      })
      .catch(() => {
        if (active) setError(t('errorGeneric'))
      })
      .finally(() => {
        if (active) setLoadingPools(false)
      })
    return () => {
      active = false
    }
  }, [clientId, open, t])

  function close() {
    if (!submitting) onClose()
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!clientId || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/pro/interventions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proClientId: clientId,
          proPoolId: poolId || undefined,
          type,
          scheduledAt: new Date(scheduledAt).toISOString(),
          duration: duration ? Number(duration) : undefined,
          technicianId: technicianId || undefined,
          notes: notes.trim() || undefined,
          recurrence,
          occurrences: recurrence === 'none' ? 1 : Number(occurrences),
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.intervention) {
        setError(data?.error ?? t('errorGeneric'))
        return
      }
      setSuccess(true)
      onCreated?.()
      window.setTimeout(onClose, 900)
    } catch {
      setError(t('errorGeneric'))
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={close}
      role="dialog"
      aria-modal="true"
      aria-label={t('interventionsNew')}
    >
      <div
        className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-white/40 bg-background/95 p-6 shadow-2xl backdrop-blur-2xl sm:rounded-3xl sm:p-8"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-gold text-white shadow-md shadow-primary/30">
              <CalendarPlus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold tracking-tight">{t('interventionsNew')}</h2>
              <p className="text-xs text-muted-foreground">{t('planningSubtitle')}</p>
            </div>
          </div>
          <button type="button" onClick={close} className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground" aria-label={t('modalClose')}>
            <X className="h-4 w-4" />
          </button>
        </div>

        {success ? (
          <div className="rounded-2xl border border-gold/40 bg-gold/5 p-6 text-center">
            <Check className="mx-auto h-9 w-9 text-gold" />
            <p className="mt-3 text-sm font-semibold">{t('statusScheduled')}</p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <Field label={t('interventionClient')} required>
              <select className="input-glass" value={clientId} disabled={loadingClients} onChange={(event) => { setClientId(event.target.value); setPoolId('') }} required>
                <option value="">{loadingClients ? t('loading') : '—'}</option>
                {clients.map((client) => <option key={client.id} value={client.id}>{client.firstName} {client.lastName}</option>)}
              </select>
            </Field>
            <Field label={t('interventionPool')}>
              <select className="input-glass" value={poolId} disabled={!clientId || loadingPools} onChange={(event) => setPoolId(event.target.value)}>
                <option value="">{loadingPools ? t('loading') : t('noPool')}</option>
                {pools.map((pool) => <option key={pool.id} value={pool.id}>{pool.name}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label={t('interventionType')}>
                <select className="input-glass" value={type} onChange={(event) => setType(event.target.value as (typeof TYPES)[number])}>
                  {TYPES.map((value) => <option key={value} value={value}>{t(`type${capitalize(value)}` as never)}</option>)}
                </select>
              </Field>
              <Field label={t('interventionDuration')}>
                <input className="input-glass" type="number" min="0" step="5" inputMode="numeric" value={duration} onChange={(event) => setDuration(event.target.value)} />
              </Field>
            </div>
            <Field label={t('interventionScheduledAt')} required>
              <input className="input-glass" type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} required />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Récurrence">
                <select className="input-glass" value={recurrence} onChange={(event) => setRecurrence(event.target.value)}>
                  <option value="none">Visite unique</option>
                  <option value="weekly">Chaque semaine</option>
                  <option value="biweekly">Toutes les 2 semaines</option>
                  <option value="monthly">Chaque mois</option>
                </select>
              </Field>
              {recurrence !== 'none' && <Field label="Nombre de visites">
                <input className="input-glass" type="number" min="2" max="52" value={occurrences} onChange={(event) => setOccurrences(event.target.value)} />
              </Field>}
            </div>
            <Field label={t('interventionTechnician')}>
              <select className="input-glass" value={technicianId} onChange={(event) => setTechnicianId(event.target.value)}>
                <option value="">{t('noTechnician')}</option>
                {team.filter((member) => member.role !== 'viewer').map((member) => <option key={member.id} value={member.user.id}>{member.user.name || member.user.email} · {member.role}</option>)}
              </select>
            </Field>
            <Field label={t('interventionNotes')}>
              <textarea className="input-glass min-h-24 resize-y" value={notes} onChange={(event) => setNotes(event.target.value)} />
            </Field>
            {selectedClient && <p className="text-xs text-muted-foreground">{selectedClient.firstName} {selectedClient.lastName}</p>}
            {error && <p className="flex items-center gap-2 rounded-xl border border-red-400/40 bg-red-500/10 p-3 text-xs text-red-700 dark:text-red-300"><AlertCircle className="h-4 w-4 shrink-0" />{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={close} className="rounded-full border border-border/40 px-4 py-2 text-xs font-semibold">{t('modalCancel')}</button>
              <button type="submit" disabled={!clientId || submitting} className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-gold to-primary px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
                {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}{t('interventionsNew')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return <label className="block text-xs font-semibold text-foreground"><span className="mb-1.5 block">{label}{required ? ' *' : ''}</span>{children}</label>
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}
