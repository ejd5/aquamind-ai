'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Calendar, Loader2, RefreshCw } from 'lucide-react'
import { useToolWorkspaceText } from '@/hooks/use-tool-workspace-text'

type Appointment = { id:string; startTime:string; endTime:string; status:string; lead:{ id:string; firstName:string; lastName:string; city?:string|null } }
const statuses = ['proposed','confirmed','completed','cancelled','no_show']

export default function GrowthAppointmentsPage() {
  const tt = useToolWorkspaceText()
  const [rows, setRows] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const load = useCallback(async () => { setLoading(true); const response = await fetch('/api/growth/appointments', { cache:'no-store' }); if (response.ok) setRows((await response.json()).appointments ?? []); setLoading(false) }, [])
  useEffect(() => { const timer = window.setTimeout(() => { void load() }, 0); return () => window.clearTimeout(timer) }, [load])
  async function update(id:string, status:string) { const response = await fetch(`/api/growth/appointments/${id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({status}) }); setMessage(response.ok ? tt('appointmentUpdated') : tt('updateFailed')); if (response.ok) void load() }
  return <div className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><span className="section-label"><Calendar className="mr-1 inline h-3 w-3" /> Growth Inbox Beta</span><h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">Appointments</h1><p className="mt-1 text-sm text-muted-foreground">{tt('appointmentsSubtitle')}</p></div><button onClick={load} className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-2 text-xs"><RefreshCw className="h-3.5 w-3.5" />Refresh</button></div>
    {message && <div className="rounded-xl border border-primary/30 bg-primary/10 p-3 text-sm">{message}</div>}
    {loading ? <div className="flex justify-center py-14"><Loader2 className="h-6 w-6 animate-spin" /></div> : rows.length === 0 ? <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">{tt('appointmentsEmpty')}</div> : <div className="space-y-3">{rows.map((appointment) => <div key={appointment.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/40 bg-white/60 p-4 dark:border-white/10 dark:bg-white/[0.04]"><div><Link href={`/growth/app/leads/${appointment.lead.id}`} className="font-semibold hover:text-gold">{appointment.lead.firstName} {appointment.lead.lastName}</Link><p className="text-xs text-muted-foreground">{new Date(appointment.startTime).toLocaleString()} → {new Date(appointment.endTime).toLocaleTimeString()} · {appointment.lead.city || tt('areaUnknown')}</p></div><select value={appointment.status} onChange={(event) => void update(appointment.id, event.target.value)} className="rounded-xl border border-border bg-background p-2 text-xs">{statuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></div>)}</div>}
  </div>
}
