'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { AlertCircle, Check, Loader2, Sparkles, Waves, X } from 'lucide-react'

const POOL_TYPES = ['pool', 'spa', 'both'] as const
const POOL_STATUSES = ['active', 'seasonal', 'inactive'] as const
const SHAPES = ['rectangular', 'round', 'oval', 'free']
const SURFACES = ['liner', 'shell', 'concrete', 'tile']
const TREATMENTS = ['chlorine', 'salt', 'bromine', 'active_oxygen', 'other']
const FILTERS = ['sand', 'cartridge', 'glass', 'diatom']

type Props = {
  open: boolean
  clientId: string
  onClose: () => void
  onCreated?: (pool: CreatedPool) => void
}

export type CreatedPool = {
  id: string
  name: string
  type: string
  status?: string
  volume?: number | null
  brand?: string | null
  model?: string | null
  nextServiceAt?: string | null
}

type FormState = {
  name: string
  type: (typeof POOL_TYPES)[number]
  status: (typeof POOL_STATUSES)[number]
  volume: string
  shape: string
  surface: string
  treatmentType: string
  filterType: string
  saltSystem: boolean
  brand: string
  model: string
  serialNumber: string
  installedAt: string
  accessInstructions: string
  equipmentNotes: string
  lastServiceAt: string
  nextServiceAt: string
  notes: string
}

const EMPTY: FormState = {
  name: '', type: 'pool', status: 'active', volume: '', shape: 'rectangular',
  surface: 'liner', treatmentType: 'chlorine', filterType: 'sand', saltSystem: false,
  brand: '', model: '', serialNumber: '', installedAt: '', accessInstructions: '',
  equipmentNotes: '', lastServiceAt: '', nextServiceAt: '', notes: '',
}

function dateToIso(value: string) {
  return value ? new Date(`${value}T09:00:00`).toISOString() : undefined
}

