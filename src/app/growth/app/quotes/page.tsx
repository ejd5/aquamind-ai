'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { FileText, Loader2, RefreshCw } from 'lucide-react'
import { useToolWorkspaceText } from '@/hooks/use-tool-workspace-text'

type Quote = { id:string; total:number; currency:string; status:string; createdAt:string; items:string; lead:{id:string;firstName:string;lastName:string} }
const statuses = ['draft','sent','accepted','rejected','expired']

export default function GrowthQuotesPage() {
  const tt = useToolWorkspaceText()
  const [rows, setRows] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const load = useCallback(async () => { setLoading(true); const response = await fetch('/api/growth/quotes', { cache:'no-store' }); if (response.ok) setRows((await response.json()).quotes ?? []); setLoading(false) }, [])
  useEffect(() => { const timer = window.setTimeout(() => { void load() }, 0); return () => window.clearTimeout(timer) }, [load])
  async function update(id:string, status:string) { const response = await fetch(`/api/growth/quotes/${id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({status}) }); setMessage(response.ok ? tt('quoteUpdated') : tt('updateFailed')); if (response.ok) void load() }
  return <div className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><span className="section-label"><FileText className="mr-1 inline h-3 w-3" />Growth Inbox Beta</span><h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">Quotes</h1><p className="mt-1 text-sm text-muted-foreground">Drafts, delivery and commercial decisions with a full audit trail.</p></div><button onClick={load} className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-2 text-xs"><RefreshCw className="h-3.5 w-3.5" />Refresh</button></div>
    {message && <div className="rounded-xl border border-primary/30 bg-primary/10 p-3 text-sm">{message}</div>}
    {loading ? <div className="flex justify-center py-14"><Loader2 className="h-6 w-6 animate-spin" /></div> : rows.length === 0 ? <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">No quotes. Create one from a lead record.</div> : <div className="space-y-3">{rows.map((quote) => <div key={quote.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/40 bg-white/60 p-4 dark:border-white/10 dark:bg-white/[0.04]"><div><Link href={`/growth/app/leads/${quote.lead.id}`} className="font-semibold hover:text-gold">{quote.lead.firstName} {quote.lead.lastName}</Link><p className="text-xs text-muted-foreground">{quote.total.toLocaleString()} {quote.currency} · {new Date(quote.createdAt).toLocaleDateString()} · {itemCount(quote.items)} item(s)</p></div><select value={quote.status} onChange={(event) => void update(quote.id, event.target.value)} className="rounded-xl border border-border bg-background p-2 text-xs">{statuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></div>)}</div>}
  </div>
}

function itemCount(value:string) { try { const items=JSON.parse(value); return Array.isArray(items) ? items.length : 0 } catch { return 0 } }
