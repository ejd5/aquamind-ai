'use client'

/**
 * AQWELIA Pro — Planning page (week view).
 *
 * Fetches /api/pro/interventions?from=...&to=... for the current week
 * (Mon → Sun). Renders a 7-column grid where each cell shows the day's
 * interventions, color-coded by type. Prev/Next buttons navigate weeks.
 *
 * Day labels are formatted with Intl.DateTimeFormat so no extra i18n
 * keys are needed.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
  Plus,
  Sparkles,
} from 'lucide-react'

interface InterventionLite {
  id: string
  scheduledAt: string
  type?: string
  status?: string
  client?: { id: string; firstName?: string; lastName?: string; phone?: string; city?: string }
  pool?: { id: string; name?: string; type?: string } | null
  technicianId?: string | null
}

interface InterventionsResponse {
  interventions: InterventionLite[]
  total: number
  page: number
  pageSize: number
}

const TYPE_COLORS: Record<string, string> = {
  maintenance: 'border-l-primary bg-primary/5 text-primary',
  repair: 'border-l-amber-500 bg-amber-500/5 text-amber-700 dark:text-amber-300',
  opening: 'border-l-emerald-500 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300',
  closing: 'border-l-orange-500 bg-orange-500/5 text-orange-700 dark:text-orange-300',
  emergency: 'border-l-red-500 bg-red-500/5 text-red-700 dark:text-red-300',
}

/** Returns the Monday (00:00) of the week containing `date`. */
function startOfWeek(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  const diffToMonday = (day + 6) % 7 // Mon=0, Tue=1, …, Sun=6
  d.setDate(d.getDate() - diffToMonday)
  return d
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export default function ProPlanningPage() {
  const t = useTranslations('proApp')
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date()))
  const [interventions, setInterventions] = useState<InterventionLite[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const weekEnd = useMemo(() => addDays(weekStart, 7), [weekStart])
  const today = new Date()

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      params.set('from', toISODate(weekStart))
      // `to` is exclusive in our range query; use day 6 (Sun) end-of-day.
      params.set('to', toISODate(addDays(weekStart, 6)))
      params.set('pageSize', '100')
      const res = await fetch(`/api/pro/interventions?${params.toString()}`, {
        cache: 'no-store',
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = (await res.json()) as InterventionsResponse
      setInterventions(json.interventions ?? [])
    } catch {
      setError(t('errorGeneric'))
      setInterventions([])
    } finally {
      setLoading(false)
    }
  }, [weekStart, t])

  useEffect(() => {
    void load()
  }, [load])

  // Group interventions by day (0..6 = Mon..Sun).
  const byDay = useMemo(() => {
    const buckets: InterventionLite[][] = Array.from({ length: 7 }, () => [])
    for (const iv of interventions) {
      try {
        const d = new Date(iv.scheduledAt)
        const diff = Math.round(
          (d.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24)
        )
        if (diff >= 0 && diff < 7) {
          buckets[diff].push(iv)
        }
      } catch {
        // skip invalid dates
      }
    }
    // Sort each day by scheduledAt.
    for (const b of buckets) {
      b.sort((a, b2) => a.scheduledAt.localeCompare(b2.scheduledAt))
    }
    return buckets
  }, [interventions, weekStart])

  const weekLabel = useMemo(() => {
    try {
      return new Intl.DateTimeFormat(undefined, {
        dateStyle: 'long',
      }).format(weekStart)
    } catch {
      return toISODate(weekStart)
    }
  }, [weekStart])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="section-label inline-block">
            <Calendar className="mr-1 inline h-3 w-3" />
            AQWELIA Pro
          </span>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            {t('planningTitle')}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('planningSubtitle')}
          </p>
        </div>
        <Link
          href="/pro/app/interventions"
          className="glow-gold inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-gold via-[oklch(0.65_0.11_195)] to-[oklch(0.55_0.10_195)] px-4 py-2 text-xs font-bold text-[oklch(0.99_0.01_195)] shadow-lg transition-all hover:scale-[1.02]"
        >
          <Plus className="h-3.5 w-3.5" />
          {t('planningNew')}
        </Link>
      </div>

      {/* Week navigation */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/40 bg-white/60 p-3 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04]">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeekStart((d) => addDays(d, -7))}
            className="inline-flex items-center gap-1 rounded-full border border-border/40 bg-background/60 px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-gold/60 hover:text-gold"
            aria-label={t('planningPrev')}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t('planningPrev')}</span>
          </button>
          <button
            onClick={() => setWeekStart(startOfWeek(new Date()))}
            className="inline-flex items-center rounded-full border border-gold/40 bg-gold/5 px-3 py-1.5 text-xs font-semibold text-gold transition-colors hover:bg-gold/15"
          >
            {t('planningToday')}
          </button>
          <button
            onClick={() => setWeekStart((d) => addDays(d, 7))}
            className="inline-flex items-center gap-1 rounded-full border border-border/40 bg-background/60 px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-gold/60 hover:text-gold"
            aria-label={t('planningNext')}
          >
            <span className="hidden sm:inline">{t('planningNext')}</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-foreground">
            {t('planningWeekOf', { date: weekLabel })}
          </span>
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
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-2xl border border-red-400/40 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Week grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7">
        {byDay.map((dayInterventions, idx) => {
          const date = addDays(weekStart, idx)
          const isToday = isSameDay(date, today)
          return (
            <div
              key={idx}
              className={`flex min-h-[160px] flex-col rounded-2xl border p-3 backdrop-blur-xl ${
                isToday
                  ? 'border-gold/60 bg-gold/5'
                  : 'border-white/40 bg-white/60 dark:border-white/10 dark:bg-white/[0.04]'
              }`}
            >
              <div className="mb-2 flex items-center justify-between border-b border-border/40 pb-2">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {formatDayName(date)}
                  </div>
                  <div className="font-display text-base font-bold">
                    {date.getDate()}
                  </div>
                </div>
                {isToday && (
                  <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-gold">
                    {t('planningTodayBadge')}
                  </span>
                )}
              </div>
              <div className="flex-1 space-y-1.5">
                {loading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                  </div>
                ) : dayInterventions.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border/30 py-4 text-center text-[10px] text-muted-foreground">
                    —
                  </div>
                ) : (
                  dayInterventions.map((iv) => (
                    <InterventionChip key={iv.id} iv={iv} />
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Empty hint */}
      {!loading && !error && interventions.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border/50 bg-card/30 px-6 py-10 text-center">
          <Sparkles className="mx-auto h-5 w-5 text-gold" />
          <p className="mt-3 text-sm font-semibold text-foreground">
            {t('planningEmpty')}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t('planningClickHint')}
          </p>
        </div>
      )}
    </div>
  )
}

/* -------------------- Small building blocks -------------------- */

function InterventionChip({ iv }: { iv: InterventionLite }) {
  const t = useTranslations('proApp')
  const typeKey = `type${cap(iv.type ?? 'maintenance')}`
  let typeLabel: string
  try {
    typeLabel = t(typeKey as any)
  } catch {
    typeLabel = iv.type ?? '—'
  }
  const time = (() => {
    try {
      return new Date(iv.scheduledAt).toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return ''
    }
  })()
  const clientName = (() => {
    const c = iv.client
    if (!c) return '—'
    const full = `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim()
    return full || '—'
  })()
  const cls = TYPE_COLORS[iv.type ?? 'maintenance'] ?? TYPE_COLORS.maintenance
  return (
    <div
      className={`rounded-lg border-l-2 px-2 py-1.5 text-[10px] leading-tight ${cls}`}
      title={`${typeLabel} · ${clientName} · ${iv.pool?.name ?? t('noPool')}`}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="font-bold">{time}</span>
        <span className="uppercase tracking-wide opacity-80">{typeLabel}</span>
      </div>
      <p className="truncate font-semibold">{clientName}</p>
      <p className="truncate opacity-80">{iv.pool?.name ?? t('noPool')}</p>
    </div>
  )
}

function formatDayName(date: Date): string {
  try {
    return new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(date)
  } catch {
    return ''
  }
}

function cap(s: string): string {
  return s
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
}