export function AddPoolModal({ open, clientId, onClose, onCreated }: Props) {
  const t = useTranslations('proApp')
  const [form, setForm] = useState<FormState>(EMPTY)
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success'>('idle')
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((previous) => ({ ...previous, [key]: value }))
  }
  function close() {
    if (status === 'submitting') return
    setForm(EMPTY); setStatus('idle'); setError(null); onClose()
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!form.name.trim() || status === 'submitting') {
      if (!form.name.trim()) setError(t('addPoolErrorName'))
      return
    }
    setStatus('submitting'); setError(null)
    try {
      const response = await fetch('/api/pro/pools', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proClientId: clientId,
          name: form.name.trim(), type: form.type, status: form.status,
          volume: form.volume ? Number(form.volume) : undefined,
          shape: form.shape, surface: form.surface, treatmentType: form.treatmentType,
          filterType: form.filterType, saltSystem: form.saltSystem,
          brand: form.brand.trim() || undefined, model: form.model.trim() || undefined,
          serialNumber: form.serialNumber.trim() || undefined,
          installedAt: dateToIso(form.installedAt),
          accessInstructions: form.accessInstructions.trim() || undefined,
          equipmentNotes: form.equipmentNotes.trim() || undefined,
          lastServiceAt: dateToIso(form.lastServiceAt),
          nextServiceAt: dateToIso(form.nextServiceAt),
          notes: form.notes.trim() || undefined,
        }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok || !data?.pool) { setStatus('idle'); setError(data?.error ?? t('addPoolErrorGeneric')); return }
      setStatus('success'); onCreated?.(data.pool as CreatedPool)
      window.setTimeout(close, 900)
    } catch { setStatus('idle'); setError(t('addPoolErrorGeneric')) }
  }

  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 backdrop-blur-sm sm:items-center sm:p-4" onClick={close} role="dialog" aria-modal="true" aria-label={t('addPoolTitle')}>
    <div className="relative max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border border-white/40 bg-background/95 p-6 shadow-2xl backdrop-blur-2xl sm:rounded-3xl sm:p-8" onClick={(event) => event.stopPropagation()}>
      <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent" />
      <div className="mb-5 flex items-start justify-between gap-3"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-gold text-white"><Waves className="h-5 w-5" /></div><div><h2 className="font-display text-lg font-bold">{t('addPoolTitle')}</h2><p className="text-xs text-muted-foreground">{t('addPoolSubtitle')}</p></div></div><button type="button" onClick={close} className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary" aria-label={t('modalClose')}><X className="h-4 w-4" /></button></div>
      {status === 'success' ? <div className="rounded-2xl border border-gold/40 bg-gold/5 p-8 text-center"><Check className="mx-auto h-10 w-10 text-gold" /><p className="mt-3 text-sm font-semibold">{t('addPoolSuccess')}</p></div> :
      <form onSubmit={submit} className="space-y-5">
        <section className="grid gap-4 sm:grid-cols-2">
          <Field label={t('addPoolName')} full><input className="input-glass" value={form.name} onChange={(event) => update('name', event.target.value)} required /></Field>
          <Field label={t('addPoolType')}><select className="input-glass" value={form.type} onChange={(event) => update('type', event.target.value as FormState['type'])}>{POOL_TYPES.map((value) => <option key={value} value={value}>{t(`poolType${cap(value)}` as never)}</option>)}</select></Field>
          <Field label={t('crmPoolStatus')}><select className="input-glass" value={form.status} onChange={(event) => update('status', event.target.value as FormState['status'])}>{POOL_STATUSES.map((value) => <option key={value} value={value}>{t(`crmPoolStatus${cap(value)}` as never)}</option>)}</select></Field>
          <Field label={t('addPoolVolume')}><input className="input-glass" type="number" min="0" step="0.1" value={form.volume} onChange={(event) => update('volume', event.target.value)} /></Field>
          <Field label={t('addPoolShape')}><select className="input-glass" value={form.shape} onChange={(event) => update('shape', event.target.value)}>{SHAPES.map((value) => <option key={value} value={value}>{t(`shape${cap(value)}` as never)}</option>)}</select></Field>
          <Field label={t('addPoolSurface')}><select className="input-glass" value={form.surface} onChange={(event) => update('surface', event.target.value)}>{SURFACES.map((value) => <option key={value} value={value}>{t(`surface${cap(value)}` as never)}</option>)}</select></Field>
          <Field label={t('addPoolTreatment')}><select className="input-glass" value={form.treatmentType} onChange={(event) => update('treatmentType', event.target.value)}>{TREATMENTS.map((value) => <option key={value} value={value}>{t(`treatment${cap(value)}` as never)}</option>)}</select></Field>
          <Field label={t('addPoolFilter')}><select className="input-glass" value={form.filterType} onChange={(event) => update('filterType', event.target.value)}>{FILTERS.map((value) => <option key={value} value={value}>{t(`filter${cap(value)}` as never)}</option>)}</select></Field>
          <label className="flex items-center gap-2 sm:col-span-2"><input type="checkbox" checked={form.saltSystem} onChange={(event) => update('saltSystem', event.target.checked)} /><span className="text-xs font-semibold">{t('treatmentSalt')}</span></label>
        </section>
        <section className="grid gap-4 rounded-2xl border border-border/40 bg-secondary/20 p-4 sm:grid-cols-2">
          <Field label={t('crmPoolBrand')}><input className="input-glass" value={form.brand} onChange={(event) => update('brand', event.target.value)} /></Field>
          <Field label={t('crmPoolModel')}><input className="input-glass" value={form.model} onChange={(event) => update('model', event.target.value)} /></Field>
          <Field label={t('crmPoolSerial')}><input className="input-glass" value={form.serialNumber} onChange={(event) => update('serialNumber', event.target.value)} /></Field>
          <Field label={t('crmPoolInstalledAt')}><input className="input-glass" type="date" value={form.installedAt} onChange={(event) => update('installedAt', event.target.value)} /></Field>
          <Field label={t('crmLastService')}><input className="input-glass" type="date" value={form.lastServiceAt} onChange={(event) => update('lastServiceAt', event.target.value)} /></Field>
          <Field label={t('crmNextService')}><input className="input-glass" type="date" value={form.nextServiceAt} onChange={(event) => update('nextServiceAt', event.target.value)} /></Field>
          <Field label={t('crmPoolAccessInstructions')} full><textarea className="input-glass min-h-20 resize-y" value={form.accessInstructions} onChange={(event) => update('accessInstructions', event.target.value)} /></Field>
          <Field label={t('crmPoolEquipmentNotes')} full><textarea className="input-glass min-h-20 resize-y" value={form.equipmentNotes} onChange={(event) => update('equipmentNotes', event.target.value)} /></Field>
          <Field label={t('addClientNotes')} full><textarea className="input-glass min-h-20 resize-y" value={form.notes} onChange={(event) => update('notes', event.target.value)} /></Field>
        </section>
        {error ? <p className="flex gap-2 rounded-xl border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300"><AlertCircle className="h-4 w-4 shrink-0" />{error}</p> : null}
        <div className="flex justify-end gap-2"><button type="button" onClick={close} className="rounded-full border border-border px-4 py-2 text-xs font-semibold">{t('modalCancel')}</button><button disabled={status === 'submitting'} className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-gold to-primary px-5 py-2 text-xs font-bold text-white disabled:opacity-50">{status === 'submitting' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}{t('addPoolSubmit')}</button></div>
      </form>}
    </div>
  </div>
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) { return <label className={full ? 'block sm:col-span-2' : 'block'}><span className="mb-1.5 block text-xs font-semibold">{label}</span>{children}</label> }
function cap(value: string) { return value.split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join('') }
