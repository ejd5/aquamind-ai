'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Calendar,
  Download,
  FlaskConical,
  KeyRound,
  Loader2,
  Save,
  Settings2,
  Wrench,
} from 'lucide-react'

const POOL_STATUSES = ['active', 'seasonal', 'inactive'] as const

type WaterTest = { id: string; testedAt: string; ph?: number | null; freeChlorine?: number | null; alkalinity?: number | null; temperature?: number | null; notes?: string | null }
type Pool = {
  id: string
  name: string
  type: string
  status: string
  volume?: number | null
  unit?: string
  shape?: string | null
  surface?: string | null
  treatmentType?: string | null
  filterType?: string | null
  brand?: string | null
  model?: string | null
  serialNumber?: string | null
  installedAt?: string | null
  address?: string | null
  accessInstructions?: string | null
  equipmentNotes?: string | null
  lastServiceAt?: string | null
  nextServiceAt?: string | null
  notes?: string | null
  client: { id: string; firstName: string; lastName: string; companyName?: string | null; email?: string | null; phone?: string | null }
  waterTests: WaterTest[]
  interventions: Array<{ id: string; type: string; status: string; priority?: string; scheduledAt: string; amount?: number | null; currency?: string }>
  _count?: { waterTests?: number; interventions?: number }
}

type ServiceForm = {
  status: (typeof POOL_STATUSES)[number]
  brand: string
  model: string
  serialNumber: string
  installedAt: string
  accessInstructions: string
  equipmentNotes: string
  lastServiceAt: string
  nextServiceAt: string
}

function dateInput(value?: string | null) { return value ? new Date(value).toISOString().slice(0, 10) : '' }
function datePayload(value: string) { return value ? new Date(`${value}T09:00:00`).toISOString() : null }

