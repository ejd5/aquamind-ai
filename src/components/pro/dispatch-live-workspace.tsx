'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocale } from 'next-intl'
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Loader2,
  LocateFixed,
  MapPinned,
  Navigation,
  RefreshCw,
  Route,
  Settings2,
  ShieldCheck,
  UsersRound,
  XCircle,
} from 'lucide-react'
import { LiveDispatchMap } from '@/components/pro/live-dispatch-map'
import { GpsDeviceSettings } from '@/components/pro/gps-device-settings'
import { PRO_LIVE_DISPATCH_COPY, type ProLiveDispatchLocale } from '@/i18n/locales/pro-live-dispatch-copy'

type Stop = {
  id: string
  technicianId: string | null
  sequence: number
  scheduledAt: string
  duration: number | null
  type: string
  status: string
  priority: string
  summary: string | null
  location: { latitude: number; longitude: number } | null
  client: {
    firstName: string
    lastName: string
    companyName: string | null
    phone: string | null
    city: string | null
  }
  pool: { name: string } | null
}

type Technician = {
  memberId: string
  userId: string
  name: string
  email: string
  role: string
  color: string
  phone: string | null
  vehicle: string | null
  sharingEnabled: boolean
  source: string
  noticeAcknowledged: boolean
  activeCount: number
  urgentCount: number
  location: {
    latitude: number
    longitude: number
    accuracy: number | null
    speed: number | null
    heading: number | null
    recordedAt: string
    freshness: 'live' | 'stale' | 'offline'
  } | null
  route: Stop[]
}

type LivePayload = {
  organization: {
    id: string
    name: string
    locationTrackingEnabled: boolean
    locationRetentionDays: number
  }
  serverTime: string
  technicians: Technician[]
  unassigned: Stop[]
}

type SettingsPayload = {
  organization: LivePayload['organization']
  members: Array<{
    id: string
    userId: string
    role: string
    dispatchEnabled: boolean
    locationSharingEnabled: boolean
    locationSource: string
    locationNoticeAcknowledgedAt: string | null
    user: { name: string | null; email: string }
  }>
}

type Candidate = {
  userId: string
  name: string
  color: string
  vehicle: string | null
  distanceKm: number
  driveMinutes: number
  distanceSource: string
  locationFreshness: 'live' | 'stale' | 'offline'
  activeInterventions: number
  hasScheduleConflict: boolean
  score: number
}

function freshnessClasses(value: 'live' | 'stale' | 'offline') {
  if (value === 'live') return 'bg-emerald-500/10 text-emerald-700 border-emerald-300/50'
  if (value === 'stale') return 'bg-amber-500/10 text-amber-800 border-amber-300/50'
  return 'bg-slate-500/10 text-slate-600 border-slate-300/50'
}

