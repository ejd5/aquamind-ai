'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Bot, Loader2, RefreshCw, ShieldCheck, UserCheck, Users } from 'lucide-react'
import { useToolWorkspaceText } from '@/hooks/use-tool-workspace-text'

type Lead = { id: string; firstName: string; lastName: string; email: string; city?: string | null; status: string; score: number; serviceType?: string | null; urgency: string; consent: boolean; assignedTo?: string | null }
type Member = { id: string; role: string; user: { id: string; name?: string | null; email: string } }

export function PipelineWorkspace({ mode }: { mode: 'qualification' | 'matching' }) {
  const tt = useToolWorkspaceText()
  const [leads, setLeads] = useState<Lead[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState('')
  const [message, setMessage] = useState('')
  const [needsSetup, setNeedsSetup] = useState(false)
  const load = useCallback(async () => {
    setLoading(true)
    const [leadRes, settingsRes] = await Promise.all([fetch('/api/growth/leads?pageSize=100', { cache: 'no-store' }), fetch('/api/growth/settings', { cache: 'no-store' })])
    if (leadRes.status === 409) { setNeedsSetup(true); setLoading(false); return }
    const leadJson = await leadRes.json(); const settingsJson = await settingsRes.json()
    setLeads(leadJson.leads ?? []); setMembers(settingsJson.members ?? []); setNeedsSetup(false); setLoading(false)
  }, [])
  useEffect(() => { const timer = window.setTimeout(() => { void load() }, 0); return () => window.clearTimeout(timer) }, [load])

  async function qualify(lead: Lead) {
    setWorking(lead.id); setMessage('')
    const res = await fetch(`/api/growth/leads/${lead.id}/qualify`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ answers: [
      { question: 'urgency', answer: lead.urgency, weight: 25 }, { question: 'service_type', answer: lead.serviceType || 'maintenance', weight: 20 }, { question: 'consent', answer: lead.consent ? 'yes' : 'no', weight: 30 }, { question: 'location', answer: lead.city || 'unknown', weight: 10 },
    ] }) })
    setMessage(res.ok ? tt('qualificationDone') : tt('qualificationFailed')); setWorking(''); if (res.ok) void load()
  }

  async function assign(lead: Lead, userId: string) {
    if (!userId) return
    setWorking(lead.id); setMessage('')
    const res = await fetch(`/api/growth/leads/${lead.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ assignedTo: userId, status: 'ASSIGNED' }) })
    setMessage(res.ok ? tt('assignmentDone') : tt('assignmentFailed')); setWorking(''); if (res.ok) void load()
  }

  const visible = leads.filter((lead) => mode === 'qualification' ? ['NEW','QUALIFIED','SCORED'].includes(lead.status) : ['QUALIFIED','SCORED','ASSIGNED'].includes(lead.status))
  if (needsSetup) return <SetupRequired />
  return <div className="space-y-6">
    <div><span className="section-label">Growth Inbox Beta</span><h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">{mode === 'qualification' ? 'Qualification' : 'Human matching'}</h1><p className="mt-1 text-sm text-muted-foreground">{mode === 'qualification' ? tt('qualificationDescription') : tt('assignmentDescription')}</p></div>
    <div className="flex items-center justify-between"><p className="text-xs text-muted-foreground">{visible.length} demande(s) à traiter</p><button onClick={load} className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-2 text-xs"><RefreshCw className="h-3.5 w-3.5" />Actualiser</button></div>
    {message && <div className="rounded-xl border border-primary/30 bg-primary/10 p-3 text-sm">{message}</div>}
    {loading ? <div className="flex justify-center py-14"><Loader2 className="h-6 w-6 animate-spin" /></div> : visible.length === 0 ? <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">No requests in this queue.</div> : <div className="space-y-3">{visible.map((lead) => <div key={lead.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/40 bg-white/60 p-4 dark:border-white/10 dark:bg-white/[0.04]"><div><Link href={`/growth/app/leads/${lead.id}`} className="font-semibold hover:text-gold">{lead.firstName} {lead.lastName}</Link><p className="text-xs text-muted-foreground">{lead.serviceType || tt('serviceUnknown')} · {lead.city || tt('areaUnknown')} · score {lead.score}/100</p><p className="mt-1 flex items-center gap-1 text-[10px] text-emerald-700"><ShieldCheck className="h-3 w-3" />Consent {lead.consent ? tt('confirmed') : 'absent'}</p></div>{mode === 'qualification' ? <button disabled={working === lead.id || !lead.consent} onClick={() => qualify(lead)} className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50">{working === lead.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}Qualify</button> : <label className="text-xs font-semibold text-muted-foreground">Assign<select defaultValue={lead.assignedTo || ''} disabled={working === lead.id} onChange={(e) => void assign(lead, e.target.value)} className="ml-2 rounded-xl border border-border bg-background p-2 text-xs text-foreground"><option value="">Choose</option>{members.filter((m) => ['owner','admin','manager','technician'].includes(m.role)).map((m) => <option key={m.id} value={m.user.id}>{m.user.name || m.user.email}</option>)}</select></label>}</div>)}</div>}
  </div>
}

function SetupRequired() { return <div className="rounded-2xl border border-amber-400/30 bg-amber-500/5 p-8 text-center"><Users className="mx-auto h-8 w-8 text-amber-600" /><h1 className="mt-3 font-display text-xl font-bold">Configurez votre organisation</h1><p className="mt-2 text-sm text-muted-foreground">Cette étape est nécessaire pour cloisonner les demandes et les collaborateurs.</p><Link href="/growth/app/settings" className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground"><UserCheck className="h-4 w-4" />Ouvrir les paramètres</Link></div> }
