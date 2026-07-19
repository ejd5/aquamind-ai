'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Download, FileText, Loader2 } from 'lucide-react'

type Intervention = { id: string; scheduledAt: string; completedAt?: string | null; type: string; status: string; client?: { firstName: string; lastName: string }; pool?: { name: string } | null }

export default function ProReportsPage() {
  const [rows, setRows] = useState<Intervention[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => { fetch('/api/pro/interventions?status=completed&pageSize=100', { cache: 'no-store' }).then((r) => r.json()).then((j) => setRows(j.interventions ?? [])).finally(() => setLoading(false)) }, [])
  return <div className="space-y-6">
    <div><span className="section-label"><FileText className="mr-1 inline h-3 w-3" />AQWELIA Pro</span><h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">Rapports</h1><p className="mt-1 text-sm text-muted-foreground">Rapports terrain téléchargeables et partageables avec les clients.</p></div>
    {loading ? <div className="flex justify-center py-14"><Loader2 className="h-6 w-6 animate-spin" /></div> : rows.length === 0 ? <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">Terminez une intervention pour générer son rapport.</div> : <div className="overflow-hidden rounded-2xl border border-white/40 bg-white/60 dark:border-white/10 dark:bg-white/[0.04]">
      {rows.map((iv) => <div key={iv.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-border/30 p-4 last:border-0"><div><Link href={`/pro/app/interventions/${iv.id}`} className="font-semibold hover:text-gold">{iv.client?.firstName} {iv.client?.lastName}</Link><p className="text-xs text-muted-foreground">{iv.pool?.name ?? 'Aucun bassin'} · {new Date(iv.completedAt || iv.scheduledAt).toLocaleString('fr-FR')} · {iv.type}</p></div><a href={`/api/pro/interventions/${iv.id}/report`} className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/5 px-3 py-2 text-xs font-semibold text-gold"><Download className="h-4 w-4" />PDF</a></div>)}
    </div>}
  </div>
}
