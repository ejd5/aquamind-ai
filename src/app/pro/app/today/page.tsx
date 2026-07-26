'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Capacitor } from '@capacitor/core'
import { Network, type PluginListenerHandle } from '@capacitor/network'
import {
  CheckCircle2,
  Clock3,
  CloudUpload,
  Loader2,
  MapPin,
  Phone,
  Play,
  RefreshCw,
  Wifi,
  WifiOff,
  Wrench,
} from 'lucide-react'
import { api } from '@/lib/api-client'
import { useOfflineStore } from '@/lib/offline/offline-store'

type InterventionStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled'

type InterventionRow = {
  id: string
  scheduledAt: string
  type?: string
  status?: InterventionStatus
  priority?: string
  duration?: number | null
  client?: {
    id: string
    firstName?: string
    lastName?: string
    companyName?: string | null
    phone?: string | null
    city?: string | null
  }
  pool?: {
    id: string
    name?: string
    type?: string
    status?: string
  } | null
}

type InterventionsResponse = {
  interventions: InterventionRow[]
  total: number
  page: number
  pageSize: number
  summary?: { urgentOpen?: number }
}

function currentDayRange(): { from: string; to: string } {
  const from = new Date()
  from.setHours(0, 0, 0, 0)
  const to = new Date(from)
  to.setDate(to.getDate() + 1)
  to.setMilliseconds(-1)
  return { from: from.toISOString(), to: to.toISOString() }
}

function statusTranslationKey(status?: string): string {
  if (status === 'in_progress') return 'statusInProgress'
  if (status === 'completed') return 'statusCompleted'
  if (status === 'cancelled') return 'statusCancelled'
  return 'statusScheduled'
}

