'use client'

/**
 * AQWELIA Home™ — IoT settings section.
 *
 * Card grid of supported providers (ICO / iopool / ESPHome), with a "Connect"
 * button that opens a config form. Lists already-connected sensors with their
 * status + last sync, and a "Sync now" button (POST ?sync=1) and delete button.
 *
 * For v1: no real API connection — the config is saved but only stubbed data
 * is returned on sync. UI surfaces a "Coming soon" badge.
 *
 * i18n: all visible strings come from the `iot` namespace.
 */
import { useCallback, useEffect, useState } from 'react'
import { Cpu, X, Plus, Loader2, CheckCircle2, RefreshCw, Trash2, AlertTriangle, Clock } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/hooks/use-toast'

interface ProviderMeta {
  id: 'ico' | 'iopool' | 'esphome'
  labelKey: string
  descKey: string
  icon: string
  requiresApiUrl: boolean
  requiresDeviceId: boolean
}

interface Sensor {
  id: string
  provider: string
  label: string
  deviceId?: string | null
  apiUrl?: string | null
  hasApiKey: boolean
  status: 'connected' | 'disconnected' | 'error'
  lastSyncAt?: string | null
  createdAt: string
}

interface IotSettingsProps {
  /** Optional poolId — sensors linked to this pool are shown first. */
  poolId?: string | null
}

