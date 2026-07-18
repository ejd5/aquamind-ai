'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Calendar, Download, FlaskConical, Loader2, Plus, Save, Wrench } from 'lucide-react'

type WaterTest = { id: string; testedAt: string; ph?: number | null; freeChlorine?: number | null; alkalinity?: number | null; temperature?: number | null; notes?: string | null }
type Pool = {
  id: string; name: string; type: string; volume?: number | null; unit?: string; treatmentType?: string | null; filterType?: string | null; notes?: string | null
  client: { id: string; firstName: string; lastName: string; email?: string | null; phone?: string | null }
  waterTests: WaterTest[]
  interventions: Array<{ id: string; type: string; status: string; scheduledAt: string }>
}

export default function ProPoolDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [pool, setPool] = useState<Pool | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ ph: '', freeChlorine: '', alkalinity: '', temperature: '', notes: '' })

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/pro/pools/${id}`, { cache: 'no-store' })
    if (res.ok) setPool((await res.json()).pool)
    setLoading(false)
  }, [id])
  useEffect(() => { const timer = window.setTimeout(() => { void load() }, 0); return () => window.clearTimeout(timer) }, [load])

  async function addTest(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    const res = await fetch('/api/pro/water-tests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ proPoolId: id, ...form }) })
    setSaving(false)
    if (res.ok) { setForm({ ph: '', freeChlorine: '', alkalinity: '', temperature: '', notes: '' }); void load() }
  }

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div>
  if (!pool) return <div className="rounded-xl border border-red-400/40 bg-red-500/10 p-4">Bassin introuvable.</div>

  return <div className="space-y-6">
    <Link href="/pro/app/pools" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3.5 w-3.5" />Retour aux bassins</Link>
    <section className="rounded-2xl border border-white/40 bg-white/60 p-6 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><span className="section-label">{pool.type}</span><h1 className="mt-2 font-display text-3xl font-bold">{pool.name}</h1><p className="text-sm text-muted-foreground">{pool.client.firstName} {pool.client.lastName}</p></div>
        <a href={`/api/pro/pools/${pool.id}/report`} className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/5 px-4 py-2 text-xs font-semibold text-gold"><Download className="h-4 w-4" />Rapport bassin PDF</a>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-4">
        <Metric label="Volume" value={pool.volume ? `${pool.volume} ${pool.unit ?? 'm3'}` : '—'} />
        <Metric label="Traitement" value={pool.treatmentType || '—'} />
        <Metric label="Filtration" value={pool.filterType || '—'} />
        <Metric label="Analyses" value={String(pool.waterTests.length)} />
      </div>
    </section>

    <div className="grid gap-6 lg:grid-cols-2">
      <form onSubmit={addTest} className="rounded-2xl border border-white/40 bg-white/60 p-5 dark:border-white/10 dark:bg-white/[0.04]">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold"><FlaskConical className="h-5 w-5 text-primary" />Nouvelle analyse d’eau</h2>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Field label="pH" value={form.ph} onChange={(v) => setForm({ ...form, ph: v })} />
          <Field label="Chlore libre (mg/L)" value={form.freeChlorine} onChange={(v) => setForm({ ...form, freeChlorine: v })} />
          <Field label="TAC (mg/L)" value={form.alkalinity} onChange={(v) => setForm({ ...form, alkalinity: v })} />
          <Field label="Température (°C)" value={form.temperature} onChange={(v) => setForm({ ...form, temperature: v })} />
        </div>
        <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Observations" className="mt-3 min-h-24 w-full rounded-xl border border-border bg-background p-3 text-sm" />
        <button disabled={saving} className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Enregistrer l’analyse</button>
      </form>

      <section className="rounded-2xl border border-white/40 bg-white/60 p-5 dark:border-white/10 dark:bg-white/[0.04]">
        <h2 className="font-display text-lg font-bold">Historique chimique</h2>
        <div className="mt-4 space-y-2">{pool.waterTests.length === 0 ? <p className="text-sm text-muted-foreground">Aucune analyse.</p> : pool.waterTests.map((test) => <div key={test.id} className="rounded-xl border border-border/40 bg-card/40 p-3 text-sm"><div className="flex justify-between"><strong>{new Date(test.testedAt).toLocaleDateString('fr-FR')}</strong><span className="text-muted-foreground">{test.temperature ?? '—'} °C</span></div><p className="mt-1 text-xs text-muted-foreground">pH {test.ph ?? '—'} · Chlore {test.freeChlorine ?? '—'} · TAC {test.alkalinity ?? '—'}</p>{test.notes && <p className="mt-2 text-xs">{test.notes}</p>}</div>)}</div>
      </section>
    </div>

    <section className="rounded-2xl border border-white/40 bg-white/60 p-5 dark:border-white/10 dark:bg-white/[0.04]">
      <h2 className="flex items-center gap-2 font-display text-lg font-bold"><Wrench className="h-5 w-5 text-gold" />Historique des interventions</h2>
      <div className="mt-4 space-y-2">{pool.interventions.length === 0 ? <p className="text-sm text-muted-foreground">Aucune intervention.</p> : pool.interventions.map((iv) => <Link key={iv.id} href={`/pro/app/interventions/${iv.id}`} className="flex items-center justify-between rounded-xl border border-border/40 p-3 text-sm hover:border-gold/40"><span className="font-semibold capitalize">{iv.type}</span><span className="flex items-center gap-1 text-xs text-muted-foreground"><Calendar className="h-3.5 w-3.5" />{new Date(iv.scheduledAt).toLocaleString('fr-FR')} · {iv.status}</span></Link>)}</div>
    </section>
  </div>
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-secondary/50 p-3"><p className="text-[10px] uppercase text-muted-foreground">{label}</p><p className="mt-1 font-semibold">{value}</p></div> }
function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) { return <label className="text-xs font-semibold text-muted-foreground">{label}<input type="number" step="any" value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-background p-2.5 text-sm text-foreground" /></label> }
