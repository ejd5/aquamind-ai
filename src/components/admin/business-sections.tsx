'use client'

/**
 * AQWELIA — Admin Business Cockpit (PR113) · USERS (read-only support) +
 * ANALYTICS (données réelles). Remplace les placeholders analytics/users.
 */

import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Activity, Droplets, FlaskConical, Search, Users as UsersIcon, Camera, Boxes } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

async function apiFetch<T = unknown>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' } })
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`)
  return data as T
}

/* ── USERS ─────────────────────────────────────────────────────────────────── */

interface UserRow {
  id: string
  email: string
  name: string | null
  role: string
  locale: string
  country: string
  createdAt: string
  pools: number
  waterTests: number
  diagnostics: number
  lastActivityAt: string | null
  plan: string | null
  subStatus: string | null
}

const ROLE_BADGE: Record<string, string> = { admin: 'champagne', pro: 'info', business: 'info', user: 'secondary' }

export function UsersSection() {
  const t = useTranslations('admin')
  const [users, setUsers] = useState<UserRow[] | null>(null)
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [error, setError] = useState(false)

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' })
      if (q.trim()) params.set('q', q.trim())
      const data = await apiFetch<{ users: UserRow[]; pagination: { total: number; totalPages: number } }>(`/api/admin/v1/users?${params}`)
      setUsers(data.users)
      setTotalPages(data.pagination.totalPages)
    } catch {
      setError(true)
    }
  }, [q, page])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-xl font-bold">{t('cpUsersTitle')}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{t('cpUsersReadOnly')}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex min-w-52 flex-1 items-center gap-2 rounded-lg border border-border px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
              setPage(1)
            }}
            placeholder={t('cpUsersSearch')}
            className="w-full bg-transparent text-sm outline-none"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center text-sm font-semibold text-destructive">
          {t('cpError')}
        </div>
      )}
      {!error && users === null && <p className="text-sm text-muted-foreground">…</p>}
      {!error && users !== null && users.length === 0 && (
        <div className="rounded-xl border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
          {t('cpUsersEmpty')}
        </div>
      )}

      {!error && users !== null && users.length > 0 && (
        <>
          <div className="glass-card-lagon overflow-x-auto rounded-xl">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border/60 text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-2">{t('cpUsersColUser')}</th>
                  <th className="px-4 py-2">{t('cpUsersColRole')}</th>
                  <th className="px-4 py-2">{t('cpUsersColSub')}</th>
                  <th className="px-4 py-2">{t('cpUsersColActivity')}</th>
                  <th className="px-4 py-2">{t('cpUsersColLast')}</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-border/40 align-top">
                    <td className="px-4 py-2.5">
                      <p className="font-medium">{u.name || u.email}</p>
                      <p className="text-[11px] text-muted-foreground">{u.email}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {u.locale} · {u.country} · {new Date(u.createdAt).toLocaleDateString()}
                      </p>
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge variant={(ROLE_BADGE[u.role] ?? 'secondary') as never}>{u.role}</Badge>
                    </td>
                    <td className="px-4 py-2.5">
                      <p className="text-xs">{u.plan ?? '—'}</p>
                      <p className="text-[11px] text-muted-foreground">{u.subStatus ?? '—'}</p>
                    </td>
                    <td className="px-4 py-2.5 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Boxes className="h-3 w-3" /> {u.pools}
                      </span>
                      <span className="flex items-center gap-1">
                        <FlaskConical className="h-3 w-3" /> {u.waterTests}
                      </span>
                      <span className="flex items-center gap-1">
                        <Camera className="h-3 w-3" /> {u.diagnostics}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-[11px] text-muted-foreground">
                      {u.lastActivityAt ? new Date(u.lastActivityAt).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium disabled:opacity-40"
            >
              ←
            </button>
            <span className="text-xs text-muted-foreground">
              {page} / {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium disabled:opacity-40"
            >
              →
            </button>
          </div>
        </>
      )}
    </div>
  )
}

/* ── ANALYTICS ─────────────────────────────────────────────────────────────── */

interface AnalyticsData {
  generatedAt: string
  users: { total: number; newLast30d: number }
  activity: {
    poolProfiles: number
    waterTests: number
    photoDiagnostics: number
    recommendationExecutions: number
    recommendationOutcomes: number
  }
  subscriptionsByStatus: Record<string, number>
  marketingContent: {
    bannersByStatus: Record<string, number>
    popupsByStatus: Record<string, number>
    announcementsByStatus: Record<string, number>
  }
  conversions: { unavailable: boolean; reason: string }
  campaignPerformance: { unavailable: boolean; reason: string }
}

export function AnalyticsSection() {
  const t = useTranslations('admin')
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    apiFetch<AnalyticsData>('/api/admin/v1/analytics')
      .then(setData)
      .catch(() => setError(true))
  }, [])

  const card = (label: string, value: number, icon: React.ReactNode, chip: string) => (
    <div className="glass-card-lagon rounded-xl p-4">
      <div className={`${chip} mb-2 inline-flex h-9 w-9 items-center justify-center`}>{icon}</div>
      <p className="font-display text-2xl font-bold">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  )

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-xl font-bold">{t('cpAnalyticsTitle')}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{t('cpAnalyticsRealData')}</p>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center text-sm font-semibold text-destructive">
          {t('cpError')}
        </div>
      )}
      {!error && data === null && <p className="text-sm text-muted-foreground">…</p>}

      {!error && data !== null && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {card(t('cpAnalyticsUsers'), data.users.total, <UsersIcon className="h-4 w-4" />, 'icon-chip icon-chip-lagoon')}
            {card(t('cpAnalyticsNew30d'), data.users.newLast30d, <UsersIcon className="h-4 w-4" />, 'icon-chip icon-chip-aqua')}
            {card(t('cpAnalyticsPools'), data.activity.poolProfiles, <Boxes className="h-4 w-4" />, 'icon-chip icon-chip-info')}
            {card(t('cpAnalyticsTests'), data.activity.waterTests, <FlaskConical className="h-4 w-4" />, 'icon-chip icon-chip-lagoon')}
            {card(t('cpAnalyticsDiagnostics'), data.activity.photoDiagnostics, <Camera className="h-4 w-4" />, 'icon-chip icon-chip-aqua')}
            {card(t('cpAnalyticsExecutions'), data.activity.recommendationExecutions, <Activity className="h-4 w-4" />, 'icon-chip icon-chip-info')}
          </div>

          <div className="glass-card-lagon rounded-xl p-4">
            <p className="mb-2 text-sm font-semibold">{t('cpAnalyticsSubs')}</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(data.subscriptionsByStatus).map(([status, count]) => (
                <span key={status} className="rounded-full bg-secondary px-3 py-1 text-xs">
                  {status}: <strong>{count}</strong>
                </span>
              ))}
              {Object.keys(data.subscriptionsByStatus).length === 0 && (
                <span className="text-xs text-muted-foreground">{t('cpAnalyticsNoSubs')}</span>
              )}
            </div>
          </div>

          <div className="glass-card-lagon rounded-xl p-4">
            <p className="mb-2 text-sm font-semibold">{t('cpAnalyticsMarketing')}</p>
            <div className="grid gap-2 text-xs sm:grid-cols-3">
              <div>
                <p className="text-muted-foreground">{t('navBanners')}</p>
                {Object.entries(data.marketingContent.bannersByStatus).map(([s, c]) => (
                  <p key={s}>{s}: {c}</p>
                ))}
              </div>
              <div>
                <p className="text-muted-foreground">{t('navPopups')}</p>
                {Object.entries(data.marketingContent.popupsByStatus).map(([s, c]) => (
                  <p key={s}>{s}: {c}</p>
                ))}
              </div>
              <div>
                <p className="text-muted-foreground">{t('navAnnouncements')}</p>
                {Object.entries(data.marketingContent.announcementsByStatus).map(([s, c]) => (
                  <p key={s}>{s}: {c}</p>
                ))}
              </div>
            </div>
          </div>

          {data.conversions.unavailable && (
            <div className="rounded-xl border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
              {t('cpAnalyticsUnavailable')} — {data.conversions.reason}
            </div>
          )}
        </>
      )}
    </div>
  )
}