export default function ProPoolDetailPage() {
  const t = useTranslations('proApp')
  const { id } = useParams<{ id: string }>()
  const [pool, setPool] = useState<Pool | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [test, setTest] = useState({ ph: '', freeChlorine: '', alkalinity: '', temperature: '', notes: '' })
  const [service, setService] = useState<ServiceForm>({ status: 'active', brand: '', model: '', serialNumber: '', installedAt: '', accessInstructions: '', equipmentNotes: '', lastServiceAt: '', nextServiceAt: '' })

  const load = useCallback(async () => {
    setLoading(true)
    const response = await fetch(`/api/pro/pools/${id}`, { cache: 'no-store' })
    if (response.ok) {
      const value = (await response.json()).pool as Pool
      setPool(value)
      setService({
        status: POOL_STATUSES.includes(value.status as (typeof POOL_STATUSES)[number]) ? value.status as (typeof POOL_STATUSES)[number] : 'active',
        brand: value.brand ?? '', model: value.model ?? '', serialNumber: value.serialNumber ?? '',
        installedAt: dateInput(value.installedAt), accessInstructions: value.accessInstructions ?? '',
        equipmentNotes: value.equipmentNotes ?? '', lastServiceAt: dateInput(value.lastServiceAt), nextServiceAt: dateInput(value.nextServiceAt),
      })
    } else setPool(null)
    setLoading(false)
  }, [id])

  useEffect(() => { void load() }, [load])

  async function saveService(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setMessage('')
    const response = await fetch(`/api/pro/pools/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...service,
        installedAt: datePayload(service.installedAt),
        lastServiceAt: datePayload(service.lastServiceAt),
        nextServiceAt: datePayload(service.nextServiceAt),
      }),
    })
    setSaving(false); setMessage(response.ok ? t('crmPoolSaved') : t('errorGeneric'))
    if (response.ok) await load()
  }

  async function addTest(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setMessage('')
    const response = await fetch('/api/pro/water-tests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ proPoolId: id, ...test }) })
    setSaving(false); setMessage(response.ok ? t('crmWaterTestSaved') : t('errorGeneric'))
    if (response.ok) { setTest({ ph: '', freeChlorine: '', alkalinity: '', temperature: '', notes: '' }); await load() }
  }

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div>
  if (!pool) return <div className="rounded-xl border border-red-400/40 bg-red-500/10 p-4">{t('crmPoolNotFound')}</div>

  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><Link href="/pro/app/pools" className="inline-flex items-center gap-1 text-xs text-muted-foreground"><ArrowLeft className="h-3.5 w-3.5" />{t('crmBackPools')}</Link><a href={`/api/pro/pools/${pool.id}/report`} className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/5 px-4 py-2 text-xs font-semibold text-gold"><Download className="h-4 w-4" />{t('crmPoolReport')}</a></div>

    <section className="rounded-2xl border border-white/40 bg-white/60 p-6 dark:border-white/10 dark:bg-white/[0.04]">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><span className="section-label">{t(`poolType${cap(pool.type)}` as never)}</span><h1 className="mt-2 font-display text-3xl font-bold">{pool.name}</h1><Link href={`/pro/app/clients/${pool.client.id}`} className="text-sm text-gold hover:underline">{pool.client.firstName} {pool.client.lastName}{pool.client.companyName ? ` · ${pool.client.companyName}` : ''}</Link></div><StatusBadge status={pool.status} label={t(`crmPoolStatus${cap(pool.status)}` as never)} /></div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Metric label={t('crmPoolVolume')} value={pool.volume ? `${pool.volume} ${pool.unit ?? 'm3'}` : '—'} /><Metric label={t('crmPoolTreatment')} value={pool.treatmentType || '—'} /><Metric label={t('crmPoolFilter')} value={pool.filterType || '—'} /><Metric label={t('crmPoolAnalyses')} value={String(pool._count?.waterTests ?? pool.waterTests.length)} /></div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Metric label={t('crmPoolBrand')} value={pool.brand || '—'} /><Metric label={t('crmPoolModel')} value={pool.model || '—'} /><Metric label={t('crmPoolSerial')} value={pool.serialNumber || '—'} /><Metric label={t('crmPoolInstalledAt')} value={formatDate(pool.installedAt) || '—'} /></div>
      {pool.accessInstructions ? <p className="mt-4 flex gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs"><KeyRound className="h-4 w-4 shrink-0" /><span><strong>{t('crmPoolAccessInstructions')}:</strong> {pool.accessInstructions}</span></p> : null}
    </section>

    {message ? <div className="rounded-xl border border-primary/30 bg-primary/10 p-3 text-sm">{message}</div> : null}

    <div className="grid gap-6 lg:grid-cols-2">
      <form onSubmit={saveService} className="rounded-2xl border border-white/40 bg-white/60 p-5 dark:border-white/10 dark:bg-white/[0.04]">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold"><Settings2 className="h-5 w-5 text-gold" />{t('crmPoolTechnicalFile')}</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label={t('crmPoolStatus')}><select className="input-glass" value={service.status} onChange={(event) => setService({ ...service, status: event.target.value as ServiceForm['status'] })}>{POOL_STATUSES.map((value) => <option key={value} value={value}>{t(`crmPoolStatus${cap(value)}` as never)}</option>)}</select></Field>
          <Field label={t('crmPoolInstalledAt')}><input className="input-glass" type="date" value={service.installedAt} onChange={(event) => setService({ ...service, installedAt: event.target.value })} /></Field>
          <Field label={t('crmPoolBrand')}><input className="input-glass" value={service.brand} onChange={(event) => setService({ ...service, brand: event.target.value })} /></Field>
          <Field label={t('crmPoolModel')}><input className="input-glass" value={service.model} onChange={(event) => setService({ ...service, model: event.target.value })} /></Field>
          <Field label={t('crmPoolSerial')} full><input className="input-glass" value={service.serialNumber} onChange={(event) => setService({ ...service, serialNumber: event.target.value })} /></Field>
          <Field label={t('crmLastService')}><input className="input-glass" type="date" value={service.lastServiceAt} onChange={(event) => setService({ ...service, lastServiceAt: event.target.value })} /></Field>
          <Field label={t('crmNextService')}><input className="input-glass" type="date" value={service.nextServiceAt} onChange={(event) => setService({ ...service, nextServiceAt: event.target.value })} /></Field>
          <Field label={t('crmPoolAccessInstructions')} full><textarea className="input-glass min-h-20 resize-y" value={service.accessInstructions} onChange={(event) => setService({ ...service, accessInstructions: event.target.value })} /></Field>
          <Field label={t('crmPoolEquipmentNotes')} full><textarea className="input-glass min-h-20 resize-y" value={service.equipmentNotes} onChange={(event) => setService({ ...service, equipmentNotes: event.target.value })} /></Field>
        </div>
        <button disabled={saving} className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{t('crmSavePool')}</button>
      </form>

      <form onSubmit={addTest} className="rounded-2xl border border-white/40 bg-white/60 p-5 dark:border-white/10 dark:bg-white/[0.04]">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold"><FlaskConical className="h-5 w-5 text-primary" />{t('crmNewWaterTest')}</h2>
        <div className="mt-4 grid grid-cols-2 gap-3"><TestField label="pH" value={test.ph} onChange={(value) => setTest({ ...test, ph: value })} /><TestField label={t('crmFreeChlorine')} value={test.freeChlorine} onChange={(value) => setTest({ ...test, freeChlorine: value })} /><TestField label="TAC" value={test.alkalinity} onChange={(value) => setTest({ ...test, alkalinity: value })} /><TestField label={t('crmTemperature')} value={test.temperature} onChange={(value) => setTest({ ...test, temperature: value })} /></div>
        <Field label={t('crmObservations')}><textarea className="input-glass mt-3 min-h-24 resize-y" value={test.notes} onChange={(event) => setTest({ ...test, notes: event.target.value })} /></Field>
        <button disabled={saving} className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{t('crmSaveWaterTest')}</button>
      </form>
    </div>

    <section className="rounded-2xl border border-white/40 bg-white/60 p-5 dark:border-white/10 dark:bg-white/[0.04]">
      <h2 className="font-display text-lg font-bold">{t('crmWaterHistory')}</h2><div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{pool.waterTests.length === 0 ? <p className="text-sm text-muted-foreground">{t('crmNoAnalysis')}</p> : pool.waterTests.map((item) => <div key={item.id} className="rounded-xl border border-border/40 bg-card/40 p-3 text-sm"><div className="flex justify-between"><strong>{new Date(item.testedAt).toLocaleDateString()}</strong><span className="text-muted-foreground">{item.temperature ?? '—'} °C</span></div><p className="mt-1 text-xs text-muted-foreground">pH {item.ph ?? '—'} · Cl {item.freeChlorine ?? '—'} · TAC {item.alkalinity ?? '—'}</p>{item.notes ? <p className="mt-2 text-xs">{item.notes}</p> : null}</div>)}</div>
    </section>

    <section className="rounded-2xl border border-white/40 bg-white/60 p-5 dark:border-white/10 dark:bg-white/[0.04]">
      <h2 className="flex items-center gap-2 font-display text-lg font-bold"><Wrench className="h-5 w-5 text-gold" />{t('crmInterventionHistory')}</h2><div className="mt-4 space-y-2">{pool.interventions.length === 0 ? <p className="text-sm text-muted-foreground">{t('crmNoIntervention')}</p> : pool.interventions.map((item) => <Link key={item.id} href={`/pro/app/interventions/${item.id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/40 p-3 text-sm hover:border-gold/40"><div><span className="font-semibold">{t(`type${cap(item.type)}` as never)}</span><p className="text-xs text-muted-foreground">{new Date(item.scheduledAt).toLocaleString()}</p></div><div className="flex items-center gap-2"><StatusBadge status={item.priority || 'normal'} label={t(`crmPriority${cap(item.priority || 'normal')}` as never)} /><Calendar className="h-3.5 w-3.5 text-muted-foreground" /></div></Link>)}</div>
    </section>
  </div>
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-secondary/50 p-3"><p className="text-[10px] uppercase text-muted-foreground">{label}</p><p className="mt-1 font-semibold">{value}</p></div> }
function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) { return <label className={full ? 'block sm:col-span-2' : 'block'}><span className="mb-1 block text-xs font-semibold">{label}</span>{children}</label> }
function TestField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="text-xs font-semibold text-muted-foreground">{label}<input type="number" step="any" value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-xl border border-border bg-background p-2 text-sm" /></label> }
function StatusBadge({ status, label }: { status: string; label: string }) { return <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${['urgent', 'inactive'].includes(status) ? 'bg-red-500/10 text-red-700 dark:text-red-300' : status === 'active' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'bg-secondary text-muted-foreground'}`}>{label}</span> }
function formatDate(value?: string | null) { return value ? new Date(value).toLocaleDateString() : '' }
function cap(value: string) { return value.split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join('') }
