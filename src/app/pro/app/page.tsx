'use client'

/**
 * AQWELIA Pro — Dashboard page (client component).
 *
 * Fetches /api/pro/dashboard and renders:
 *  - 4 stats cards: clients, pools, interventions this week, upcoming
 *  - Today's interventions list (filtered client-side from recentInterventions)
 *  - Alerts panel (pools without a recent water test)
 *
 * API contract (as of P6-PRO-API):
 *   {
 *     clientsCount, poolsCount, interventionsCount, waterTestsCount,
 *     interventionsThisWeek: { count, completedCount, totalDurationMinutes },
 *     interventionsUpcoming: InterventionLite[],
 *     interventionsOverdueCount,
 *     recentInterventions: InterventionLite[],
 *     recentWaterTests, poolsWithoutRecentTest: { id, name }[],
 *     weekStart, weekEnd, generatedAt
 *   }
 *
 * The component is intentionally lenient: any missing field renders an empty
 * state rather than crashing.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import {
  Users,
  Waves,
  Wrench,
  CalendarClock,
  AlertTriangle,
  ArrowRight,
  Loader2,
  RefreshCw,
  Sparkles,
} from 'lucide-react'

interface InterventionLite {
  id: string
  scheduledAt: string
  type?: string
  status?: string
  duration?: number | null
  client?: { id: string; firstName?: string; lastName?: string; city?: string }
  pool?: { id: string; name?: string; type?: string } | null
  technicianId?: string | null
}

interface DashboardData {
  clientsCount?: number
  poolsCount?: number
  interventionsCount?: number
  waterTestsCount?: number
  interventionsThisWeek?: { count?: number; completedCount?: number; totalDurationMinutes?: number }
  interventionsUpcoming?: InterventionLite[]
  interventionsOverdueCount?: number
  recentInterventions?: InterventionLite[]
  poolsWithoutRecentTest?: { id: string; name?: string }[]
  weekStart?: string
  weekEnd?: string
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export default function ProDashboardPage() {
  const t = useTranslations('proApp')
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/pro/dashboard', { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = (await res.json()) as DashboardData
      setData(json)
    } catch {
      setError(t('errorGeneric'))
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void load()
  }, [load])

  const today = useMemo<InterventionLite[]>(() => {
    const now = new Date()
    return (data?.recentInterventions ?? []).filter((iv) => {
      try {
        return isSameDay(new Date(iv.scheduledAt), now)
      } catch {
        return false
      }
    })
  }, [data?.recentInterventions])

  const upcoming = data?.interventionsUpcoming ?? []
  const alerts = data?.poolsWithoutRecentTest ?? []

  const stats = {
    clients: data?.clientsCount,
    pools: data?.poolsCount,
    thisWeek: data?.interventionsThisWeek?.count,
    upcoming: upcoming.length,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="section-label inline-block">
            <Sparkles className="mr-1 inline h-3 w-3" />
            AQWELIA Pro
          </span>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            {t('dashboardTitle')}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('dashboardSubtitle')}
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-white/60 px-3 py-1.5 text-xs font-semibold text-foreground backdrop-blur transition-colors hover:border-gold/60 hover:text-gold disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.04]"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          {t('retry')}
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={<Users className="h-4 w-4" />}
          label={t('statClients')}
          hint={t('statClientsHint')}
          value={stats.clients}
          loading={loading}
        />
        <StatCard
          icon={<Waves className="h-4 w-4" />}
          label={t('statPools')}
          hint={t('statPoolsHint')}
          value={stats.pools}
          loading={loading}
        />
        <StatCard
          icon={<Wrench className="h-4 w-4" />}
          label={t('statThisWeek')}
          hint={t('statThisWeekHint')}
          value={stats.thisWeek}
          loading={loading}
        />
        <StatCard
          icon={<CalendarClock className="h-4 w-4" />}
          label={t('statUpcoming')}
          hint={t('statUpcomingHint')}
          value={stats.upcoming}
          loading={loading}
        />
      </div>

      {error && (
        <div className="rounded-2xl border border-red-400/40 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Today's interventions */}
        <section className="rounded-2xl border border-white/40 bg-white/60 p-5 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04] lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">
              {t('todayInterventions')}
            </h2>
            <Link
              href="/pro/app/interventions"
              className="inline-flex items-center gap-1 text-xs font-medium text-gold hover:underline"
            >
              {t('viewAll')}
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {loading ? (
            <LoadingRow />
          ) : today.length === 0 ? (
            <EmptyRow text={t('todayEmpty')} />
          ) : (
            <ul className="space-y-2">
              {today.map((iv) => (
                <li
                  key={iv.id}
                  className="flex items-center gap-3 rounded-xl border border-border/40 bg-card/40 p-3"
                >
                  <TypeBadge type={iv.type} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {clientName(iv)}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {iv.pool?.name ?? t('noPool')} · {formatTime(iv.scheduledAt)}
                    </p>
                  </div>
                  <StatusBadge status={iv.status} />
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Alerts */}
        <section className="rounded-2xl border border-white/40 bg-white/60 p-5 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04]">
          <div className="mb-4 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <h2 className="font-display text-lg font-bold">{t('alerts')}</h2>
          </div>
          {loading ? (
            <LoadingRow />
          ) : alerts.length === 0 ? (
            <EmptyRow text={t('alertsEmpty')} />
          ) : (
            <ul className="space-y-2">
              {alerts.map((a) => (
                <li
                  key={a.id}
                  className="rounded-xl border border-amber-400/30 bg-amber-500/5 p-3"
                >
                  <p className="text-sm font-semibold">{a.name ?? t('alertPool')}</p>
                  <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                    {t('alertReason')}: {t('alertNoRecentTest')}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}

/* -------------------- Helpers -------------------- */

function clientName(iv: InterventionLite): string {
  const c = iv.client
  if (!c) return '—'
  const first = c.firstName ?? ''
  const last = c.lastName ?? ''
  const full = `${first} ${last}`.trim()
  return full || '—'
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

/* -------------------- Small building blocks -------------------- */

function StatCard({
  icon,
  label,
  hint,
  value,
  loading,
}: {
  icon: React.ReactNode
  label: string
  hint: string
  value?: number
  loading?: boolean
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/40 bg-white/60 p-4 backdrop-blur-md transition-all hover:-translate-y-0.5 hover:shadow-lg dark:border-white/10 dark:bg-white/[0.04]">
      <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent opacity-60" />
      <div className="flex items-center justify-between">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-gold text-white shadow-md shadow-primary/20">
          {icon}
        </div>
      </div>
      <div className="mt-3 font-display text-2xl font-bold tracking-tight sm:text-3xl">
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : (
          (value ?? 0).toLocaleString()
        )}
      </div>
      <div className="mt-0.5 text-xs font-semibold text-foreground">{label}</div>
      <div className="text-[10px] text-muted-foreground">{hint}</div>
    </div>
  )
}

function LoadingRow() {
  return (
    <div className="flex items-center justify-center py-8">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  )
}

function EmptyRow({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border/50 bg-card/30 py-8 text-center text-xs text-muted-foreground">
      {text}
    </div>
  )
}

const TYPE_COLORS: Record<string, string> = {
  maintenance: 'bg-primary/15 text-primary',
  repair: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  opening: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  closing: 'bg-orange-500/15 text-orange-700 dark:text-orange-300',
  emergency: 'bg-red-500/15 text-red-700 dark:text-red-300',
}

function TypeBadge({ type }: { type?: string }) {
  const t = useTranslations('proApp')
  const key = type ? `type${capitalize(type)}` : 'typeMaintenance'
  let label: string
  try {
    label = t(key as any)
  } catch {
    label = type ?? '—'
  }
  const cls = TYPE_COLORS[type ?? 'maintenance'] ?? TYPE_COLORS.maintenance
  return (
    <span
      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-[10px] font-bold uppercase ${cls}`}
    >
      {label.charAt(0)}
    </span>
  )
}

const STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-secondary text-muted-foreground',
  in_progress: 'bg-blue-500/15 text-blue-700 dark:text-blue-300',
  completed: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  cancelled: 'bg-red-500/15 text-red-700 dark:text-red-300',
}

function StatusBadge({ status }: { status?: string }) {
  const t = useTranslations('proApp')
  const key = status ? `status${capitalize(status)}` : 'statusScheduled'
  let label: string
  try {
    label = t(key as any)
  } catch {
    label = status ?? '—'
  }
  const cls = STATUS_COLORS[status ?? 'scheduled'] ?? STATUS_COLORS.scheduled
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${cls}`}
    >
      {label}
    </span>
  )
}

function capitalize(s: string): string {
  // in_progress → InProgress, otherwise Capitalize first letter.
  return s
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
}
