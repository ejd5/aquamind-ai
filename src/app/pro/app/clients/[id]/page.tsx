'use client'

/**
 * AQWELIA Pro — Client detail page.
 *
 * Fetches /api/pro/clients/[id] and renders:
 *  - Client identity + contact info (email, phone, address, notes)
 *  - List of pools (with type, volume, shape, treatment, filter badges)
 *  - "Add a pool" button → opens <AddPoolModal clientId={id} />
 *  - "New intervention" button → placeholder (links to planning)
 *  - Last 10 interventions history (date, type, status, pool)
 *
 * Uses useParams() so the page can be a client component (the layout
 * already enforces session).
 */
import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  StickyNote,
  Waves,
  Plus,
  Wrench,
  Loader2,
  RefreshCw,
  Calendar,
  AlertCircle,
} from 'lucide-react'
import { AddPoolModal } from '@/components/pro/add-pool-modal'

interface PoolRow {
  id: string
  name: string
  type: string
  volume?: number | null
  unit?: string
  shape?: string | null
  surface?: string | null
  treatmentType?: string | null
  saltSystem?: boolean
  filterType?: string | null
  _count?: { interventions?: number; waterTests?: number }
}

interface InterventionRow {
  id: string
  type?: string
  status?: string
  scheduledAt: string
  completedAt?: string | null
  duration?: number | null
  notes?: string | null
  pool?: { id: string; name?: string } | null
}

interface ClientDetail {
  id: string
  firstName: string
  lastName: string
  email?: string | null
  phone?: string | null
  address?: string | null
  city?: string | null
  zipCode?: string | null
  notes?: string | null
  createdAt?: string
  pools?: PoolRow[]
  interventions?: InterventionRow[]
  _count?: { pools?: number; interventions?: number }
}

