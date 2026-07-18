'use client'

import { useCallback, useEffect, useState } from 'react'
import { Download, Loader2, Plus, Save, Settings, Trash2, Users } from 'lucide-react'

type Org = { name?: string; legalName?: string | null; siret?: string | null; vatNumber?: string | null; address?: string | null; city?: string | null; zipCode?: string | null; phone?: string | null; email?: string | null; website?: string | null }
type Member = { id: string; role: string; user: { name?: string | null; email: string } }

export default function ProSettingsPage() {
  const [org, setOrg] = useState<Org>({})
  const [members, setMembers] = useState<Member[]>([])
  const [memberEmail, setMemberEmail] = useState('')
  const [role, setRole] = useState('technician')
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const load = useCallback(async () => { const r = await fetch('/api/pro/settings', { cache: 'no-store' }); if (r.ok) { const j = await r.json(); setOrg(j.organization ?? {}); setMembers(j.members ?? []) } setLoading(false) }, [])
  useEffect(() => { void load() }, [load])
  async function act(body: any) { setLoading(true); setMessage(''); const r = await fetch('/api/pro/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); const j = await r.json(); setMessage(r.ok ? 'Modifications enregistrées.' : j.error || 'Une erreur est survenue.'); await load() }
  if (loading && !org.name) return <div className="flex justify-center py-14"><Loader2 className="h-6 w-6 animate-spin" /></div>
  return <div className="space-y-6">
    <div><span className="section-label"><Settings className="mr-1 inline h-3 w-3" />AQWELIA Pro</span><h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">Paramètres</h1><p className="mt-1 text-sm text-muted-foreground">Société, équipe et portabilité des données.</p></div>
    {message && <div className="rounded-xl border border-primary/30 bg-primary/10 p-3 text-sm">{message}</div>}
    <section className="rounded-2xl border border-white/40 bg-white/60 p-5 dark:border-white/10 dark:bg-white/[0.04]">
      <h2 className="font-display text-lg font-bold">Identité de la société</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">{[
        ['name','Nom commercial'],['legalName','Raison sociale'],['siret','SIRET'],['vatNumber','TVA'],['email','E-mail'],['phone','Téléphone'],['address','Adresse'],['city','Ville'],['zipCode','Code postal'],['website','Site web'],
      ].map(([key,label]) => <label key={key} className="text-xs font-semibold text-muted-foreground">{label}<input value={(org as any)[key] ?? ''} onChange={(e) => setOrg({ ...org, [key]: e.target.value })} className="mt-1 w-full rounded-xl border border-border bg-background p-2.5 text-sm text-foreground" /></label>)}</div>
      <button onClick={() => act({ action: 'save_company', ...org })} className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground"><Save className="h-4 w-4" />Enregistrer la société</button>
    </section>
    <section className="rounded-2xl border border-white/40 bg-white/60 p-5 dark:border-white/10 dark:bg-white/[0.04]">
      <h2 className="flex items-center gap-2 font-display text-lg font-bold"><Users className="h-5 w-5 text-gold" />Équipe et rôles</h2>
      <p className="mt-1 text-xs text-muted-foreground">Le collaborateur doit avoir créé son compte AQWELIA avant d’être ajouté.</p>
      <div className="mt-4 flex flex-wrap gap-2"><input type="email" value={memberEmail} onChange={(e) => setMemberEmail(e.target.value)} placeholder="collaborateur@entreprise.fr" className="min-w-64 flex-1 rounded-xl border border-border bg-background p-2.5 text-sm" /><select value={role} onChange={(e) => setRole(e.target.value)} className="rounded-xl border border-border bg-background p-2.5 text-sm"><option value="technician">Technicien</option><option value="manager">Responsable</option><option value="admin">Administrateur</option><option value="viewer">Lecture seule</option></select><button onClick={() => act({ action: 'add_member', email: memberEmail, role })} className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/5 px-4 py-2 text-xs font-semibold text-gold"><Plus className="h-4 w-4" />Ajouter</button></div>
      <div className="mt-4 space-y-2">{members.map((m) => <div key={m.id} className="flex items-center justify-between rounded-xl border border-border/40 p-3 text-sm"><div><strong>{m.user.name || m.user.email}</strong><p className="text-xs text-muted-foreground">{m.user.email} · {m.role}</p></div>{m.role !== 'owner' && <button onClick={() => act({ action: 'remove_member', memberId: m.id })} aria-label="Retirer"><Trash2 className="h-4 w-4 text-red-500" /></button>}</div>)}</div>
    </section>
    <section className="rounded-2xl border border-white/40 bg-white/60 p-5 dark:border-white/10 dark:bg-white/[0.04]"><h2 className="font-display text-lg font-bold">Export des données</h2><p className="mt-1 text-xs text-muted-foreground">Clients, bassins et dernières interventions au format CSV.</p><a href="/api/pro/export" className="mt-4 inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs font-semibold"><Download className="h-4 w-4" />Télécharger l’export CSV</a></section>
  </div>
}
