'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  ArrowLeft,
  CheckCircle2,
  CloudUpload,
  Loader2,
  Play,
  Save,
  Wifi,
  WifiOff,
} from 'lucide-react'
import { api } from '@/lib/api-client'
import { useOfflineStore } from '@/lib/offline/offline-store'

type Intervention = {
  id: string
  type: string
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
  priority: string
  scheduledAt: string
  startedAt?: string | null
  completedAt?: string | null
  duration?: number | null
  summary?: string | null
  customerNotes?: string | null
  internalNotes?: string | null
  notes?: string | null
  actions?: string | null
  productsUsed?: string | null
  client: {
    id: string
    firstName: string
    lastName: string
    companyName?: string | null
    phone?: string | null
  }
  pool?: {
    id: string
    name: string
    type: string
    accessInstructions?: string | null
  } | null
}

type InterventionResponse = { intervention: Intervention }

type CachedReport = {
  intervention: Intervention
  summary: string
  customerNotes: string
  internalNotes: string
  actions: string
  products: string
  duration: string
  cachedAt: number
}

function parseLabels(value?: string | null): string[] {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    if (!Array.isArray(parsed)) return []
    return parsed.map((item) => {
      if (typeof item === 'string') return item
      if (item && typeof item === 'object') {
        const record = item as Record<string, unknown>
        if (typeof record.label === 'string') return record.label
        if (typeof record.name === 'string') return record.name
      }
      return JSON.stringify(item)
    })
  } catch {
    return []
  }
}

function lines(value: string): string[] {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)
}

function cacheKey(id: string): string {
  return `aqwelia-pro-mobile-report-${id}`
}

function readCachedReport(id: string): CachedReport | null {
  try {
    const raw = window.localStorage.getItem(cacheKey(id))
    return raw ? (JSON.parse(raw) as CachedReport) : null
  } catch {
    return null
  }
}

function writeCachedReport(id: string, value: CachedReport) {
  try {
    window.localStorage.setItem(cacheKey(id), JSON.stringify(value))
  } catch {
    // Device storage can be unavailable; online saving remains possible.
  }
}

