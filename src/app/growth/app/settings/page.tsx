'use client'

import { useEffect, useState } from 'react'
import { Loader2, Save, Settings, ShieldCheck } from 'lucide-react'

type Org = { name?: string; legalName?: string | null; siret?: string | null; address?: string | null; city?: string | null; zipCode?: string | null; country?: string | null; phone?: string | null; email?: string | null; website?: string | null }

export default function GrowthSettingsPage() {
  const [org, setOrg] = useState<Org>({ country: 'FR' })
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  useEffect(() => { fetch('/api/growth/settings', { cache: 'no-store' }).then((r) => r.json()).then((j) => setOrg(j.organization ?? { country: 'FR' })).finally(() => setLoading(false)) }, [])
  async function save() { setLoading(true); const r = await fetch('/api/growth/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(org) }); const j = await r.json(); setMessage(r.ok ? 'Organisation enregistrée.' : j.error || 'Erreur'); if (r.ok) setOrg(j.organization); setLoading(false) }
  if (loading && !org.name) return <div className="flex justify-center py-14"><Loader2 className="h-6 w-6 animate-spin" /></div>
  return <div className="space-y-6">
    <div><span className="section-label"><Settings className="mr-1 inline h-3 w-3" />Growth Inbox Beta</span><h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">Paramètres</h1><p className="mt-1 text-sm text-muted-foreground">Organisation et cadre de traitement des demandes entrantes.</p></div>
    {message && <div className="rounded-xl border border-primary/30 bg-primary/10 p-3 text-sm">{message}</div>}
    <section className="rounded-2xl border border-white/40 bg-white/60 p-5 dark:border-white/10 dark:bg-white/[0.04]">
      <h2 className="font-display text-lg font-bold">Organisation</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">{[['name','Nom'],['legalName','Raison sociale'],['siret','SIRET'],['email','E-mail'],['phone','Téléphone'],['address','Adresse'],['zipCode','Code postal'],['city','Ville'],['country','Pays'],['website','Site web']].map(([key,label]) => <label key={key} className="text-xs font-semibold text-muted-foreground">{label}<input value={(org as any)[key] ?? ''} onChange={(e) => setOrg({ ...org, [key]: e.target.value })} className="mt-1 w-full rounded-xl border border-border bg-background p-2.5 text-sm text-foreground" /></label>)}</div>
      <button onClick={save} disabled={loading} className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Enregistrer</button>
    </section>
    <section className="rounded-2xl border border-emerald-400/30 bg-emerald-500/5 p-5"><h2 className="flex items-center gap-2 font-display text-lg font-bold"><ShieldCheck className="h-5 w-5 text-emerald-600" />Cadre de conformité actif</h2><ul className="mt-3 space-y-2 text-sm text-muted-foreground"><li>• Consentement explicite obligatoire avant la création d’une demande.</li><li>• Relances limitées à l’e-mail transactionnel et bloquées sans consentement.</li><li>• Matching et attribution soumis à validation humaine.</li><li>• Aucun scraping, appel vocal autonome ou canal WhatsApp non officiel.</li></ul></section>
  </div>
}
