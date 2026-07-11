'use client'

/**
 * AQWELIA Pro — Clients list page.
 *
 * Fetches /api/pro/clients (with a `q` search query, debounced 300ms).
 * Renders a glassmorphism table with: name, email, phone, # pools,
 * last intervention date (from `_count.interventions`), and an action
 * link to the client detail page.
 *
 * "Add a client" button opens the shared <AddClientModal /> component.
 * After a successful creation, the list is reloaded.
 */
import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import {
  Users,
  Plus,
  Search,
  Loader2,
  RefreshCw,
  ChevronRight,
  Sparkles,
} from 'lucide-react'
import { AddClientModal } from '@/components/pro/add-client-modal'

interface ClientRow {
  id: string
  firstName: string
  lastName: string
  email?: string | null
  phone?: string | null
  address?: string | null
  city?: string | null
  zipCode?: string | null
  notes?: string | null
  _count?: { pools?: number; interventions?: number }
  createdAt?: string
}

interface ClientsResponse {
  clients: ClientRow[]
  total: number
  page: number
  pageSize: number
}

export default function ProClientsPage() {
  const t = useTranslations('proApp')
  const [data, setData] = useState<ClientsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)

  // Debounce the search input.
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
      params.set('pageSize', '50')
      const url = `/api/pro/clients${params.size ? `?${params.toString()}` : ''}`
      const res = await fetch(url, { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = (await res.json()) as ClientsResponse
      setData(json)
    } catch {
      setError(t('errorGeneric'))
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, t])

  useEffect(() => {
    void load()
  }, [load])

  const clients = data?.clients ?? []
  const total = data?.total ?? 0
  const showEmptyState = !loading && !error && clients.length === 0
  const showNoResults = showEmptyState && debouncedSearch.trim().length > 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="section-label inline-block">
            <Users className="mr-1 inline h-3 w-3" />
            AQWELIA Pro
          </span>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            {t('clientsTitle')}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('clientsSubtitle')}
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="glow-gold inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-gold via-[oklch(0.65_0.11_195)] to-[oklch(0.55_0.10_195)] px-4 py-2 text-xs font-bold text-[oklch(0.99_0.01_195)] shadow-lg transition-all hover:scale-[1.02]"
        >
          <Plus className="h-3.5 w-3.5" />
          {t('clientsAdd')}
        </button>
      </div>

      {/* Search + refresh */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('clientsSearchPlaceholder')}
            className="input-glass w-full pl-9"
            aria-label={t('clientsSearchPlaceholder')}
          />
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

      {/* Error */}
      {error && (
        <div className="rounded-2xl border border-red-400/40 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Count hint */}
      {!loading && !error && clients.length > 0 && (
        <div className="text-xs text-muted-foreground">
          {t('clientsCount', { count: total })}
        </div>
      )}

      {/* Table */}
      {!loading && !error && clients.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-white/40 bg-white/60 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04]">
          <div className="custom-scroll overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="border-b border-border/40 bg-secondary/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 font-semibold">{t('clientsColName')}</th>
                  <th className="px-4 py-3 font-semibold">{t('clientsColEmail')}</th>
                  <th className="px-4 py-3 font-semibold">{t('clientsColPhone')}</th>
                  <th className="px-4 py-3 text-center font-semibold">{t('clientsColPools')}</th>
                  <th className="px-4 py-3 text-right font-semibold">{t('clientsColActions')}</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => {
                  const pools = c._count?.pools ?? 0
                  return (
                    <tr
                      key={c.id}
                      className="border-b border-border/30 transition-colors last:border-0 hover:bg-secondary/40"
                    >
                      <td className="px-4 py-3">
                        <div className="font-semibold text-foreground">
                          {c.firstName} {c.lastName}
                        </div>
                        {c.city && (
                          <div className="text-[11px] text-muted-foreground">
                            {c.city}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {c.email ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {c.phone ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex min-w-[1.5rem] items-center justify-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                          {pools}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/pro/app/clients/${c.id}`}
                          className="inline-flex items-center gap-1 rounded-full border border-gold/40 bg-gold/5 px-2.5 py-1 text-[11px] font-semibold text-gold transition-colors hover:bg-gold/15"
                        >
                          {t('clientsView')}
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

      {/* Empty state — no client at all */}
      {showEmptyState && !showNoResults && (
        <div className="rounded-2xl border border-dashed border-border/50 bg-card/30 px-6 py-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary to-gold text-white shadow-md shadow-primary/30">
            <Sparkles className="h-5 w-5" />
          </div>
          <p className="mt-4 text-sm font-semibold text-foreground">
            {t('clientsEmpty')}
          </p>
          <button
            onClick={() => setModalOpen(true)}
            className="mt-4 inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/5 px-4 py-2 text-xs font-semibold text-gold transition-colors hover:bg-gold/15"
          >
            <Plus className="h-3.5 w-3.5" />
            {t('clientsAdd')}
          </button>
        </div>
      )}

      {/* Empty state — search with no results */}
      {showNoResults && (
        <div className="rounded-2xl border border-dashed border-border/50 bg-card/30 px-6 py-12 text-center text-sm text-muted-foreground">
          {t('clientsNoResults')}
        </div>
      )}

      {/* Loading state */}
      {loading && !data && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}

      <AddClientModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={() => {
          void load()
        }}
      />
    </div>
  )
}
