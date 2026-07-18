'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, ShieldCheck } from 'lucide-react'

export default function NewGrowthLeadPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ source: 'inbound', firstName: '', lastName: '', email: '', phone: '', city: '', zipCode: '', serviceType: 'maintenance', poolType: 'pool', poolVolume: '', problem: '', urgency: 'normal', budget: '', consent: false })
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError('')
    const res = await fetch('/api/growth/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, poolVolume: form.poolVolume ? Number(form.poolVolume) : undefined, consentSource: 'growth_inbox_manual_form' }) })
    const json = await res.json().catch(() => ({})); setSaving(false)
    if (res.status === 409) { router.push('/growth/app/settings'); return }
    if (!res.ok) { setError(json.error || json.warning || 'Impossible de créer la demande.'); return }
    router.push(`/growth/app/leads/${json.leadId}`)
  }
  return <div className="space-y-6">
    <Link href="/growth/app/leads" className="inline-flex items-center gap-1 text-xs text-muted-foreground"><ArrowLeft className="h-3.5 w-3.5" />Retour aux demandes</Link>
    <div><span className="section-label">Growth Inbox Beta</span><h1 className="mt-2 font-display text-3xl font-bold">Nouvelle demande entrante</h1><p className="mt-1 text-sm text-muted-foreground">Saisie manuelle d’une demande reçue avec preuve de consentement.</p></div>
    <form onSubmit={submit} className="rounded-2xl border border-white/40 bg-white/60 p-5 dark:border-white/10 dark:bg-white/[0.04]">
      <div className="grid gap-3 sm:grid-cols-2">{[
        ['firstName','Prénom','text'],['lastName','Nom','text'],['email','E-mail','email'],['phone','Téléphone','tel'],['zipCode','Code postal','text'],['city','Ville','text'],['poolVolume','Volume du bassin (m³)','number'],['budget','Budget indicatif','text'],
      ].map(([key,label,type]) => <label key={key} className="text-xs font-semibold text-muted-foreground">{label}<input required={['firstName','lastName','email'].includes(key)} type={type} value={(form as any)[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} className="mt-1 w-full rounded-xl border border-border bg-background p-2.5 text-sm text-foreground" /></label>)}
        <label className="text-xs font-semibold text-muted-foreground">Service<select value={form.serviceType} onChange={(e) => setForm({ ...form, serviceType: e.target.value })} className="mt-1 w-full rounded-xl border border-border bg-background p-2.5 text-sm"><option value="maintenance">Entretien</option><option value="repair">Réparation</option><option value="opening">Mise en service</option><option value="closing">Hivernage</option><option value="emergency">Urgence</option><option value="spa">Spa</option><option value="renovation">Rénovation</option></select></label>
        <label className="text-xs font-semibold text-muted-foreground">Urgence<select value={form.urgency} onChange={(e) => setForm({ ...form, urgency: e.target.value })} className="mt-1 w-full rounded-xl border border-border bg-background p-2.5 text-sm"><option value="low">Faible</option><option value="normal">Normale</option><option value="high">Haute</option><option value="emergency">Urgence</option></select></label>
      </div>
      <label className="mt-3 block text-xs font-semibold text-muted-foreground">Problème ou besoin<textarea value={form.problem} onChange={(e) => setForm({ ...form, problem: e.target.value })} className="mt-1 min-h-28 w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground" /></label>
      <label className="mt-4 flex items-start gap-3 rounded-xl border border-emerald-400/30 bg-emerald-500/5 p-4 text-sm"><input type="checkbox" required checked={form.consent} onChange={(e) => setForm({ ...form, consent: e.target.checked })} className="mt-1" /><span><strong className="flex items-center gap-1"><ShieldCheck className="h-4 w-4 text-emerald-600" />Consentement explicite obtenu</strong><span className="mt-1 block text-xs text-muted-foreground">La personne accepte que ses informations soient utilisées pour qualifier sa demande et proposer un professionnel. Ce consentement sera journalisé.</span></span></label>
      {error && <div className="mt-4 rounded-xl border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-700">{error}</div>}
      <button disabled={saving || !form.consent} className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground disabled:opacity-50">{saving && <Loader2 className="h-4 w-4 animate-spin" />}Créer la demande</button>
    </form>
  </div>
}