export function IotSettings({ poolId }: IotSettingsProps) {
  const t = useTranslations('iot')
  const tc = useTranslations('common')
  const [sensors, setSensors] = useState<Sensor[]>([])
  const [providers, setProviders] = useState<ProviderMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [activeProvider, setActiveProvider] = useState<ProviderMeta | null>(null)
  const [form, setForm] = useState({
    label: '',
    deviceId: '',
    apiUrl: '',
    apiKey: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [syncingId, setSyncingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/pool/iot', { cache: 'no-store' })
      if (!res.ok) throw new Error('fetch failed')
      const data = await res.json()
      setSensors(data.sensors || [])
      setProviders(data.providers || [])
    } catch {
      setSensors([])
      setProviders([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  function openProvider(p: ProviderMeta) {
    setActiveProvider(p)
    setForm({ label: '', deviceId: '', apiUrl: '', apiKey: '' })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!activeProvider) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/pool/iot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: activeProvider.id,
          label: form.label.trim(),
          deviceId: form.deviceId.trim() || null,
          apiUrl: form.apiUrl.trim() || null,
          apiKey: form.apiKey.trim() || null,
          poolId: poolId || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast({ title: tc('error'), description: data?.error || t('connectError'), variant: 'destructive' })
        return
      }
      toast({ title: t('connectedSuccess') })
      setActiveProvider(null)
      load()
    } catch {
      toast({ title: t('connectError'), variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSync(sensorId: string) {
    setSyncingId(sensorId)
    try {
      const res = await fetch(`/api/pool/iot?id=${encodeURIComponent(sensorId)}&sync=1`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: sensorId }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast({ title: tc('error'), description: data?.error || t('syncError'), variant: 'destructive' })
        return
      }
      toast({ title: t('syncSuccess') })
      load()
    } finally {
      setSyncingId(null)
    }
  }

  async function handleDelete(sensorId: string) {
    setDeletingId(sensorId)
    try {
      const res = await fetch(`/api/pool/iot?id=${encodeURIComponent(sensorId)}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        toast({ title: tc('error'), description: data?.error || t('connectError'), variant: 'destructive' })
        return
      }
      toast({ title: t('disconnectedSuccess') })
      setSensors((s) => s.filter((x) => x.id !== sensorId))
    } finally {
      setDeletingId(null)
    }
  }

  const providerLabel = (id: string) => {
    const map: Record<string, string> = {
      ico: t('providerIco'),
      iopool: t('providerIopool'),
      esphome: t('providerEsphome'),
    }
    return map[id] || id
  }

  const statusBadge = (status: Sensor['status']) => {
    if (status === 'connected') {
      return (
        <Badge className="border-[oklch(0.7_0.15_155)]/40 bg-[oklch(0.7_0.15_155)]/10 text-[oklch(0.4_0.13_155)]">
          <CheckCircle2 className="mr-1 h-3 w-3" />
          {t('connected')}
        </Badge>
      )
    }
    if (status === 'error') {
      return (
        <Badge className="border-destructive/40 bg-destructive/10 text-destructive">
          <AlertTriangle className="mr-1 h-3 w-3" />
          {t('syncError')}
        </Badge>
      )
    }
    return (
      <Badge variant="outline" className="text-muted-foreground">
        {t('disconnected')}
      </Badge>
    )
  }

  const formatLastSync = (lastSyncAt?: string | null) => {
    if (!lastSyncAt) return t('lastSyncNever')
    try {
      const d = new Date(lastSyncAt)
      return t('lastSync', {
        date: new Intl.DateTimeFormat(undefined, {
          dateStyle: 'short',
          timeStyle: 'short',
        }).format(d),
      })
    } catch {
      return t('lastSyncNever')
    }
  }

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <CardDescription className="flex items-center gap-1.5">
          <Cpu className="h-3.5 w-3.5 text-gold" />
          {t('subtitle')}
        </CardDescription>
        <CardTitle className="flex items-center gap-1.5 font-display text-base">
          <Cpu className="h-4 w-4 text-gold" />
          {t('title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connected sensors list */}
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {t('providersSupported')}
          </p>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : sensors.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/60 bg-secondary/20 p-5 text-center">
              <Cpu className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
              <p className="text-sm font-medium">{t('noSensors')}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{t('noSensorsDesc')}</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {sensors.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center gap-3 rounded-xl border border-border/50 bg-background/60 p-2.5"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary/70 to-gold/70 text-xs font-bold text-white">
                    {s.provider.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{s.label}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {providerLabel(s.provider)}
                      {s.deviceId ? ` · ${s.deviceId}` : ''}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Clock className="h-2.5 w-2.5" />
                      {formatLastSync(s.lastSyncAt)}
                    </p>
                  </div>
                  {statusBadge(s.status)}
                  <button
                    onClick={() => handleSync(s.id)}
                    disabled={syncingId === s.id}
                    aria-label={t('syncNow')}
                    title={t('syncNow')}
                    className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground disabled:opacity-50"
                  >
                    {syncingId === s.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(s.id)}
                    disabled={deletingId === s.id}
                    aria-label={t('delete')}
                    title={t('delete')}
                    className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                  >
                    {deletingId === s.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Provider grid */}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {providers.map((p) => (
            <button
              key={p.id}
              onClick={() => openProvider(p)}
              className="group flex flex-col items-start gap-1 rounded-xl border border-border/50 bg-background/40 p-3 text-left transition-all hover:border-gold/40 hover:bg-gold/5"
            >
              <span className="text-2xl">{p.icon}</span>
              <p className="text-xs font-semibold">{t(p.labelKey as any)}</p>
              <p className="text-[10px] leading-snug text-muted-foreground">{t(p.descKey as any)}</p>
              <span className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-gold opacity-0 transition-opacity group-hover:opacity-100">
                <Plus className="h-3 w-3" />
                {t('connect')}
              </span>
            </button>
          ))}
        </div>

        <div className="rounded-lg border border-gold/30 bg-gold/5 p-2.5 text-[10px] text-muted-foreground">
          <p className="font-semibold text-gold">{t('comingSoon')}</p>
          <p className="mt-0.5">{t('comingSoonDesc')}</p>
        </div>
      </CardContent>

      {/* Config modal */}
      {activeProvider && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[100] flex items-end justify-center bg-background/80 backdrop-blur-2xl sm:items-center"
          onClick={() => setActiveProvider(null)}
        >
          <div
            className="relative w-full max-w-md overflow-hidden rounded-t-3xl border border-gold/20 bg-background/95 shadow-2xl sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent" />
            <button
              onClick={() => setActiveProvider(null)}
              aria-label={tc('close')}
              className="absolute right-3 top-3 z-10 rounded-full bg-secondary/60 p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="border-b border-border/40 px-5 py-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{activeProvider.icon}</span>
                <div>
                  <h2 className="font-display text-lg font-bold tracking-tight">
                    {t(activeProvider.labelKey as any)}
                  </h2>
                  <p className="text-[11px] text-muted-foreground">{t(activeProvider.descKey as any)}</p>
                </div>
              </div>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3 px-5 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="iot-label" className="text-xs">{t('configLabel')}</Label>
                <Input
                  id="iot-label"
                  value={form.label}
                  onChange={(e) => setForm({ ...form, label: e.target.value })}
                  placeholder={t('configPlaceholder')}
                  required
                  className="input-glass"
                />
              </div>
              {activeProvider.requiresDeviceId && (
                <div className="space-y-1.5">
                  <Label htmlFor="iot-device" className="text-xs">{t('deviceIdLabel')}</Label>
                  <Input
                    id="iot-device"
                    value={form.deviceId}
                    onChange={(e) => setForm({ ...form, deviceId: e.target.value })}
                    placeholder={t('deviceIdPlaceholder')}
                    className="input-glass"
                  />
                </div>
              )}
              {activeProvider.requiresApiUrl && (
                <div className="space-y-1.5">
                  <Label htmlFor="iot-url" className="text-xs">{t('apiUrlLabel')}</Label>
                  <Input
                    id="iot-url"
                    value={form.apiUrl}
                    onChange={(e) => setForm({ ...form, apiUrl: e.target.value })}
                    placeholder={t('apiUrlPlaceholder')}
                    className="input-glass"
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="iot-key" className="text-xs">{t('apiKeyLabel')}</Label>
                <Input
                  id="iot-key"
                  type="password"
                  value={form.apiKey}
                  onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                  placeholder={t('apiKeyPlaceholder')}
                  required
                  className="input-glass"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setActiveProvider(null)}
                  className="flex-1"
                  disabled={submitting}
                >
                  {t('cancel')}
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-gradient-to-r from-primary to-gold text-primary-foreground"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t('syncing')}
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      {t('save')}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Card>
  )
}
