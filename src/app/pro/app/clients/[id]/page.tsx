'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  Building2,
  Calendar,
  Check,
  Clock3,
  Loader2,
  Mail,
  MapPin,
  MessageSquarePlus,
  Phone,
  Plus,
  RefreshCw,
  Save,
  Tags,
  Waves,
  Wrench,
} from 'lucide-react'
import { AddPoolModal } from '@/components/pro/add-pool-modal'
import { AddInterventionModal } from '@/components/pro/add-intervention-modal'

const STATUSES = ['prospect', 'active', 'paused', 'archived'] as const
const ACTIVITY_TYPES = ['note', 'call', 'email', 'sms', 'visit', 'follow_up'] as const

type PoolRow = {
  id: string
  name: string
  type: string
  status?: string
  volume?: number | null
  unit?: string
  brand?: string | null
  model?: string | null
  nextServiceAt?: string | null
  _count?: { interventions?: number; waterTests?: number }
}

type InterventionRow = {
  id: string
  type: string
  status: string
  priority?: string
  scheduledAt: string
  completedAt?: string | null
  duration?: number | null
  amount?: number | null
  currency?: string
  pool?: { id: string; name?: string } | null
}

type ActivityRow = {
  id: string
  type: string
  title: string
  details?: string | null
  occurredAt: string
}

type ClientDetail = {
  id: string
  firstName: string
  lastName: string
  companyName?: string | null
  email?: string | null
  phone?: string | null
  address?: string | null
  city?: string | null
  zipCode?: string | null
  status: string
  source?: string | null
  preferredContact?: string
  tags?: string[]
  lastContactAt?: string | null
  nextFollowUpAt?: string | null
  notes?: string | null
  pools?: PoolRow[]
  interventions?: InterventionRow[]
  activities?: ActivityRow[]
  _count?: { pools?: number; interventions?: number; activities?: number }
}

type ActivityForm = {
  type: (typeof ACTIVITY_TYPES)[number]
  title: string
  details: string
  occurredAt: string
  nextFollowUpAt: string
}

function todayLocal() {
  const now = new Date()
  const offset = now.getTimezoneOffset() * 60_000
  return new Date(now.getTime() - offset).toISOString().slice(0, 16)
}

