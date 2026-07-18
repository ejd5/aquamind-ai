'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Droplets, FlaskConical, Loader2, MapPin, RefreshCw, Search, Waves } from 'lucide-react'

type PoolRow = {
  id: string
  name: string
  type: string
  volume?: number | null
  unit?: string
  treatmentType?: string | null
  filterType?: string | null
  client: { id: string; firstName: string; lastName: string; city?: string | null }
  waterTests?: Array<{ testedAt: string; ph?: number | null; freeChlorine?: number | null }>
  _count?: { interventions: number; waterTests: number }
}

export default function ProPoolsPage() {
  const [pools, setPools] = useState<PoolRow[]>([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (q.trim()) params.set('q', q.trim())
      const res = await fetch(`/api/pro/pools?${params}`, { cache: 'no-store' })
      if (!res.ok) throw new Error()
      const json = await res.json()
      setPools(json.pools ?? [])
    } catch {
      setError('Impossible de charger les bassins.')
    } finally {
      setLoading(false)
    }
  }, [q])

  useEffect(() => { void load() }, [load])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="section-label"><Waves className="mr-1 inline h-3 w-3" />AQWELIA Pro</span>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">Bassins</h1>
          <p className="mt-1 text-sm text-muted-foreground">Parc clients, équipements et dernier état de l’eau.</p>
        </div>
        <button onClick={load} disabled={loading} className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-xs font-semibold">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Actualiser
        </button>
      </div>

      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Bassin, client ou ville" className="w-full rounded-xl border border-border bg-background/70 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-gold" />
      </div>

      {error && <div className="rounded-xl border border-red-400/40 bg-red-500/10 p-4 text-sm text-red-700">{error}</div>}
      {!loading && !error && pools.length === 0 && <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">Aucun bassin. Ajoutez-en depuis une fiche client.</div>}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {pools.map((pool) => {
          const last = pool.waterTests?.[0]
          return (
            <Link key={pool.id} href={`/pro/app/pools/${pool.id}`} className="group rounded-2xl border border-white/40 bg-white/60 p-5 backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-gold/50 dark:border-white/10 dark:bg-white/[0.04]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg font-bold group-hover:text-gold">{pool.name}</h2>
                  <p className="text-sm text-muted-foreground">{pool.client.firstName} {pool.client.lastName}</p>
                </div>
                <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-bold uppercase text-primary">{pool.type}</span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <Info icon={<Droplets className="h-3.5 w-3.5" />} value={pool.volume ? `${pool.volume} ${pool.unit ?? 'm3'}` : 'Volume non renseigné'} />
                <Info icon={<MapPin className="h-3.5 w-3.5" />} value={pool.client.city || 'Ville non renseignée'} />
                <Info icon={<FlaskConical className="h-3.5 w-3.5" />} value={last ? `pH ${last.ph ?? '—'} · Cl ${last.freeChlorine ?? '—'}` : 'Aucune analyse'} />
                <Info icon={<Waves className="h-3.5 w-3.5" />} value={`${pool._count?.interventions ?? 0} intervention(s)`} />
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

function Info({ icon, value }: { icon: React.ReactNode; value: string }) {
  return <div className="flex items-center gap-2 rounded-lg bg-secondary/50 p-2 text-muted-foreground">{icon}<span className="truncate">{value}</span></div>
}