export default function ProClientDetailPage() {
  const t = useTranslations('proApp')
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const clientId = params?.id ?? ''

  const [client, setClient] = useState<ClientDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [poolModalOpen, setPoolModalOpen] = useState(false)

  const load = useCallback(async () => {
    if (!clientId) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/pro/clients/${clientId}`, {
        cache: 'no-store',
      })
      if (res.status === 404) {
        setError(t('clientNotFound'))
        setClient(null)
        return
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = (await res.json()) as { client: ClientDetail }
      setClient(json.client)
    } catch {
      setError(t('errorGeneric'))
      setClient(null)
    } finally {
      setLoading(false)
    }
  }, [clientId, t])

  useEffect(() => {
    void load()
  }, [load])

  const pools = client?.pools ?? []
  const interventions = client?.interventions ?? []

  return (
    <div className="space-y-6">
      {/* Back + actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={() => router.push('/pro/app/clients')}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t('clientBackToList')}
        </button>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/pro/app/planning"
            className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/60 px-4 py-2 text-xs font-semibold text-foreground backdrop-blur transition-colors hover:border-gold/60 hover:text-gold dark:border-white/10 dark:bg-white/[0.04]"
          >
            <Wrench className="h-3.5 w-3.5" />
            {t('clientNewIntervention')}
          </Link>
          <button
            onClick={() => setPoolModalOpen(true)}
            className="glow-gold inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-gold via-[oklch(0.65_0.11_195)] to-[oklch(0.55_0.10_195)] px-4 py-2 text-xs font-bold text-[oklch(0.99_0.01_195)] shadow-lg transition-all hover:scale-[1.02]"
          >
            <Plus className="h-3.5 w-3.5" />
            {t('clientAddPool')}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-2xl border border-red-400/40 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading && !client && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {client && (
        <>
          {/* Identity header */}
          <section className="relative overflow-hidden rounded-2xl border border-white/40 bg-white/60 p-6 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04]">
            <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent" />
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-gold text-xl font-bold text-white shadow-md shadow-primary/30">
                  {initials(client.firstName, client.lastName)}
                </div>
                <div>
                  <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
                    {client.firstName} {client.lastName}
                  </h1>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {t('clientsColPools')}: {client._count?.pools ?? pools.length} ·{' '}
                    {t('clientsColLastIntervention')}: {client._count?.interventions ?? interventions.length}
                  </p>
                </div>
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

            {/* Contact grid */}
            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <ContactItem
                icon={<Mail className="h-4 w-4" />}
                label={t('clientEmail')}
                value={client.email}
              />
              <ContactItem
                icon={<Phone className="h-4 w-4" />}
                label={t('clientPhone')}
                value={client.phone}
              />
              <ContactItem
                icon={<MapPin className="h-4 w-4" />}
                label={t('clientAddress')}
                value={formatAddress(client.address, client.zipCode, client.city)}
              />
            </div>

            {client.notes && (
              <div className="mt-4 rounded-xl border border-border/40 bg-card/30 p-4">
                <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <StickyNote className="h-3 w-3" />
                  {t('clientNotes')}
                </p>
                <p className="text-sm text-foreground whitespace-pre-wrap">
                  {client.notes}
                </p>
              </div>
            )}
          </section>

          {/* Pools */}
          <section className="rounded-2xl border border-white/40 bg-white/60 p-5 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04]">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-display text-lg font-bold">
                <Waves className="h-4 w-4 text-primary" />
                {t('clientPools')}
              </h2>
              <button
                onClick={() => setPoolModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/5 px-3 py-1.5 text-[11px] font-semibold text-gold transition-colors hover:bg-gold/15"
              >
                <Plus className="h-3 w-3" />
                {t('clientAddPool')}
              </button>
            </div>
            {pools.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/50 bg-card/30 py-8 text-center text-xs text-muted-foreground">
                {t('clientPoolsEmpty')}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {pools.map((p) => (
                  <PoolCard key={p.id} pool={p} />
                ))}
              </div>
            )}
          </section>

          {/* Interventions history */}
          <section className="rounded-2xl border border-white/40 bg-white/60 p-5 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04]">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-display text-lg font-bold">
                <Calendar className="h-4 w-4 text-primary" />
                {t('clientInterventionsHistory')}
              </h2>
              <Link
                href="/pro/app/interventions"
                className="inline-flex items-center gap-1 text-xs font-medium text-gold hover:underline"
              >
                {t('viewAll')}
              </Link>
            </div>
            {interventions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/50 bg-card/30 py-8 text-center text-xs text-muted-foreground">
                {t('clientInterventionsEmpty')}
              </div>
            ) : (
              <ul className="space-y-2">
                {interventions.map((iv) => (
                  <li
                    key={iv.id}
                    className="flex items-center gap-3 rounded-xl border border-border/40 bg-card/40 p-3"
                  >
                    <TypeBadge type={iv.type} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {iv.pool?.name ?? t('noPool')}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {formatDate(iv.scheduledAt)}
                        {iv.duration ? ` · ${iv.duration} ${t('interventionMin')}` : ''}
                      </p>
                    </div>
                    <StatusBadge status={iv.status} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      <AddPoolModal
        open={poolModalOpen}
        clientId={clientId}
        onClose={() => setPoolModalOpen(false)}
        onCreated={() => {
          void load()
        }}
      />
    </div>
  )
}

/* -------------------- Helpers -------------------- */

function initials(first?: string, last?: string): string {
  const a = (first ?? '').trim().charAt(0)
  const b = (last ?? '').trim().charAt(0)
  return (a + b).toUpperCase() || '?'
}

function formatAddress(addr?: string | null, zip?: string | null, city?: string | null): string {
  const parts: string[] = []
  if (addr) parts.push(addr)
  const zc = [zip, city].filter(Boolean).join(' ')
  if (zc) parts.push(zc)
  return parts.join(', ') || '—'
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    return iso
  }
}

/* -------------------- Small building blocks -------------------- */

function ContactItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value?: string | null
}) {
  return (
    <div className="rounded-xl border border-border/40 bg-card/30 p-3">
      <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </p>
      <p className="truncate text-sm text-foreground">{value || '—'}</p>
    </div>
  )
}

function PoolCard({ pool }: { pool: PoolRow }) {
  const t = useTranslations('proApp')
  const typeKey = `poolType${cap(pool.type)}`
  let typeLabel: string
  try {
    typeLabel = t(typeKey as any)
  } catch {
    typeLabel = pool.type
  }
  return (
    <div className="rounded-xl border border-border/40 bg-card/40 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-display text-sm font-bold text-foreground">
            {pool.name}
          </p>
          <p className="text-[11px] text-muted-foreground">{typeLabel}</p>
        </div>
        {pool.saltSystem && (
          <span className="shrink-0 rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-bold text-gold">
            {t('treatmentSalt')}
          </span>
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5 text-[10px]">
        {typeof pool.volume === 'number' && (
          <Badge>{t('poolVolume')}: {pool.volume} {t('poolVolumeUnit')}</Badge>
        )}
        {pool.shape && (
          <Badge>{t('poolShape')}: {trOpt('shape', pool.shape, t)}</Badge>
        )}
        {pool.surface && (
          <Badge>{t('addPoolSurface')}: {trOpt('surface', pool.surface, t)}</Badge>
        )}
        {pool.treatmentType && (
          <Badge>{t('poolTreatment')}: {trOpt('treatment', pool.treatmentType, t)}</Badge>
        )}
        {pool.filterType && (
          <Badge>{t('poolFilter')}: {trOpt('filter', pool.filterType, t)}</Badge>
        )}
      </div>
      {(pool._count?.interventions || pool._count?.waterTests) ? (
        <p className="mt-3 text-[10px] text-muted-foreground">
          {pool._count?.interventions ? `${pool._count.interventions} ${t('interventionsCount', { count: pool._count.interventions }).toLowerCase()}` : ''}
          {pool._count?.interventions && pool._count?.waterTests ? ' · ' : ''}
          {pool._count?.waterTests ? `${pool._count.waterTests}` : ''}
        </p>
      ) : null}
    </div>
  )
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-border/40 bg-secondary/40 px-2 py-0.5 text-[10px] font-medium text-foreground/85">
      {children}
    </span>
  )
}

function trOpt(prefix: 'shape' | 'surface' | 'treatment' | 'filter', value: string, t: (k: any) => string): string {
  const key = `${prefix}${cap(value)}`
  try {
    return t(key as any)
  } catch {
    return value
  }
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
      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${cls}`}
    >
      {label}
    </span>
  )
}

function cap(s: string): string {
  return s
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
}
