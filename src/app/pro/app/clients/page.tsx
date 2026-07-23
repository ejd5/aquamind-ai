'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import {
  AlertTriangle,
  ChevronRight,
  Clock3,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Users,
} from 'lucide-react'
import { AddClientModal } from '@/components/pro/add-client-modal'

const STATUSES = ['all', 'prospect', 'active', 'paused', 'archived'] as const
const FOLLOW_UPS = ['all', 'overdue', 'upcoming', 'none'] as const

type ClientRow = {
  id: string
  firstName: string
  lastName: string
  companyName?: string | null
  email?: string | null
  phone?: string | null
  city?: string | null
  status: string
  preferredContact?: string
  tags?: string[]
  lastContactAt?: string | null
  nextFollowUpAt?: string | null
  lastActivity?: { type: string; title: string; occurredAt: string } | null
  _count?: { pools?: number; interventions?: number; activities?: number }
}

type ClientsResponse = {
  clients: ClientRow[]
  total: number
  page: number
  pageSize: number
  summary?: {
    statusCounts?: Record<string, number>
    overdueFollowUps?: number
  }
}

export default function ProClientsPage() {
  const t = useTranslations('proApp')
  const [data, setData] = useState<ClientsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<(typeof STATUSES)[number]>('all')
  const [followUpFilter, setFollowUpFilter] = useState<(typeof FOLLOW_UPS)[number]>('all')
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [search])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ pageSize: '100' })
      if (debouncedSearch) params.set('q', debouncedSearch)
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (followUpFilter !== 'all') params.set('followUp', followUpFilter)
      const response = await fetch(`/api/pro/clients?${params.toString()}`, { cache: 'no-store' })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      setData((await response.json()) as ClientsResponse)
    } catch {
      setError(t('errorGeneric'))
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, followUpFilter, statusFilter, t])

  useEffect(() => { void load() }, [load])

  const clients = data?.clients ?? []
  const statusCounts = data?.summary?.statusCounts ?? {}
  const overdue = data?.summary?.overdueFollowUps ?? 0
  const showEmpty = !loading && !error && clients.length === 0

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="section-label inline-flex items-center gap-1"><Users className="h-3 w-3" />AQWELIA Pro</span>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">{t('clientsTitle')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('crmClientsSubtitle')}</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="glow-gold inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-gold to-primary px-4 py-2 text-xs font-bold text-white shadow-lg">
          <Plus className="h-3.5 w-3.5" />{t('clientsAdd')}
        </button>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {(['prospect', 'active', 'paused', 'archived'] as const).map((status) => (
          <button key={status} onClick={() => setStatusFilter(statusFilter === status ? 'all' : status)} className={`rounded-2xl border p-4 text-left transition ${statusFilter === status ? 'border-gold bg-gold/10' : 'border-white/40 bg-white/60 hover:border-gold/50 dark:border-white/10 dark:bg-white/[0.04]'}`}>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t(`crmStatus${capitalize(status)}` as never)}</p>
            <p className="mt-2 text-2xl font-bold">{statusCounts[status] ?? 0}</p>
          </button>
        ))}
        <button onClick={() => setFollowUpFilter(followUpFilter === 'overdue' ? 'all' : 'overdue')} className={`rounded-2xl border p-4 text-left transition ${followUpFilter === 'overdue' ? 'border-amber-500 bg-amber-500/10' : 'border-white/40 bg-white/60 hover:border-amber-500/50 dark:border-white/10 dark:bg-white/[0.04]'}`}>
          <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"><AlertTriangle className="h-3 w-3" />{t('crmOverdueFollowUps')}</p>
          <p className="mt-2 text-2xl font-bold">{overdue}</p>
        </button>
      </section>

      <section className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('clientsSearchPlaceholder')} className="input-glass w-full pl-9" />
        </div>
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as (typeof STATUSES)[number])} className="input-glass w-auto min-w-36">
          {STATUSES.map((value) => <option key={value} value={value}>{value === 'all' ? t('crmAllStatuses') : t(`crmStatus${capitalize(value)}` as never)}</option>)}
        </select>
        <select value={followUpFilter} onChange={(event) => setFollowUpFilter(event.target.value as (typeof FOLLOW_UPS)[number])} className="input-glass w-auto min-w-40">
          {FOLLOW_UPS.map((value) => <option key={value} value={value}>{t(`crmFollowUp${capitalize(value)}` as never)}</option>)}
        </select>
        <button onClick={load} disabled={loading} className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-2 text-xs font-semibold disabled:opacity-50">
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}{t('retry')}
        </button>
      </section>

      {error ? <div className="rounded-2xl border border-red-400/40 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-300">{error}</div> : null}
      {!loading && !error && clients.length > 0 ? <p className="text-xs text-muted-foreground">{t('clientsCount', { count: data?.total ?? clients.length })}</p> : null}

      {!loading && !error && clients.length > 0 ? (
        <div className="overflow-hidden rounded-2xl border border-white/40 bg-white/60 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04]">
          <div className="custom-scroll overflow-x-auto">
            <table className="w-full min-w-[960px] text-sm">
              <thead><tr className="border-b border-border/40 bg-secondary/40 text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3">{t('clientsColName')}</th>
                <th className="px-4 py-3">{t('crmClientStatus')}</th>
                <th className="px-4 py-3">{t('crmContact')}</th>
                <th className="px-4 py-3 text-center">{t('clientsColPools')}</th>
                <th className="px-4 py-3">{t('crmLastActivity')}</th>
                <th className="px-4 py-3">{t('crmNextFollowUp')}</th>
                <th className="px-4 py-3 text-right">{t('clientsColActions')}</th>
              </tr></thead>
              <tbody>{clients.map((client) => (
                <tr key={client.id} className="border-b border-border/30 transition-colors last:border-0 hover:bg-secondary/40">
                  <td className="px-4 py-3"><p className="font-semibold">{client.firstName} {client.lastName}</p><p className="text-[11px] text-muted-foreground">{client.companyName || client.city || '—'}</p><div className="mt-1 flex flex-wrap gap-1">{client.tags?.slice(0, 3).map((tag) => <span key={tag} className="rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-semibold text-primary">{tag}</span>)}</div></td>
                  <td className="px-4 py-3"><StatusBadge status={client.status} label={t(`crmStatus${capitalize(client.status)}` as never)} /></td>
                  <td className="px-4 py-3 text-xs text-muted-foreground"><p>{client.email || '—'}</p><p>{client.phone || '—'}</p></td>
                  <td className="px-4 py-3 text-center"><span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-bold text-primary">{client._count?.pools ?? 0}</span></td>
                  <td className="px-4 py-3 text-xs"><p className="font-medium">{client.lastActivity ? activityLabel(client.lastActivity.title, client.lastActivity.type, t) : '—'}</p><p className="text-muted-foreground">{formatDate(client.lastActivity?.occurredAt || client.lastContactAt)}</p></td>
                  <td className="px-4 py-3 text-xs"><FollowUp date={client.nextFollowUpAt} t={t} /></td>
                  <td className="px-4 py-3 text-right"><Link href={`/pro/app/clients/${client.id}`} className="inline-flex items-center gap-1 rounded-full border border-gold/40 bg-gold/5 px-3 py-1.5 text-[11px] font-semibold text-gold hover:bg-gold/15">{t('clientsView')}<ChevronRight className="h-3 w-3" /></Link></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      ) : null}

      {showEmpty ? <div className="rounded-2xl border border-dashed border-border/50 bg-card/30 px-6 py-12 text-center"><Sparkles className="mx-auto h-7 w-7 text-gold" /><p className="mt-3 text-sm font-semibold">{debouncedSearch || statusFilter !== 'all' || followUpFilter !== 'all' ? t('clientsNoResults') : t('clientsEmpty')}</p></div> : null}
      {loading && !data ? <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin" /></div> : null}

      <AddClientModal open={modalOpen} onClose={() => setModalOpen(false)} onCreated={() => { void load() }} />
    </div>
  )
}

function StatusBadge({ status, label }: { status: string; label: string }) {
  const classes = status === 'active' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : status === 'prospect' ? 'bg-blue-500/10 text-blue-700 dark:text-blue-300' : status === 'paused' ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300' : 'bg-secondary text-muted-foreground'
  return <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${classes}`}>{label}</span>
}

function FollowUp({ date, t }: { date?: string | null; t: ReturnType<typeof useTranslations> }) {
  if (!date) return <span className="text-muted-foreground">{t('crmNoFollowUp')}</span>
  const value = new Date(date)
  const overdue = value.getTime() < Date.now()
  return <span className={`inline-flex items-center gap-1 font-medium ${overdue ? 'text-amber-700 dark:text-amber-300' : ''}`}><Clock3 className="h-3 w-3" />{value.toLocaleDateString()}</span>
}

function activityLabel(title: string, type: string, t: ReturnType<typeof useTranslations>) {
  if (title === 'crm.client_created') return t('crmActivityClientCreated')
  if (title.startsWith('crm.status_change:')) return t('crmActivityStatusChanged')
  if (title.startsWith('crm.intervention_')) return t('crmActivityIntervention')
  return title || t(`crmActivity${capitalize(type)}` as never)
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString() : '—'
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}
