'use client'

/**
 * AQWELIA Growth OS — Dashboard page.
 *
 * Fetches /api/growth/dashboard and renders:
 *  - 4 stat cards: leads, conversion rate, appointments upcoming, revenue
 *  - Pipeline section (leads by status, last 7 days)
 *  - Agents activity (by type, success rate, last 30 days)
 *  - Recent leads table (5 most recent)
 */
import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import {
  Inbox,
  TrendingUp,
  Calendar,
  Coins,
  Loader2,
  RefreshCw,
  Sparkles,
  ArrowRight,
  Bot,
} from 'lucide-react'

interface DashboardData {
  organization: {
    id: string
    name: string
    plan: string
    status: string
    type: string
  } | null
  leadsCount: number
  leadsByStatus: Record<string, number>
  leadsBySource: Record<string, number>
  conversionRate: number
  appointmentsCount: number
  appointmentsUpcoming: number
  quotesCount: number
  quotesAccepted: number
  revenue: number
  commissionsDue: number
  commissionsPaid: number
  agentRunsCount: number
  agentRunsByType: Record<string, number>
  agentRunsSuccessRate: number
  recentLeads: Array<{
    id: string
    firstName: string
    lastName: string
    email: string
    source: string
    status: string
    score: number
    createdAt: string
    _count?: { events?: number; appointments?: number; quotes?: number }
  }>
  pipeline: Record<string, number>
  generatedAt: string
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

export default function GrowthDashboardPage() {
  const t = useTranslations('growthApp')
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/growth/dashboard', { cache: 'no-store' })
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

  const stats = {
    leads: data?.leadsCount ?? 0,
    conversion: data?.conversionRate ?? 0,
    upcoming: data?.appointmentsUpcoming ?? 0,
    revenue: data?.revenue ?? 0,
  }

  const recentLeads = data?.recentLeads ?? []
  const pipeline = data?.pipeline ?? {}
  const agentRunsByType = data?.agentRunsByType ?? {}

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="section-label inline-block">
            <Sparkles className="mr-1 inline h-3 w-3" />
            AQWELIA Growth OS
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
          icon={<Inbox className="h-4 w-4" />}
          label={t('statLeads')}
          hint={t('statLeadsHint')}
          value={stats.leads.toLocaleString()}
          loading={loading}
        />
        <StatCard
          icon={<TrendingUp className="h-4 w-4" />}
          label={t('statConversion')}
          hint={t('statConversionHint')}
          value={`${stats.conversion}%`}
          loading={loading}
        />
        <StatCard
          icon={<Calendar className="h-4 w-4" />}
          label={t('statUpcoming')}
          hint={t('statUpcomingHint')}
          value={stats.upcoming.toLocaleString()}
          loading={loading}
        />
        <StatCard
          icon={<Coins className="h-4 w-4" />}
          label={t('statRevenue')}
          hint={t('statRevenueHint')}
          value={`${stats.revenue.toLocaleString()} €`}
          loading={loading}
        />
      </div>

      {error && (
        <div className="rounded-2xl border border-red-400/40 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Pipeline */}
        <section className="rounded-2xl border border-white/40 bg-white/60 p-5 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04] lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">
              {t('pipelineTitle')}
            </h2>
            <Link
              href="/growth/app/leads"
              className="inline-flex items-center gap-1 text-xs font-medium text-gold hover:underline"
            >
              {t('viewAll')}
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {loading ? (
            <LoadingRow />
          ) : Object.keys(pipeline).length === 0 ? (
            <EmptyRow text={t('pipelineEmpty')} />
          ) : (
            <ul className="space-y-2">
              {Object.entries(pipeline).map(([status, count]) => {
                const cls = STATUS_COLORS[status] ?? STATUS_COLORS.NEW
                return (
                  <li
                    key={status}
                    className="flex items-center gap-3 rounded-xl border border-border/40 bg-card/40 p-3"
                  >
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${cls}`}
                    >
                      {status}
                    </span>
                    <div className="flex-1">
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-gold to-[oklch(0.55_0.10_195)]"
                          style={{
                            width: `${
                              stats.leads > 0
                                ? Math.min(100, (count / stats.leads) * 100)
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                    <span className="shrink-0 font-display text-sm font-bold">
                      {count}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {/* Agents activity */}
        <section className="rounded-2xl border border-white/40 bg-white/60 p-5 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04]">
          <div className="mb-4 flex items-center gap-2">
            <Bot className="h-4 w-4 text-gold" />
            <h2 className="font-display text-lg font-bold">{t('agentsTitle')}</h2>
          </div>
          {loading ? (
            <LoadingRow />
          ) : Object.keys(agentRunsByType).length === 0 ? (
            <EmptyRow text={t('agentsEmpty')} />
          ) : (
            <>
              <div className="mb-4 rounded-xl border border-gold/30 bg-gold/[0.05] p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {t('agentsSuccessRate')}
                </p>
                <p className="mt-1 font-display text-2xl font-bold text-gold">
                  {data?.agentRunsSuccessRate ?? 0}%
                </p>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {t('agentsRunsTotal', { count: data?.agentRunsCount ?? 0 })}
                </p>
              </div>
              <ul className="space-y-1.5">
                {Object.entries(agentRunsByType).map(([type, count]) => (
                  <li
                    key={type}
                    className="flex items-center justify-between rounded-lg border border-border/40 bg-card/30 px-3 py-1.5"
                  >
                    <span className="font-mono text-[11px] text-foreground">
                      {type}
                    </span>
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-foreground">
                      {count}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>

      {/* Recent leads */}
      <section className="rounded-2xl border border-white/40 bg-white/60 p-5 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">
            {t('recentLeadsTitle')}
          </h2>
          <Link
            href="/growth/app/leads"
            className="inline-flex items-center gap-1 text-xs font-medium text-gold hover:underline"
          >
            {t('viewAll')}
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {loading ? (
          <LoadingRow />
        ) : recentLeads.length === 0 ? (
          <EmptyRow text={t('recentLeadsEmpty')} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border/40 bg-secondary/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 font-semibold">{t('colName')}</th>
                  <th className="px-4 py-3 font-semibold">{t('colSource')}</th>
                  <th className="px-4 py-3 font-semibold">{t('colStatus')}</th>
                  <th className="px-4 py-3 text-center font-semibold">{t('colScore')}</th>
                  <th className="px-4 py-3 text-right font-semibold">{t('colActions')}</th>
                </tr>
              </thead>
              <tbody>
                {recentLeads.map((lead) => {
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
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/growth/app/leads/${lead.id}`}
                          className="inline-flex items-center gap-1 rounded-full border border-gold/40 bg-gold/5 px-2.5 py-1 text-[11px] font-semibold text-gold transition-colors hover:bg-gold/15"
                        >
                          {t('viewLead')}
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
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
  value: string
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
          value
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
