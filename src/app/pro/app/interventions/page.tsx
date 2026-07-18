'use client'

/**
 * AQWELIA Pro — Interventions list page.
 *
 * Fetches /api/pro/interventions with optional filters:
 *   ?status=scheduled|in_progress|completed|cancelled
 *   ?type=maintenance|repair|opening|closing|emergency
 *
 * Renders a table with: date, client, pool, type, status, technician.
 * "New intervention" button links to the planning page (the modal is not
 * yet implemented — see P6-PRO-UI follow-up).
 */
import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import {
  Wrench,
  Plus,
  Loader2,
  RefreshCw,
  Filter,
  X,
  Sparkles,
} from 'lucide-react'
import { AddInterventionModal } from '@/components/pro/add-intervention-modal'

interface InterventionRow {
  id: string
  scheduledAt: string
  type?: string
  status?: string
  duration?: number | null
  notes?: string | null
  client?: {
    id: string
    firstName?: string
    lastName?: string
    phone?: string
    city?: string
  }
  pool?: { id: string; name?: string; type?: string } | null
  technicianId?: string | null
}

interface InterventionsResponse {
  interventions: InterventionRow[]
  total: number
  page: number
  pageSize: number
}

const STATUSES = ['scheduled', 'in_progress', 'completed', 'cancelled'] as const
const TYPES = ['maintenance', 'repair', 'opening', 'closing', 'emergency'] as const

export default function ProInterventionsPage() {
  const t = useTranslations('proApp')
  const [data, setData] = useState<InterventionsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [modalOpen, setModalOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.set('status', statusFilter)
      if (typeFilter) params.set('type', typeFilter)
      params.set('pageSize', '100')
      const res = await fetch(`/api/pro/interventions?${params.toString()}`, {
        cache: 'no-store',
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = (await res.json()) as InterventionsResponse
      setData(json)
    } catch {
      setError(t('errorGeneric'))
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [statusFilter, typeFilter, t])

  useEffect(() => {
    void load()
  }, [load])

  const interventions = data?.interventions ?? []
  const total = data?.total ?? 0
  const hasFilters = Boolean(statusFilter || typeFilter)
  const showEmpty = !loading && !error && interventions.length === 0
  const showNoResults = showEmpty && hasFilters

  function clearFilters() {
    setStatusFilter('')
    setTypeFilter('')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="section-label inline-block">
            <Wrench className="mr-1 inline h-3 w-3" />
            AQWELIA Pro
          </span>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            {t('interventionsTitle')}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('interventionsSubtitle')}
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="glow-gold inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-gold via-[oklch(0.65_0.11_195)] to-[oklch(0.55_0.10_195)] px-4 py-2 text-xs font-bold text-[oklch(0.99_0.01_195)] shadow-lg transition-all hover:scale-[1.02]"
        >
          <Plus className="h-3.5 w-3.5" />
          {t('interventionsNew')}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-white/40 bg-white/60 p-3 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04]">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Filter className="h-3.5 w-3.5" />
        </div>
        <FilterSelect
          label={t('interventionsFilterStatus')}
          value={statusFilter}
          onChange={setStatusFilter}
          options={STATUSES.map((s) => ({
            value: s,
            label: t(`status${cap(s)}` as any),
          }))}
          allLabel={t('interventionsAll')}
        />
        <FilterSelect
          label={t('interventionsFilterType')}
          value={typeFilter}
          onChange={setTypeFilter}
          options={TYPES.map((ty) => ({
            value: ty,
            label: t(`type${cap(ty)}` as any),
          }))}
          allLabel={t('interventionsAll')}
        />
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
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="ml-auto inline-flex items-center gap-1 rounded-full border border-border/40 bg-background/60 px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="h-3 w-3" />
            {t('interventionsClearFilters')}
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-2xl border border-red-400/40 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Count hint */}
      {!loading && !error && interventions.length > 0 && (
        <div className="text-xs text-muted-foreground">
          {t('interventionsCount', { count: total })}
        </div>
      )}

      {/* Table */}
      {!loading && !error && interventions.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-white/40 bg-white/60 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04]">
          <div className="custom-scroll overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-border/40 bg-secondary/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 font-semibold">{t('interventionsColDate')}</th>
                  <th className="px-4 py-3 font-semibold">{t('interventionsColClient')}</th>
                  <th className="px-4 py-3 font-semibold">{t('interventionsColPool')}</th>
                  <th className="px-4 py-3 font-semibold">{t('interventionsColType')}</th>
                  <th className="px-4 py-3 font-semibold">{t('interventionsColStatus')}</th>
                </tr>
              </thead>
              <tbody>
                {interventions.map((iv) => (
                  <tr
                    key={iv.id}
                    className="border-b border-border/30 transition-colors last:border-0 hover:bg-secondary/40"
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {formatDate(iv.scheduledAt)}
                    </td>
                    <td className="px-4 py-3">
                      {iv.client ? (
                        <Link
                          href={`/pro/app/clients/${iv.client.id}`}
                          className="font-semibold text-foreground transition-colors hover:text-gold"
                        >
                          {iv.client.firstName ?? ''} {iv.client.lastName ?? ''}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {iv.pool?.name ?? t('noPool')}
                    </td>
                    <td className="px-4 py-3">
                      <TypeBadge type={iv.type} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={iv.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty — no interventions at all */}
      {showEmpty && !showNoResults && (
        <div className="rounded-2xl border border-dashed border-border/50 bg-card/30 px-6 py-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary to-gold text-white shadow-md shadow-primary/30">
            <Sparkles className="h-5 w-5" />
          </div>
          <p className="mt-4 text-sm font-semibold text-foreground">
            {t('interventionsEmpty')}
          </p>
          <button
            onClick={() => setModalOpen(true)}
            className="mt-4 inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/5 px-4 py-2 text-xs font-semibold text-gold transition-colors hover:bg-gold/15"
          >
            <Plus className="h-3.5 w-3.5" />
            {t('interventionsNew')}
          </button>
        </div>
      )}

      {/* Empty — filters with no results */}
      {showNoResults && (
        <div className="rounded-2xl border border-dashed border-border/50 bg-card/30 px-6 py-12 text-center text-sm text-muted-foreground">
          {t('interventionsNoResults')}
        </div>
      )}

      {/* Loading state */}
      {loading && !data && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}
      <AddInterventionModal open={modalOpen} onClose={() => setModalOpen(false)} onCreated={() => { void load() }} />
    </div>
  )
}

/* -------------------- Helpers -------------------- */

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'short',
      timeStyle: 'short',
    })
  } catch {
    return iso
  }
}

function cap(s: string): string {
  return s
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
}

/* -------------------- Small building blocks -------------------- */

function FilterSelect({
  label,
  value,
  onChange,
  options,
  allLabel,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  allLabel: string
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input-glass min-w-[140px] py-1.5 text-xs"
      >
        <option value="">{allLabel}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
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
  const key = type ? `type${cap(type)}` : 'typeMaintenance'
  let label: string
  try {
    label = t(key as any)
  } catch {
    label = type ?? '—'
  }
  const cls = TYPE_COLORS[type ?? 'maintenance'] ?? TYPE_COLORS.maintenance
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${cls}`}
    >
      {label}
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
  const key = status ? `status${cap(status)}` : 'statusScheduled'
  let label: string
  try {
    label = t(key as any)
  } catch {
    label = status ?? '—'
  }
  const cls = STATUS_COLORS[status ?? 'scheduled'] ?? STATUS_COLORS.scheduled
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${cls}`}
    >
      {label}
    </span>
  )
}
