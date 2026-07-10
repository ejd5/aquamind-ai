'use client'

/**
 * AQWELIA Growth OS — Lead inbox page.
 *
 * Fetches /api/growth/leads (with optional `q` + `status` filters) and
 * renders a glassmorphism table with: name, source, status badge, score,
 * urgency, and a "View" link to the detail page.
 */
import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import {
  Inbox,
  Plus,
  Search,
  Loader2,
  RefreshCw,
  ChevronRight,
  Sparkles,
} from 'lucide-react'

interface LeadRow {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string | null
  city?: string | null
  source: string
  serviceType?: string | null
  urgency: string
  status: string
  score: number
  createdAt: string
  _count?: { events?: number; appointments?: number; quotes?: number }
}

interface LeadsResponse {
  leads: LeadRow[]
  total: number
  page: number
  pageSize: number
}

const STATUS_COLORS: Record<string, string> = {
  NEW: 'bg-secondary text-muted-foreground',
  QUALIFIED: 'bg-blue-500/15 text-blue-700 dark:text-blue-300',
  SCORED: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300',
  ASSIGNED: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300',
  CONTACTED: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  APPOINTMENT: 'bg-orange-500/15 text-orange-700 dark:text-orange-300',
  QUOTED: 'bg-violet-500/15 text-violet-700 dark:text-violet-300',
  WON: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  LOST: 'bg-red-500/15 text-red-700 dark:text-red-300',
}

const STATUS_OPTIONS = [
  'NEW',
  'QUALIFIED',
  'SCORED',
  'ASSIGNED',
  'CONTACTED',
  'APPOINTMENT',
  'QUOTED',
  'WON',
  'LOST',
]

export default function GrowthLeadsPage() {
  const t = useTranslations('growthApp')
  const [data, setData] = useState<LeadsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(handle)
  }, [search])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (debouncedSearch.trim()) params.set('q', debouncedSearch.trim())
      if (statusFilter) params.set('status', statusFilter)
      params.set('pageSize', '50')
      const url = `/api/growth/leads${params.size ? `?${params.toString()}` : ''}`
      const res = await fetch(url, { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = (await res.json()) as LeadsResponse
      setData(json)
    } catch {
      setError(t('errorGeneric'))
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, statusFilter, t])

  useEffect(() => {
    void load()
  }, [load])

  const leads = data?.leads ?? []
  const total = data?.total ?? 0
  const showEmpty = !loading && !error && leads.length === 0
  const showNoResults = showEmpty && (debouncedSearch.trim().length > 0 || statusFilter !== '')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="section-label inline-block">
            <Inbox className="mr-1 inline h-3 w-3" />
            AQWELIA Growth OS
          </span>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            {t('leadsTitle')}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('leadsSubtitle')}
          </p>
        </div>
        <Link
          href="/growth/app/leads/new"
          className="glow-gold inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-gold via-[oklch(0.65_0.11_195)] to-[oklch(0.55_0.10_195)] px-4 py-2 text-xs font-bold text-[oklch(0.99_0.01_195)] shadow-lg transition-all hover:scale-[1.02]"
        >
          <Plus className="h-3.5 w-3.5" />
          {t('leadsAdd')}
        </Link>
      </div>

      {/* Search + filter + refresh */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('leadsSearchPlaceholder')}
            className="input-glass w-full pl-9"
            aria-label={t('leadsSearchPlaceholder')}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input-glass max-w-[200px]"
          aria-label={t('leadsFilterStatus')}
        >
          <option value="">{t('leadsFilterAll')}</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
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

      {/* Error */}
      {error && (
        <div className="rounded-2xl border border-red-400/40 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Count hint */}
      {!loading && !error && leads.length > 0 && (
        <div className="text-xs text-muted-foreground">
          {t('leadsCount', { count: total })}
        </div>
      )}

      {/* Table */}
      {!loading && !error && leads.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-white/40 bg-white/60 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04]">
          <div className="custom-scroll overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-border/40 bg-secondary/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 font-semibold">{t('colName')}</th>
                  <th className="px-4 py-3 font-semibold">{t('colSource')}</th>
                  <th className="px-4 py-3 font-semibold">{t('colService')}</th>
                  <th className="px-4 py-3 font-semibold">{t('colStatus')}</th>
                  <th className="px-4 py-3 text-center font-semibold">{t('colScore')}</th>
                  <th className="px-4 py-3 font-semibold">{t('colUrgency')}</th>
                  <th className="px-4 py-3 text-right font-semibold">{t('colActions')}</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => {
                  const cls = STATUS_COLORS[lead.status] ?? STATUS_COLORS.NEW
                  return (
                    <tr
                      key={lead.id}
                      className="border-b border-border/30 transition-colors last:border-0 hover:bg-secondary/40"
                    >
                      <td className="px-4 py-3">
                        <div className="font-semibold text-foreground">
                          {lead.firstName} {lead.lastName}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {lead.email}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-foreground">
                          {lead.source}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {lead.serviceType ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${cls}`}
                        >
                          {lead.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex min-w-[2rem] items-center justify-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                          {lead.score}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {lead.urgency}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/growth/app/leads/${lead.id}`}
                          className="inline-flex items-center gap-1 rounded-full border border-gold/40 bg-gold/5 px-2.5 py-1 text-[11px] font-semibold text-gold transition-colors hover:bg-gold/15"
                        >
                          {t('viewLead')}
                          <ChevronRight className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty states */}
      {showEmpty && !showNoResults && (
        <div className="rounded-2xl border border-dashed border-border/50 bg-card/30 px-6 py-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary to-gold text-white shadow-md shadow-primary/30">
            <Sparkles className="h-5 w-5" />
          </div>
          <p className="mt-4 text-sm font-semibold text-foreground">
            {t('leadsEmpty')}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t('leadsEmptyHint')}
          </p>
        </div>
      )}
      {showNoResults && (
        <div className="rounded-2xl border border-dashed border-border/50 bg-card/30 px-6 py-12 text-center text-sm text-muted-foreground">
          {t('leadsNoResults')}
        </div>
      )}
      {loading && !data && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  )
}
