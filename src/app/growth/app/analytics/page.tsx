'use client'

import { useEffect, useState } from 'react'
import { BarChart3, Calendar, Coins, Inbox, Loader2, ShieldCheck, TrendingUp } from 'lucide-react'
import { useToolWorkspaceText } from '@/hooks/use-tool-workspace-text'

type Data = { leadsCount:number; conversionRate:number; appointmentsUpcoming:number; revenue:number; quotesCount:number; quotesAccepted:number; agentRunsSuccessRate:number; leadsBySource:Record<string,number>; leadsByStatus:Record<string,number> }

export default function GrowthAnalyticsPage() {
  const tt = useToolWorkspaceText()
  const [data, setData] = useState<Data | null>(null)
  useEffect(() => { fetch('/api/growth/dashboard', { cache: 'no-store' }).then((r) => r.json()).then(setData) }, [])
  if (!data) return <div className="flex justify-center py-14"><Loader2 className="h-6 w-6 animate-spin" /></div>
  return <div className="space-y-6">
    <div><span className="section-label"><BarChart3 className="mr-1 inline h-3 w-3" />Growth Inbox Beta</span><h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">Analytics</h1><p className="mt-1 text-sm text-muted-foreground">Conversion, activity and request processing evidence.</p></div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Card icon={<Inbox />} label="Requests" value={data.leadsCount} /><Card icon={<TrendingUp />} label="Conversion" value={`${data.conversionRate}%`} /><Card icon={<Calendar />} label={tt('upcomingAppointments')} value={data.appointmentsUpcoming} /><Card icon={<Coins />} label={tt('acceptedQuoteRevenue')} value={`${data.revenue.toLocaleString()} €`} /></div>
    <div className="grid gap-6 lg:grid-cols-2"><Breakdown title="Pipeline" rows={data.leadsByStatus} /><Breakdown title="Sources" rows={data.leadsBySource} /></div>
    <section className="rounded-2xl border border-emerald-400/30 bg-emerald-500/5 p-5"><h2 className="flex items-center gap-2 font-display text-lg font-bold"><ShieldCheck className="h-5 w-5 text-emerald-600" />Operational quality</h2><p className="mt-2 text-sm text-muted-foreground">{data.quotesAccepted}/{data.quotesCount} accepted quotes · {data.agentRunsSuccessRate}% deterministic processing success.</p></section>
  </div>
}

function Card({ icon, label, value }: { icon:React.ReactNode; label:string; value:string|number }) { return <div className="rounded-2xl border border-white/40 bg-white/60 p-5 dark:border-white/10 dark:bg-white/[0.04]"><div className="h-5 w-5 text-gold">{icon}</div><p className="mt-4 text-xs text-muted-foreground">{label}</p><p className="mt-1 font-display text-2xl font-bold">{value}</p></div> }
function Breakdown({ title, rows }: { title:string; rows:Record<string,number> }) { return <section className="rounded-2xl border border-white/40 bg-white/60 p-5 dark:border-white/10 dark:bg-white/[0.04]"><h2 className="font-display text-lg font-bold">{title}</h2><div className="mt-4 space-y-2">{Object.keys(rows).length === 0 ? <p className="text-sm text-muted-foreground">No data.</p> : Object.entries(rows).map(([key, value]) => <div key={key} className="flex items-center justify-between rounded-xl bg-secondary/50 p-3 text-sm"><span>{key}</span><strong>{value}</strong></div>)}</div></section> }