function MobileReportContent() {
  const params = useSearchParams()
  const id = params.get('id') ?? ''
  const t = useTranslations('proApp')
  const [intervention, setIntervention] = useState<Intervention | null>(null)
  const [summary, setSummary] = useState('')
  const [customerNotes, setCustomerNotes] = useState('')
  const [internalNotes, setInternalNotes] = useState('')
  const [actions, setActions] = useState('')
  const [products, setProducts] = useState('')
  const [duration, setDuration] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const isOnline = useOfflineStore((state) => state.isOnline)
  const pendingActions = useOfflineStore((state) => state.pendingActions)
  const setOnline = useOfflineStore((state) => state.setOnline)
  const queueAction = useOfflineStore((state) => state.queueAction)
  const flushPending = useOfflineStore((state) => state.flushPending)

  const hydrate = useCallback((value: Intervention) => {
    setIntervention(value)
    setSummary(value.summary ?? '')
    setCustomerNotes(value.customerNotes ?? value.notes ?? '')
    setInternalNotes(value.internalNotes ?? '')
    setActions(parseLabels(value.actions).join('\n'))
    setProducts(parseLabels(value.productsUsed).join('\n'))
    setDuration(value.duration != null ? String(value.duration) : '')
  }, [])

  const load = useCallback(async () => {
    if (!id) {
      setLoading(false)
      return
    }

    const cached = readCachedReport(id)
    if (cached) {
      setIntervention(cached.intervention)
      setSummary(cached.summary)
      setCustomerNotes(cached.customerNotes)
      setInternalNotes(cached.internalNotes)
      setActions(cached.actions)
      setProducts(cached.products)
      setDuration(cached.duration)
      setLoading(false)
    }

    try {
      const response = await api.get<InterventionResponse>(`/api/pro/interventions/${id}`)
      hydrate(response.intervention)
      setLoading(false)
    } catch {
      if (!cached) {
        setMessage(t('errorGeneric'))
        setLoading(false)
      }
    }
  }, [hydrate, id, t])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!id || !intervention) return
    writeCachedReport(id, {
      intervention,
      summary,
      customerNotes,
      internalNotes,
      actions,
      products,
      duration,
      cachedAt: Date.now(),
    })
  }, [actions, customerNotes, duration, id, internalNotes, intervention, products, summary])

  async function save(extra: Record<string, unknown> = {}) {
    if (!id || !intervention) return

    const path = `/api/pro/interventions/${id}`
    const body = {
      summary: summary.trim() || null,
      customerNotes: customerNotes.trim() || null,
      internalNotes: internalNotes.trim() || null,
      duration: duration ? Number(duration) : null,
      actions: lines(actions),
      productsUsed: lines(products),
      ...extra,
    }

    setSaving(true)
    setMessage('')

    const browserOffline = typeof navigator !== 'undefined' && !navigator.onLine
    if (!isOnline || browserOffline) {
      setOnline(false)
      queueAction({ method: 'PATCH', path, body })
      setIntervention((current) => current ? { ...current, ...extra } as Intervention : current)
      setMessage(t('crmReportSaved'))
      setSaving(false)
      return
    }

    try {
      await api.patch(path, body)
      setMessage(t('crmReportSaved'))
      await flushPending()
      await load()
    } catch {
      const nowOffline = typeof navigator !== 'undefined' && !navigator.onLine
      if (nowOffline) {
        setOnline(false)
        queueAction({ method: 'PATCH', path, body })
        setIntervention((current) => current ? { ...current, ...extra } as Intervention : current)
        setMessage(t('crmReportSaved'))
      } else {
        setMessage(t('errorGeneric'))
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-7 w-7 animate-spin" /></div>
  }

  if (!id || !intervention) {
    return (
      <div className="space-y-4">
        <Link href="/pro/app/today" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold">
          <ArrowLeft className="h-4 w-4" />
          {t('crmBackInterventions')}
        </Link>
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {message || t('crmInterventionNotFound')}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href="/pro/app/today" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-muted-foreground">
            <ArrowLeft className="h-4 w-4" />
            {t('crmBackInterventions')}
          </Link>
          <h1 className="truncate font-display text-2xl font-bold">
            {intervention.client.firstName} {intervention.client.lastName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {intervention.pool?.name ?? intervention.client.companyName ?? t('noPool')}
          </p>
        </div>
        <span
          className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-full border px-3 text-xs font-semibold ${
            isOnline
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
              : 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'
          }`}
        >
          {isOnline ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
          {pendingActions.length > 0 ? <><CloudUpload className="h-3.5 w-3.5" />{pendingActions.length}</> : null}
        </span>
      </header>

      {intervention.pool?.accessInstructions ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
          <strong>{t('crmPoolAccessInstructions')}:</strong> {intervention.pool.accessInstructions}
        </div>
      ) : null}

      {message ? (
        <div className="rounded-2xl border border-primary/30 bg-primary/10 p-3 text-sm">{message}</div>
      ) : null}

      <section className="space-y-4 rounded-3xl border border-border/60 bg-card p-5 shadow-sm">
        <h2 className="font-display text-xl font-bold">{t('crmFieldReport')}</h2>

        <Field label={t('crmInterventionSummary')}>
          <input className="input-glass min-h-12 w-full" value={summary} onChange={(event) => setSummary(event.target.value)} />
        </Field>
        <Field label={t('crmCustomerNotes')}>
          <textarea className="input-glass min-h-28 w-full resize-y" value={customerNotes} onChange={(event) => setCustomerNotes(event.target.value)} />
        </Field>
        <Field label={t('crmInternalNotes')}>
          <textarea className="input-glass min-h-28 w-full resize-y" value={internalNotes} onChange={(event) => setInternalNotes(event.target.value)} />
        </Field>
        <Field label={t('crmFieldActions')}>
          <textarea className="input-glass min-h-28 w-full resize-y" value={actions} onChange={(event) => setActions(event.target.value)} />
        </Field>
        <Field label={t('crmFieldProducts')}>
          <textarea className="input-glass min-h-24 w-full resize-y" value={products} onChange={(event) => setProducts(event.target.value)} />
        </Field>
        <Field label={t('interventionDuration')}>
          <input
            className="input-glass min-h-12 w-full"
            type="number"
            min="0"
            inputMode="numeric"
            value={duration}
            onChange={(event) => setDuration(event.target.value)}
          />
        </Field>

        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {t('crmSaveReport')}
        </button>

        {intervention.status === 'scheduled' ? (
          <button
            type="button"
            onClick={() => void save({ status: 'in_progress' })}
            disabled={saving}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-amber-500 px-5 text-sm font-bold text-white disabled:opacity-60"
          >
            <Play className="h-4 w-4" />
            {t('crmStartIntervention')}
          </button>
        ) : null}

        {!['completed', 'cancelled'].includes(intervention.status) ? (
          <button
            type="button"
            onClick={() => void save({ status: 'completed' })}
            disabled={saving}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 text-sm font-bold text-white disabled:opacity-60"
          >
            <CheckCircle2 className="h-4 w-4" />
            {t('crmCompleteIntervention')}
          </button>
        ) : null}
      </section>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs font-semibold">
      <span className="mb-1.5 block text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}

export default function MobileReportPage() {
  return (
    <main className="safe-area-top min-h-screen px-4 py-5 pb-10">
      <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="h-7 w-7 animate-spin" /></div>}>
        <MobileReportContent />
      </Suspense>
    </main>
  )
}
