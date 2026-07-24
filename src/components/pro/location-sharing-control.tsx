'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { Geolocation, type CallbackID, type Position } from '@capacitor/geolocation'
import { Loader2, LocateFixed, Pause, Play, Square } from 'lucide-react'
import type { PRO_LIVE_DISPATCH_COPY } from '@/i18n/locales/pro-live-dispatch-copy'

type Copy = (typeof PRO_LIVE_DISPATCH_COPY)[keyof typeof PRO_LIVE_DISPATCH_COPY]

type TrackingSession = {
  id: string
  status: 'active' | 'paused' | 'stopped'
  autoStopAt: string
}

type SessionPayload = {
  trackingAvailable: boolean
  memberEnabled: boolean
  noticeAcknowledged: boolean
  activeSession: TrackingSession | null
}

export function LocationSharingControl({ copy }: { copy: Copy }) {
  const [state, setState] = useState<SessionPayload | null>(null)
  const [acknowledged, setAcknowledged] = useState(false)
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastSentAt, setLastSentAt] = useState<string | null>(null)
  const nativeWatchId = useRef<CallbackID | null>(null)
  const browserWatchId = useRef<number | null>(null)
  const sessionIdRef = useRef<string | null>(null)
  const lastUploadRef = useRef(0)

  const load = useCallback(async () => {
    setBusy(true)
    try {
      const response = await fetch('/api/pro/location/session', { cache: 'no-store' })
      const payload = await response.json() as SessionPayload & { error?: string }
      if (!response.ok) throw new Error(payload.error || 'Unable to load tracking session')
      setState(payload)
      setAcknowledged(payload.noticeAcknowledged)
      sessionIdRef.current = payload.activeSession?.id ?? null
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load tracking session')
    } finally {
      setBusy(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const upload = useCallback(async (position: Position | GeolocationPosition) => {
    const sessionId = sessionIdRef.current
    if (!sessionId) return
    const now = Date.now()
    if (now - lastUploadRef.current < 12_000) return
    lastUploadRef.current = now
    const coords = position.coords
    const response = await fetch('/api/pro/location/points', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        points: [{
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
          altitude: coords.altitude,
          speed: coords.speed,
          heading: coords.heading,
          recordedAt: new Date(position.timestamp).toISOString(),
        }],
      }),
    })
    if (response.ok) setLastSentAt(new Date().toISOString())
  }, [])

  const clearWatch = useCallback(async () => {
    if (nativeWatchId.current) {
      await Geolocation.clearWatch({ id: nativeWatchId.current }).catch(() => undefined)
      nativeWatchId.current = null
    }
    if (browserWatchId.current != null) {
      navigator.geolocation.clearWatch(browserWatchId.current)
      browserWatchId.current = null
    }
  }, [])

  const beginWatch = useCallback(async () => {
    await clearWatch()
    if (Capacitor.isNativePlatform()) {
      const permission = await Geolocation.requestPermissions()
      if (!['granted', 'limited'].includes(permission.location)) throw new Error('Location permission denied')
      nativeWatchId.current = await Geolocation.watchPosition({
        enableHighAccuracy: true,
        timeout: 15_000,
        maximumAge: 5_000,
      }, (position, watchError) => {
        if (watchError) {
          setError(watchError.message)
          return
        }
        if (position) void upload(position)
      })
      return
    }
    if (!navigator.geolocation) throw new Error('Geolocation is not supported on this device')
    browserWatchId.current = navigator.geolocation.watchPosition(
      (position) => { void upload(position) },
      (watchError) => setError(watchError.message),
      { enableHighAccuracy: true, maximumAge: 5_000, timeout: 15_000 },
    )
  }, [clearWatch, upload])

  useEffect(() => {
    if (state?.activeSession?.status === 'active') void beginWatch().catch((cause) => setError(cause instanceof Error ? cause.message : 'Location unavailable'))
    return () => { void clearWatch() }
  }, [beginWatch, clearWatch, state?.activeSession?.status])

  async function sessionAction(action: 'start' | 'pause' | 'resume' | 'stop') {
    setBusy(true)
    setError(null)
    try {
      const response = await fetch('/api/pro/location/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, acknowledgeNotice: acknowledged, source: 'mobile' }),
      })
      const payload = await response.json() as { session?: TrackingSession | null; error?: string }
      if (!response.ok) throw new Error(payload.error || 'Unable to update tracking session')
      if (action === 'stop' || action === 'pause') await clearWatch()
      sessionIdRef.current = payload.session?.id ?? null
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to update tracking session')
      setBusy(false)
    }
  }

  if (busy && !state) {
    return <div className="flex min-h-56 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
  }

  const available = state?.trackingAvailable && state.memberEnabled
  const status = state?.activeSession?.status
  return (
    <section className="rounded-[1.75rem] border border-border/60 bg-card/80 p-5 shadow-sm sm:p-7">
      <div className="flex items-start gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <LocateFixed className="h-6 w-6" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">{copy.sharingTitle}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{copy.sharingSubtitle}</p>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm text-foreground">
        <p>{copy.privacy}</p>
        <p className="mt-2 text-xs text-muted-foreground">{copy.foreground}</p>
      </div>

      {!available ? (
        <div className="mt-5 rounded-2xl border border-amber-300/50 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
          {copy.unavailable}
        </div>
      ) : null}

      {available && !state?.noticeAcknowledged && !status ? (
        <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-2xl border border-border/60 bg-background p-4 text-sm">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(event) => setAcknowledged(event.target.checked)}
            className="mt-1 h-5 w-5 accent-primary"
          />
          <span>{copy.notice}</span>
        </label>
      ) : null}

      {error ? <p className="mt-4 rounded-xl bg-red-500/10 p-3 text-sm text-red-700">{error}</p> : null}
      {lastSentAt ? (
        <p className="mt-4 text-xs font-semibold text-muted-foreground">
          {copy.sent}: {new Date(lastSentAt).toLocaleTimeString()}
        </p>
      ) : null}

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {!status ? (
          <button
            type="button"
            disabled={!available || !acknowledged || busy}
            onClick={() => { void sessionAction('start') }}
            className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-primary px-5 font-bold text-primary-foreground disabled:opacity-40"
          >
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Play className="h-5 w-5" />}
            {copy.start}
          </button>
        ) : null}
        {status === 'active' ? (
          <button type="button" disabled={busy} onClick={() => { void sessionAction('pause') }} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-border bg-background px-5 font-bold">
            <Pause className="h-5 w-5" />{copy.pause}
          </button>
        ) : null}
        {status === 'paused' ? (
          <button type="button" disabled={busy} onClick={() => { void sessionAction('resume') }} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-primary px-5 font-bold text-primary-foreground">
            <Play className="h-5 w-5" />{copy.resume}
          </button>
        ) : null}
        {status ? (
          <button type="button" disabled={busy} onClick={() => { void sessionAction('stop') }} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-red-300 bg-red-50 px-5 font-bold text-red-700">
            <Square className="h-5 w-5" />{copy.stop}
          </button>
        ) : null}
      </div>
    </section>
  )
}