export default function ProClientDetailPage() {
  const t = useTranslations('proApp')
  const { id: clientId = '' } = useParams<{ id: string }>()
  const router = useRouter()
  const [client, setClient] = useState<ClientDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [savingStatus, setSavingStatus] = useState(false)
  const [savingActivity, setSavingActivity] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [poolModalOpen, setPoolModalOpen] = useState(false)
  const [interventionModalOpen, setInterventionModalOpen] = useState(false)
  const [status, setStatus] = useState<(typeof STATUSES)[number]>('active')
  const [activityForm, setActivityForm] = useState<ActivityForm>({
    type: 'note',
    title: '',
    details: '',
    occurredAt: todayLocal(),
    nextFollowUpAt: '',
  })

  const load = useCallback(async () => {
    if (!clientId) return
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/pro/clients/${clientId}`, { cache: 'no-store' })
      if (response.status === 404) throw new Error('not-found')
      if (!response.ok) throw new Error('request-failed')
      const data = (await response.json()) as { client: ClientDetail }
      setClient(data.client)
      setStatus((STATUSES.includes(data.client.status as (typeof STATUSES)[number]) ? data.client.status : 'active') as (typeof STATUSES)[number])
    } catch (loadError) {
      setClient(null)
      setError(loadError instanceof Error && loadError.message === 'not-found' ? t('clientNotFound') : t('errorGeneric'))
    } finally {
      setLoading(false)
    }
  }, [clientId, t])

  useEffect(() => { void load() }, [load])

  async function saveStatus() {
    if (!client || status === client.status) return
    setSavingStatus(true)
    setMessage(null)
    const response = await fetch(`/api/pro/clients/${client.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setSavingStatus(false)
    if (!response.ok) return setMessage(t('errorGeneric'))
    setMessage(t('crmStatusSaved'))
    await load()
  }

  async function addActivity(event: React.FormEvent) {
    event.preventDefault()
    if (!client || !activityForm.title.trim()) return
    setSavingActivity(true)
    setMessage(null)
    const response = await fetch(`/api/pro/clients/${client.id}/activities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: activityForm.type,
        title: activityForm.title.trim(),
        details: activityForm.details.trim() || undefined,
        occurredAt: activityForm.occurredAt ? new Date(activityForm.occurredAt).toISOString() : undefined,
        nextFollowUpAt: activityForm.nextFollowUpAt
          ? new Date(`${activityForm.nextFollowUpAt}T09:00:00`).toISOString()
          : undefined,
      }),
    })
    setSavingActivity(false)
    if (!response.ok) return setMessage(t('errorGeneric'))
    setActivityForm({ type: 'note', title: '', details: '', occurredAt: todayLocal(), nextFollowUpAt: '' })
    setMessage(t('crmActivitySaved'))
    await load()
  }

  const pools = client?.pools ?? []
  const interventions = client?.interventions ?? []
  const activities = client?.activities ?? []

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button onClick={() => router.push('/pro/app/clients')} className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" />{t('clientBackToList')}
        </button>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setInterventionModalOpen(true)} className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs font-semibold hover:border-gold/60 hover:text-gold"><Wrench className="h-3.5 w-3.5" />{t('clientNewIntervention')}</button>
          <button onClick={() => setPoolModalOpen(true)} className="glow-gold inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-gold to-primary px-4 py-2 text-xs font-bold text-white"><Plus className="h-3.5 w-3.5" />{t('clientAddPool')}</button>
        </div>
      </div>

      {error ? <div className="flex gap-2 rounded-2xl border border-red-400/40 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-300"><AlertCircle className="h-4 w-4 shrink-0" />{error}</div> : null}
      {loading && !client ? <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div> : null}

      {client ? <>
        <section className="relative overflow-hidden rounded-2xl border border-white/40 bg-white/60 p-6 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04]">
          <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent" />
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-gold text-xl font-bold text-white">{initials(client.firstName, client.lastName)}</div>
              <div><div className="flex flex-wrap items-center gap-2"><h1 className="font-display text-2xl font-bold sm:text-3xl">{client.firstName} {client.lastName}</h1><StatusBadge status={client.status} label={t(`crmStatus${capitalize(client.status)}` as never)} /></div><p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><Building2 className="h-3 w-3" />{client.companyName || t('crmNoCompany')}</p></div>
            </div>
            <button onClick={load} disabled={loading} className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold disabled:opacity-50">{loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}{t('retry')}</button>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Info icon={<Mail className="h-4 w-4" />} label={t('clientEmail')} value={client.email} />
            <Info icon={<Phone className="h-4 w-4" />} label={t('clientPhone')} value={client.phone} />
            <Info icon={<MapPin className="h-4 w-4" />} label={t('clientAddress')} value={formatAddress(client.address, client.zipCode, client.city)} />
            <Info icon={<Clock3 className="h-4 w-4" />} label={t('crmNextFollowUp')} value={formatDate(client.nextFollowUpAt) || t('crmNoFollowUp')} emphasis={Boolean(client.nextFollowUpAt && new Date(client.nextFollowUpAt).getTime() < Date.now())} />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Tags className="h-4 w-4 text-muted-foreground" />
            {(client.tags?.length ? client.tags : [t('crmNoTags')]).map((tag) => <span key={tag} className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary">{tag}</span>)}
          </div>

          <div className="mt-5 flex flex-wrap items-end gap-2 rounded-xl border border-border/40 bg-secondary/30 p-3">
            <label className="min-w-44 flex-1 text-xs font-semibold"><span className="mb-1 block">{t('crmClientStatus')}</span><select className="input-glass" value={status} onChange={(event) => setStatus(event.target.value as (typeof STATUSES)[number])}>{STATUSES.map((value) => <option key={value} value={value}>{t(`crmStatus${capitalize(value)}` as never)}</option>)}</select></label>
            <button onClick={saveStatus} disabled={savingStatus || status === client.status} className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-40">{savingStatus ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}{t('crmSaveStatus')}</button>
            {message ? <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Check className="h-3.5 w-3.5 text-emerald-500" />{message}</span> : null}
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <form onSubmit={addActivity} className="rounded-2xl border border-white/40 bg-white/60 p-5 dark:border-white/10 dark:bg-white/[0.04]">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold"><MessageSquarePlus className="h-5 w-5 text-primary" />{t('crmAddActivity')}</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Field label={t('crmActivityType')}><select className="input-glass" value={activityForm.type} onChange={(event) => setActivityForm({ ...activityForm, type: event.target.value as ActivityForm['type'] })}>{ACTIVITY_TYPES.map((value) => <option key={value} value={value}>{t(`crmActivity${capitalize(value)}` as never)}</option>)}</select></Field>
              <Field label={t('crmActivityWhen')}><input className="input-glass" type="datetime-local" value={activityForm.occurredAt} onChange={(event) => setActivityForm({ ...activityForm, occurredAt: event.target.value })} /></Field>
              <Field label={t('crmActivityTitle')} full><input className="input-glass" value={activityForm.title} onChange={(event) => setActivityForm({ ...activityForm, title: event.target.value })} required /></Field>
              <Field label={t('crmActivityDetails')} full><textarea className="input-glass min-h-24 resize-y" value={activityForm.details} onChange={(event) => setActivityForm({ ...activityForm, details: event.target.value })} /></Field>
              <Field label={t('crmNextFollowUp')} full><input className="input-glass" type="date" value={activityForm.nextFollowUpAt} onChange={(event) => setActivityForm({ ...activityForm, nextFollowUpAt: event.target.value })} /></Field>
            </div>
            <button disabled={savingActivity || !activityForm.title.trim()} className="mt-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-gold to-primary px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{savingActivity ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}{t('crmAddActivity')}</button>
          </form>

          <section className="rounded-2xl border border-white/40 bg-white/60 p-5 dark:border-white/10 dark:bg-white/[0.04]">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold"><Activity className="h-5 w-5 text-gold" />{t('crmActivities')}</h2>
            <div className="mt-4 max-h-[470px] space-y-3 overflow-y-auto pr-1">{activities.length === 0 ? <p className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">{t('crmActivitiesEmpty')}</p> : activities.map((row) => <ActivityItem key={row.id} activity={row} t={t} />)}</div>
          </section>
        </div>

        <section className="rounded-2xl border border-white/40 bg-white/60 p-5 dark:border-white/10 dark:bg-white/[0.04]">
          <div className="mb-4 flex items-center justify-between"><h2 className="flex items-center gap-2 font-display text-lg font-bold"><Waves className="h-4 w-4 text-primary" />{t('clientPools')}</h2><button onClick={() => setPoolModalOpen(true)} className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/5 px-3 py-1.5 text-[11px] font-semibold text-gold"><Plus className="h-3 w-3" />{t('clientAddPool')}</button></div>
          {pools.length === 0 ? <p className="rounded-xl border border-dashed border-border py-8 text-center text-xs text-muted-foreground">{t('clientPoolsEmpty')}</p> : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{pools.map((pool) => <Link key={pool.id} href={`/pro/app/pools/${pool.id}`} className="rounded-xl border border-border/40 bg-card/40 p-4 transition hover:border-gold/50"><div className="flex justify-between gap-2"><p className="font-semibold">{pool.name}</p><StatusBadge status={pool.status || 'active'} label={t(`crmPoolStatus${capitalize(pool.status || 'active')}` as never)} /></div><p className="mt-1 text-xs text-muted-foreground">{pool.brand || pool.type} {pool.model || ''}</p><p className="mt-3 text-[10px] text-muted-foreground">{t('crmNextService')}: {formatDate(pool.nextServiceAt) || '—'}</p></Link>)}</div>}
        </section>

        <section className="rounded-2xl border border-white/40 bg-white/60 p-5 dark:border-white/10 dark:bg-white/[0.04]">
          <div className="mb-4 flex items-center justify-between"><h2 className="flex items-center gap-2 font-display text-lg font-bold"><Calendar className="h-4 w-4 text-primary" />{t('clientInterventionsHistory')}</h2><Link href="/pro/app/interventions" className="text-xs font-medium text-gold hover:underline">{t('viewAll')}</Link></div>
          {interventions.length === 0 ? <p className="rounded-xl border border-dashed border-border py-8 text-center text-xs text-muted-foreground">{t('clientInterventionsEmpty')}</p> : <div className="space-y-2">{interventions.map((intervention) => <Link key={intervention.id} href={`/pro/app/interventions/${intervention.id}`} className="flex flex-wrap items-center gap-3 rounded-xl border border-border/40 bg-card/40 p-3 hover:border-gold/50"><StatusBadge status={intervention.priority || 'normal'} label={t(`crmPriority${capitalize(intervention.priority || 'normal')}` as never)} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{intervention.pool?.name ?? t('noPool')}</p><p className="text-xs text-muted-foreground">{formatDateTime(intervention.scheduledAt)}</p></div><StatusBadge status={intervention.status} label={t(`status${statusKey(intervention.status)}` as never)} />{intervention.amount != null ? <span className="text-xs font-semibold">{new Intl.NumberFormat(undefined, { style: 'currency', currency: intervention.currency || 'EUR' }).format(intervention.amount)}</span> : null}</Link>)}</div>}
        </section>
      </> : null}

      <AddPoolModal open={poolModalOpen} clientId={clientId} onClose={() => setPoolModalOpen(false)} onCreated={() => { void load() }} />
      <AddInterventionModal open={interventionModalOpen} initialClientId={clientId} onClose={() => setInterventionModalOpen(false)} onCreated={() => { void load() }} />
    </div>
  )
}

function ActivityItem({ activity, t }: { activity: ActivityRow; t: ReturnType<typeof useTranslations> }) {
  let details = activity.details || ''
  if (details.startsWith('{')) { try { const parsed = JSON.parse(details) as { count?: number }; details = parsed.count && parsed.count > 1 ? t('crmActivityMultipleInterventions', { count: parsed.count }) : '' } catch { /* keep original */ } }
  return <div className="relative border-l-2 border-primary/20 pl-4"><span className="absolute -left-[5px] top-1 h-2 w-2 rounded-full bg-primary" /><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold">{activityTitle(activity, t)}</p><time className="text-[10px] text-muted-foreground">{formatDateTime(activity.occurredAt)}</time></div>{details ? <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">{details}</p> : null}</div>
}

function activityTitle(activity: ActivityRow, t: ReturnType<typeof useTranslations>) {
  if (activity.title === 'crm.client_created') return t('crmActivityClientCreated')
  if (activity.title.startsWith('crm.status_change:')) return t('crmActivityStatusChanged')
  if (activity.title.startsWith('crm.intervention_')) return t('crmActivityIntervention')
  return activity.title || t(`crmActivity${capitalize(activity.type)}` as never)
}

function Info({ icon, label, value, emphasis }: { icon: React.ReactNode; label: string; value?: string | null; emphasis?: boolean }) { return <div className={`rounded-xl border border-border/40 bg-card/30 p-3 ${emphasis ? 'border-amber-500/50 bg-amber-500/5' : ''}`}><p className="flex items-center gap-1.5 text-[10px] uppercase text-muted-foreground">{icon}{label}</p><p className="mt-1 break-words text-sm font-medium">{value || '—'}</p></div> }
function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) { return <label className={full ? 'block sm:col-span-2' : 'block'}><span className="mb-1.5 block text-xs font-semibold">{label}</span>{children}</label> }
function StatusBadge({ status, label }: { status: string; label: string }) { const urgent = ['urgent', 'overdue', 'cancelled'].includes(status); const good = ['active', 'completed'].includes(status); return <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${urgent ? 'bg-red-500/10 text-red-700 dark:text-red-300' : good ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'bg-secondary text-muted-foreground'}`}>{label}</span> }
function initials(first?: string, last?: string) { return `${first?.trim().charAt(0) || ''}${last?.trim().charAt(0) || ''}`.toUpperCase() || '?' }
function formatAddress(address?: string | null, zip?: string | null, city?: string | null) { return [address, [zip, city].filter(Boolean).join(' ')].filter(Boolean).join(', ') || '—' }
function formatDate(value?: string | null) { return value ? new Date(value).toLocaleDateString() : '' }
function formatDateTime(value: string) { return new Date(value).toLocaleString() }
function capitalize(value: string) { return value.charAt(0).toUpperCase() + value.slice(1) }
function statusKey(value: string) { return value === 'in_progress' ? 'InProgress' : capitalize(value) }