export default function TechnicianTodayPage() {
  const t = useTranslations('proApp')
  const [interventions, setInterventions] = useState<InterventionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const isOnline = useOfflineStore((state) => state.isOnline)
  const pendingActions = useOfflineStore((state) => state.pendingActions)
  const setOnline = useOfflineStore((state) => state.setOnline)
  const queueAction = useOfflineStore((state) => state.queueAction)
  const flushPending = useOfflineStore((state) => state.flushPending)

  const dateLabel = useMemo(
    () => new Intl.DateTimeFormat(undefined, { dateStyle: 'full' }).format(new Date()),
    [],
  )

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const range = currentDayRange()
      const params = new URLSearchParams({
        from: range.from,
        to: range.to,
        pageSize: '100',
      })
      const response = await api.get<InterventionsResponse>(
        `/api/pro/interventions?${params.toString()}`,
      )
      setInterventions(
        [...response.interventions].sort(
          (first, second) =>
            new Date(first.scheduledAt).getTime() - new Date(second.scheduledAt).getTime(),
        ),
      )
    } catch {
      setError(t('errorGeneric'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    let nativeListener: PluginListenerHandle | null = null
    let disposed = false

    const handleConnectivity = (connected: boolean) => {
      setOnline(connected)
      if (connected) {
        void flushPending().then(load)
      }
    }

    const handleOnline = () => handleConnectivity(true)
    const handleOffline = () => handleConnectivity(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    if (Capacitor.isNativePlatform()) {
      void Network.getStatus().then((status) => {
        if (!disposed) handleConnectivity(status.connected)
      })
      void Network.addListener('networkStatusChange', (status) => {
        handleConnectivity(status.connected)
      }).then((listener) => {
        if (disposed) void listener.remove()
        else nativeListener = listener
      })
    } else {
      handleConnectivity(window.navigator.onLine)
    }

    return () => {
      disposed = true
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      if (nativeListener) void nativeListener.remove()
    }
  }, [flushPending, load, setOnline])

  const applyOptimisticStatus = useCallback((id: string, status: InterventionStatus) => {
    setInterventions((current) =>
      current.map((intervention) =>
        intervention.id === id ? { ...intervention, status } : intervention,
      ),
    )
  }, [])

  async function updateStatus(intervention: InterventionRow, status: InterventionStatus) {
    const path = `/api/pro/interventions/${intervention.id}`
    const body = { status }
    setUpdatingId(intervention.id)
    setError(null)

    if (!isOnline) {
      queueAction({ method: 'PATCH', path, body })
      applyOptimisticStatus(intervention.id, status)
      setUpdatingId(null)
      return
    }

    try {
      await api.patch(path, body)
      applyOptimisticStatus(intervention.id, status)
    } catch {
      const browserOffline = typeof navigator !== 'undefined' && !navigator.onLine
      if (browserOffline) {
        setOnline(false)
        queueAction({ method: 'PATCH', path, body })
        applyOptimisticStatus(intervention.id, status)
      } else {
        setError(t('errorGeneric'))
      }
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="section-label inline-flex items-center gap-1.5">
            <Wrench className="h-3.5 w-3.5" />
            AQWELIA Pro
          </span>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">
            {t('navDashboard')}
          </h1>
          <p className="mt-1 text-sm capitalize text-muted-foreground">{dateLabel}</p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`inline-flex h-10 items-center gap-2 rounded-full border px-3 text-xs font-semibold ${
              isOnline
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                : 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'
            }`}
            aria-label={isOnline ? 'online' : 'offline'}
          >
            {isOnline ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
            {pendingActions.length > 0 ? (
              <span className="inline-flex items-center gap-1">
                <CloudUpload className="h-3.5 w-3.5" />
                {pendingActions.length}
              </span>
            ) : null}
          </span>
          <button
            type="button"
            onClick={() => {
              if (isOnline) void flushPending().then(load)
              else void load()
            }}
            disabled={loading}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-background"
            aria-label={t('retry')}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      {error ? (
        <div className="rounded-2xl border border-red-400/40 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      ) : null}

      {loading && interventions.length === 0 ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : null}

      {!loading && interventions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 bg-card/40 px-5 py-12 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
          <p className="mt-3 text-sm font-semibold">{t('interventionsEmpty')}</p>
        </div>
      ) : null}

      <div className="space-y-3">
        {interventions.map((intervention) => {
          const status = intervention.status ?? 'scheduled'
          const busy = updatingId === intervention.id
          const clientName = [intervention.client?.firstName, intervention.client?.lastName]
            .filter(Boolean)
            .join(' ')
          return (
            <article
              key={intervention.id}
              className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                      <Clock3 className="h-3.5 w-3.5" />
                      {new Date(intervention.scheduledAt).toLocaleTimeString(undefined, {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-bold">
                      {t(statusTranslationKey(status) as never)}
                    </span>
                    {intervention.priority === 'urgent' ? (
                      <span className="rounded-full bg-red-500/10 px-2.5 py-1 text-[11px] font-bold text-red-600">
                        {t('crmPriorityUrgent')}
                      </span>
                    ) : null}
                  </div>
                  <Link
                    href={`/pro/app/interventions/${intervention.id}`}
                    className="mt-2 block truncate text-lg font-bold text-foreground"
                  >
                    {clientName || intervention.client?.companyName || t('interventionsColClient')}
                  </Link>
                  <p className="mt-1 truncate text-sm text-muted-foreground">
                    {intervention.pool?.name ?? t('noPool')}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
                {intervention.client?.city ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-secondary/60 px-2.5 py-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    {intervention.client.city}
                  </span>
                ) : null}
                {intervention.client?.phone ? (
                  <a
                    href={`tel:${intervention.client.phone}`}
                    className="inline-flex items-center gap-1 rounded-full bg-secondary/60 px-2.5 py-1.5"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    {intervention.client.phone}
                  </a>
                ) : null}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                {status === 'scheduled' ? (
                  <button
                    type="button"
                    onClick={() => void updateStatus(intervention, 'in_progress')}
                    disabled={busy}
                    className="col-span-2 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 text-sm font-bold text-white disabled:opacity-50"
                  >
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                    {t('crmStartIntervention')}
                  </button>
                ) : null}
                {status === 'in_progress' ? (
                  <button
                    type="button"
                    onClick={() => void updateStatus(intervention, 'completed')}
                    disabled={busy}
                    className="col-span-2 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white disabled:opacity-50"
                  >
                    {busy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    {t('crmCompleteIntervention')}
                  </button>
                ) : null}
                <Link
                  href={`/pro/app/interventions/${intervention.id}`}
                  className="col-span-2 inline-flex min-h-12 items-center justify-center rounded-xl border border-border/70 px-4 text-sm font-bold"
                >
                  {t('crmFieldReport')}
                </Link>
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}