export function DispatchLiveWorkspace() {
  const locale = useLocale() as ProLiveDispatchLocale
  const copy = PRO_LIVE_DISPATCH_COPY[locale] ?? PRO_LIVE_DISPATCH_COPY.en
  const [data, setData] = useState<LivePayload | null>(null)
  const [settings, setSettings] = useState<SettingsPayload | null>(null)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [recommendationFor, setRecommendationFor] = useState<string | null>(null)
  const [candidates, setCandidates] = useState<Candidate[]>([])

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setBusy(true)
    try {
      const now = new Date()
      const from = new Date(now); from.setHours(0, 0, 0, 0)
      const to = new Date(from); to.setDate(to.getDate() + 1)
      const [liveResponse, settingsResponse] = await Promise.all([
        fetch(`/api/pro/dispatch/live?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`, { cache: 'no-store' }),
        fetch('/api/pro/dispatch/settings', { cache: 'no-store' }),
      ])
      const live = await liveResponse.json() as LivePayload & { error?: string }
      const config = await settingsResponse.json() as SettingsPayload & { error?: string }
      if (!liveResponse.ok) throw new Error(live.error || 'Unable to load live dispatch')
      if (!settingsResponse.ok) throw new Error(config.error || 'Unable to load tracking settings')
      setData(live)
      setSettings(config)
      setError(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load live dispatch')
    } finally {
      if (!quiet) setBusy(false)
    }
  }, [])

  useEffect(() => {
    void load()
    const interval = window.setInterval(() => { void load(true) }, 15_000)
    return () => window.clearInterval(interval)
  }, [load])

  const selected = useMemo(
    () => data?.technicians.find((technician) => technician.userId === selectedUserId) ?? null,
    [data?.technicians, selectedUserId],
  )
  const urgentStops = useMemo(
    () => data?.unassigned.filter((stop) => stop.priority === 'urgent' && stop.status !== 'completed') ?? [],
    [data?.unassigned],
  )

  async function updateOrganization(enabled: boolean) {
    setBusy(true)
    const response = await fetch('/api/pro/dispatch/settings', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locationTrackingEnabled: enabled, locationRetentionDays: settings?.organization.locationRetentionDays ?? 60 }),
    })
    const payload = await response.json() as { error?: string }
    if (!response.ok) setError(payload.error || 'Unable to update tracking')
    await load()
  }

  async function toggleMember(memberId: string, enabled: boolean) {
    const response = await fetch('/api/pro/dispatch/settings', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId, locationSharingEnabled: enabled, locationSource: 'mobile' }),
    })
    const payload = await response.json() as { error?: string }
    if (!response.ok) setError(payload.error || 'Unable to update team member')
    await load(true)
  }

  async function geocodeMissingAddresses() {
    setBusy(true)
    const response = await fetch('/api/pro/dispatch/geocode', { method: 'POST' })
    const payload = await response.json() as { clientsUpdated?: number; poolsUpdated?: number; error?: string }
    if (!response.ok) setError(payload.error || 'Unable to geocode addresses')
    await load()
  }

  async function recommend(interventionId: string) {
    setRecommendationFor(interventionId)
    setCandidates([])
    const response = await fetch('/api/pro/dispatch/recommend', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ interventionId }),
    })
    const payload = await response.json() as { candidates?: Candidate[]; error?: string }
    if (!response.ok) {
      setError(payload.error || 'Unable to calculate recommendation')
      return
    }
    setCandidates(payload.candidates ?? [])
  }

  async function assign(interventionId: string, technicianId: string) {
    const response = await fetch(`/api/pro/interventions/${encodeURIComponent(interventionId)}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ technicianId }),
    })
    const payload = await response.json() as { error?: string }
    if (!response.ok) {
      setError(payload.error || 'Unable to assign intervention')
      return
    }
    setCandidates([])
    setRecommendationFor(null)
    await load()
  }

  if (busy && !data) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="section-label inline-flex items-center gap-1.5"><MapPinned className="h-3.5 w-3.5" />AQWELIA Pro</span>
          <h1 className="mt-2 font-display text-4xl font-bold tracking-tight sm:text-5xl">{copy.title}</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{copy.subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => { void geocodeMissingAddresses() }} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-background px-4 text-sm font-bold">
            <MapPinned className="h-4 w-4" />Géocoder les adresses
          </button>
          <button type="button" onClick={() => { void load() }} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-background px-4 text-sm font-bold">
            <RefreshCw className="h-4 w-4" />{copy.refresh}
          </button>
        </div>
      </header>

      <div className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <p>{copy.privacy}</p>
      </div>
      {error ? <div className="rounded-2xl border border-red-300 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div> : null}

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <LiveDispatchMap technicians={data?.technicians ?? []} selectedUserId={selectedUserId} missingKeyLabel={copy.mapMissing} />

        <aside className="space-y-3 rounded-[1.75rem] border border-border/60 bg-card/80 p-4">
          <button type="button" onClick={() => setSelectedUserId(null)} className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left ${selectedUserId === null ? 'border-primary/40 bg-primary/10' : 'border-border/60 bg-background'}`}>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary"><UsersRound className="h-5 w-5 text-primary" /></span>
            <span className="font-bold">{copy.allTeam}</span>
          </button>
          <div className="max-h-[460px] space-y-2 overflow-y-auto pr-1">
            {(data?.technicians ?? []).map((technician) => (
              <button key={technician.userId} type="button" onClick={() => setSelectedUserId(technician.userId)} className={`w-full rounded-2xl border p-3 text-left ${selectedUserId === technician.userId ? 'border-primary/40 bg-primary/10' : 'border-border/60 bg-background'}`}>
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-black text-white" style={{ background: technician.color }}>{technician.name.slice(0, 2).toUpperCase()}</span>
                  <span className="min-w-0 flex-1"><span className="block truncate font-bold">{technician.name}</span><span className="block truncate text-xs text-muted-foreground">{technician.vehicle || technician.role}</span></span>
                  <span className={`rounded-full border px-2 py-1 text-[10px] font-bold ${freshnessClasses(technician.location?.freshness ?? 'offline')}`}>
                    {technician.location?.freshness === 'live' ? copy.live : technician.location?.freshness === 'stale' ? copy.stale : copy.offline}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground"><span>{technician.activeCount} {copy.interventions}</span><span>{technician.urgentCount ? `${technician.urgentCount} ${copy.urgent}` : technician.location ? new Date(technician.location.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : copy.noLocation}</span></div>
              </button>
            ))}
          </div>
        </aside>
      </section>

      {selected ? (
        <section className="rounded-[1.75rem] border border-border/60 bg-card/80 p-5">
          <div className="mb-4 flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.15em] text-primary">{copy.route}</p><h2 className="font-display text-2xl font-bold">{selected.name}</h2></div><Route className="h-6 w-6 text-primary" /></div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {selected.route.map((stop) => (
              <article key={stop.id} className="relative rounded-2xl border border-border/60 bg-background p-4 pl-14">
                <span className="absolute left-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-black text-primary-foreground">{stop.sequence}</span>
                <p className="font-bold">{stop.client.companyName || `${stop.client.firstName} ${stop.client.lastName}`}</p>
                <p className="mt-1 text-xs text-muted-foreground">{stop.pool?.name || stop.client.city || '—'}</p>
                <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold"><Clock3 className="h-3.5 w-3.5" />{new Date(stop.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-[1.75rem] border border-red-300/50 bg-red-50/70 p-5">
          <div className="mb-4 flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-red-600" /><h2 className="font-display text-xl font-bold text-red-950">{copy.urgent}</h2></div>
          <div className="space-y-3">
            {urgentStops.length === 0 ? <p className="text-sm text-red-800/70">Aucune urgence non affectée.</p> : urgentStops.map((stop) => (
              <article key={stop.id} className="rounded-2xl border border-red-200 bg-white p-4">
                <p className="font-bold text-red-950">{stop.client.companyName || `${stop.client.firstName} ${stop.client.lastName}`}</p>
                <p className="mt-1 text-xs text-red-800/70">{stop.pool?.name || stop.client.city || '—'}</p>
                <button type="button" onClick={() => { void recommend(stop.id) }} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl bg-red-600 px-4 text-xs font-bold text-white"><Navigation className="h-4 w-4" />{copy.recommend}</button>
              </article>
            ))}
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-border/60 bg-card/80 p-5">
          <div className="mb-4"><p className="text-xs font-bold uppercase tracking-[0.15em] text-primary">{copy.advisory}</p><h2 className="font-display text-xl font-bold">Classement géographique et planning</h2></div>
          <div className="space-y-2">
            {candidates.map((candidate, index) => (
              <article key={candidate.userId} className="flex items-center gap-3 rounded-2xl border border-border/60 bg-background p-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl text-sm font-black text-white" style={{ background: candidate.color }}>{index + 1}</span>
                <div className="min-w-0 flex-1"><p className="truncate font-bold">{candidate.name}</p><p className="text-xs text-muted-foreground">{candidate.distanceKm} {copy.km} · {candidate.driveMinutes} {copy.minutes} · {candidate.activeInterventions} {copy.interventions}</p>{candidate.hasScheduleConflict ? <p className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-amber-700"><XCircle className="h-3.5 w-3.5" />{copy.conflict}</p> : <p className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" />Disponible</p>}</div>
                <button type="button" disabled={!recommendationFor || candidate.hasScheduleConflict} onClick={() => { if (recommendationFor) void assign(recommendationFor, candidate.userId) }} className="min-h-10 rounded-xl bg-primary px-3 text-xs font-bold text-primary-foreground disabled:opacity-40">{copy.assign}</button>
              </article>
            ))}
            {!candidates.length ? <p className="py-8 text-center text-sm text-muted-foreground">Sélectionnez une urgence pour calculer les techniciens les plus pertinents.</p> : null}
          </div>
        </div>
      </section>

      <GpsDeviceSettings members={settings?.members ?? []} />

      <section className="rounded-[1.75rem] border border-border/60 bg-card/80 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><Settings2 className="h-5 w-5 text-primary" /><div><h2 className="font-display text-xl font-bold">Paramètres de suivi</h2><p className="text-xs text-muted-foreground">{copy.retention}: {settings?.organization.locationRetentionDays ?? 60} {copy.days}</p></div></div><button type="button" onClick={() => { void updateOrganization(!settings?.organization.locationTrackingEnabled) }} className={`min-h-11 rounded-xl px-4 text-sm font-bold ${settings?.organization.locationTrackingEnabled ? 'border border-red-300 bg-red-50 text-red-700' : 'bg-primary text-primary-foreground'}`}>{settings?.organization.locationTrackingEnabled ? copy.disableTracking : copy.enableTracking}</button></div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {(settings?.members ?? []).map((member) => (
            <label key={member.id} className="flex cursor-pointer items-center gap-3 rounded-2xl border border-border/60 bg-background p-4">
              <input type="checkbox" checked={member.locationSharingEnabled} disabled={!settings?.organization.locationTrackingEnabled} onChange={(event) => { void toggleMember(member.id, event.target.checked) }} className="h-5 w-5 accent-primary" />
              <span className="min-w-0 flex-1"><span className="block truncate font-bold">{member.user.name || member.user.email}</span><span className="block text-xs text-muted-foreground">{member.locationSharingEnabled ? copy.configured : copy.notConfigured}</span></span>
              <LocateFixed className={`h-5 w-5 ${member.locationSharingEnabled ? 'text-primary' : 'text-muted-foreground'}`} />
            </label>
          ))}
        </div>
      </section>
    </div>
  )
}
