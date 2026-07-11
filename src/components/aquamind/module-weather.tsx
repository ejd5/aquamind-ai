'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import {
  CloudSun,
  CloudRain,
  CloudLightning,
  Sun,
  Wind,
  Droplets,
  Thermometer,
  RefreshCw,
  AlertTriangle,
  FlaskConical,
  ArrowRight,
  Clock,
  Umbrella,
  Snowflake,
  MapPin,
  Crosshair,
  Sparkles,
  Loader2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/hooks/use-toast'
import type { TabId } from './app-shell'

interface WeatherData {
  location: string
  currentTempC: number
  feelsLikeC: number
  humidity: number
  uvIndex: number
  windKmph: number
  precipMm: number
  weatherCode: number
  weatherDesc: string
  tomorrowMaxC: number
  tomorrowMinC: number
  tomorrowChanceRain: number
  tomorrowChanceStorm: number
  next3days: { date: string; maxC: number; chanceRain: number; desc: string; code?: number }[]
}

interface WeatherAlert {
  id: string
  type: 'storm' | 'heat' | 'rain' | 'wind' | 'uv' | 'cold'
  severity: 'low' | 'medium' | 'high' | 'extreme'
  title: string
  titleKey: string
  message: string
  messageKey: string
  messageParams?: Record<string, string | number>
  action: string
  actionKey: string
  when: string
  whenKey: string
}

interface Assessment {
  alerts: WeatherAlert[]
  filtration: {
    hoursPerDay: number
    reason: string
    reasonKey: string
    reasonParams?: Record<string, string | number>
    schedule: string
    scheduleKey: string
  }
  algaeRisk: 'low' | 'medium' | 'high' | 'extreme'
  testRecommended: boolean
  testReason: string
  testReasonKey: string
  testReasonParams?: Record<string, string | number>
  swimComfort: 'ideal' | 'good' | 'fresh' | 'cold' | 'too_cold'
  summary: string
  summaryKey: string
  summaryParams?: Record<string, string | number>
}

interface WeatherResponse {
  weather: WeatherData
  assessment: Assessment
  lastTestDaysAgo: number
  error?: string
}

interface Props {
  onNavigate?: (tab: TabId) => void
}

type SeverityKey = 'low' | 'medium' | 'high' | 'extreme'
type AlgaeKey = 'low' | 'medium' | 'high' | 'extreme'
type SwimKey = 'ideal' | 'good' | 'fresh' | 'cold' | 'too_cold'

const SEVERITY_CFG: Record<SeverityKey, { cls: string; dot: string; icon: typeof CloudSun; labelKey: 'info' | 'vigilance' | 'alert' | 'extreme' }> = {
  low: { cls: 'border-border/60 bg-secondary/40 text-muted-foreground', dot: 'bg-muted-foreground', icon: CloudSun, labelKey: 'info' },
  medium: { cls: 'border-yellow-400/40 bg-yellow-400/10 text-yellow-700 dark:text-yellow-300', dot: 'bg-yellow-500', icon: AlertTriangle, labelKey: 'vigilance' },
  high: { cls: 'border-orange-400/40 bg-orange-400/10 text-orange-700 dark:text-orange-300', dot: 'bg-orange-500', icon: AlertTriangle, labelKey: 'alert' },
  extreme: { cls: 'border-destructive/40 bg-destructive/10 text-destructive', dot: 'bg-destructive', icon: AlertTriangle, labelKey: 'extreme' },
}

const ALGAE_CFG: Record<AlgaeKey, { cls: string }> = {
  low: { cls: 'border-[oklch(0.7_0.15_155)]/40 bg-[oklch(0.7_0.15_155)]/10 text-[oklch(0.45_0.13_155)]' },
  medium: { cls: 'border-yellow-400/40 bg-yellow-400/10 text-yellow-700 dark:text-yellow-300' },
  high: { cls: 'border-orange-400/40 bg-orange-400/10 text-orange-700 dark:text-orange-300' },
  extreme: { cls: 'border-destructive/40 bg-destructive/10 text-destructive' },
}

const SWIM_CFG: Record<SwimKey, { emoji: string; cls: string; labelKey: 'ideal' | 'good' | 'fresh' | 'cold' | 'tooCold' }> = {
  ideal: { emoji: '🏊', cls: 'border-[oklch(0.7_0.15_155)]/40 bg-[oklch(0.7_0.15_155)]/10 text-[oklch(0.45_0.13_155)]', labelKey: 'ideal' },
  good: { emoji: '😊', cls: 'border-[oklch(0.7_0.15_155)]/30 bg-[oklch(0.7_0.15_155)]/5 text-foreground', labelKey: 'good' },
  fresh: { emoji: '🆒', cls: 'border-primary/30 bg-primary/10 text-primary', labelKey: 'fresh' },
  cold: { emoji: '🥶', cls: 'border-primary/40 bg-primary/15 text-primary', labelKey: 'cold' },
  too_cold: { emoji: '❄️', cls: 'border-primary/50 bg-primary/20 text-primary', labelKey: 'tooCold' },
}

function codeToIcon(code?: number) {
  if (!code) return <CloudSun className="h-8 w-8 text-muted-foreground" />
  // Storm codes: 200, 386, 389, 392, 395
  if ([200, 386, 389, 392, 395].includes(code)) return <CloudLightning className="h-8 w-8 text-gold" />
  // Rain codes: 176, 185, 263, 266, 281, 284, 293, 296, 299, 302, 305, 308, 311, 314, 353, 356, 359, 362, 365, 374, 377
  if ([176, 185, 263, 266, 281, 284, 293, 296, 299, 302, 305, 308, 311, 314, 353, 356, 359, 362, 365, 374, 377].includes(code)) return <CloudRain className="h-8 w-8 text-primary" />
  // Snow/ice codes: 179, 182, 227, 230, 230, 260, 317, 320, 323, 326, 329, 332, 335, 338, 350, 368, 371
  if ([179, 182, 227, 230, 260, 317, 320, 323, 326, 329, 332, 335, 338, 350, 368, 371].includes(code)) return <Snowflake className="h-8 w-8 text-primary" />
  // Fog/mist codes: 143, 248, 260
  if ([143, 248, 260].includes(code)) return <CloudSun className="h-8 w-8 text-muted-foreground" />
  // Cloudy codes: 119, 122
  if ([119, 122].includes(code)) return <CloudSun className="h-8 w-8 text-muted-foreground" />
  // Sunny codes: 113
  if (code === 113) return <Sun className="h-8 w-8 text-gold" />
  // Partly cloudy: 116
  if (code === 116) return <CloudSun className="h-8 w-8 text-muted-foreground" />
  return <CloudSun className="h-8 w-8 text-muted-foreground" />
}

function alertTypeIcon(type: WeatherAlert['type']) {
  switch (type) {
    case 'storm':
      return <CloudLightning className="h-4 w-4" />
    case 'heat':
      return <Thermometer className="h-4 w-4" />
    case 'rain':
      return <Umbrella className="h-4 w-4" />
    case 'wind':
      return <Wind className="h-4 w-4" />
    case 'uv':
      return <Sun className="h-4 w-4" />
    case 'cold':
      return <Snowflake className="h-4 w-4" />
    default:
      return <AlertTriangle className="h-4 w-4" />
  }
}

interface LoadOpts {
  location?: string
  lat?: number
  lon?: number
}

export function ModuleWeather({ onNavigate }: Props) {
  const t = useTranslations('weather')
  const locale = useLocale()
  const [data, setData] = useState<WeatherResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [locationInput, setLocationInput] = useState('')
  const [locating, setLocating] = useState(false)
  const [savingLocation, setSavingLocation] = useState(false)

  const load = useCallback(async (opts?: LoadOpts): Promise<WeatherResponse | null> => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (typeof opts?.lat === 'number' && typeof opts?.lon === 'number') {
        params.set('lat', String(opts.lat))
        params.set('lon', String(opts.lon))
      } else if (opts?.location) {
        params.set('location', opts.location)
      }
      const qs = params.toString()
      const url = qs ? `/api/pool/weather?${qs}` : '/api/pool/weather'
      const res = await fetch(url)
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || t('unavailable'))
      setData(d)
      return d
    } catch (e) {
      setError(e instanceof Error ? e.message : t('unavailable'))
      setData(null)
      return null
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    load()
  }, [load])

  // Géolocalisation GPS du navigateur (ou Capacitor Geolocation sur mobile)
  function handleGeolocate() {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      toast({
        title: t('geoUnsupported'),
        description: t('geoUnsupportedDesc'),
        variant: 'destructive',
      })
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        try {
          const fresh = await load({ lat: latitude, lon: longitude })
          // Persiste les coordonnées dans le profil pour les prochaines visites
          await fetch('/api/pool/profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ region: `${latitude.toFixed(4)},${longitude.toFixed(4)}` }),
          }).catch(() => {/* non bloquant */})
          toast({
            title: t('locationDetected'),
            description: fresh?.weather?.location || t('locationDetectedDesc'),
          })
        } catch {
          toast({
            title: t('unavailable'),
            description: t('geoErrorDesc'),
            variant: 'destructive',
          })
        } finally {
          setLocating(false)
        }
      },
      (err) => {
        setLocating(false)
        const msg = err.code === err.PERMISSION_DENIED
          ? t('permissionDeniedDesc')
          : t('geoErrorRetry')
        toast({
          title: t('locationDenied'),
          description: msg,
          variant: 'destructive',
        })
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    )
  }

  // Sauvegarde la ville saisie dans le profil + recharge la météo
  async function submitLocation() {
    const city = locationInput.trim()
    if (!city) return
    setSavingLocation(true)
    try {
      await fetch('/api/pool/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ region: city }),
      }).catch(() => {/* non bloquant */})
      await load({ location: city })
      toast({ title: t('citySaved'), description: t('citySavedDesc', { city }) })
      setLocationInput('')
    } catch {
      toast({
        title: t('error'),
        description: t('cityErrorDesc'),
        variant: 'destructive',
      })
    } finally {
      setSavingLocation(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-48" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
        <Skeleton className="h-32" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="space-y-5">
        <Header t={t} />
        <Card className="glass-card">
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <AlertTriangle className="h-8 w-8 text-destructive" />
            <p className="font-display text-lg">{t('unavailableTitle')}</p>
            <p className="max-w-md text-sm text-muted-foreground">
              {error || t('unavailableDesc')}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button onClick={() => load()} className="bg-gradient-to-r from-primary to-gold text-primary-foreground">
                <RefreshCw className="h-4 w-4" />
                {t('retry')}
              </Button>
            </div>
            <div className="mt-2 flex w-full max-w-sm items-center gap-2">
              <Input
                placeholder={t('cityPlaceholder')}
                value={locationInput}
                onChange={(e) => setLocationInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submitLocation()}
              />
              <Button onClick={submitLocation} variant="outline">
                <MapPin className="h-4 w-4" />
              </Button>
            </div>
            <Button
              onClick={handleGeolocate}
              variant="outline"
              size="sm"
              disabled={locating}
              className="border-gold/40 text-gold hover:bg-gold/10"
            >
              {locating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Crosshair className="h-4 w-4" />
              )}
              {t('autoLocate')}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { weather, assessment } = data
  const topAlert = assessment.alerts[0]
  const algae = ALGAE_CFG[assessment.algaeRisk]
  const swim = SWIM_CFG[assessment.swimComfort]

  return (
    <div className="space-y-5">
      <Header
        t={t}
        right={
          <Button
            variant="outline"
            size="sm"
            onClick={() => load(locationInput.trim() ? { location: locationInput.trim() } : undefined)}
            className="border-border/60"
            disabled={loading || locating}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {t('refresh')}
          </Button>
        }
      />

      {/* Location controls : GPS + saisie manuelle */}
      <Card className="glass-card">
        <CardContent className="flex flex-col gap-3 py-3">
          <div className="flex flex-1 items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 text-gold" />
            <span className="font-medium text-foreground">{weather.location}</span>
            <span className="text-xs">· {t('realWeatherHint')}</span>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button
              onClick={handleGeolocate}
              variant="outline"
              size="sm"
              disabled={locating || savingLocation}
              className="border-gold/40 text-gold hover:bg-gold/10"
            >
              {locating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Crosshair className="h-4 w-4" />
              )}
              {locating ? t('locating') : t('locateMe')}
            </Button>
            <div className="flex flex-1 items-center gap-2">
              <Input
                placeholder={t('enterCity')}
                value={locationInput}
                onChange={(e) => setLocationInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submitLocation()}
                className="h-9"
                disabled={savingLocation}
              />
              <Button
                onClick={submitLocation}
                size="sm"
                disabled={savingLocation || !locationInput.trim()}
                className="bg-gradient-to-r from-primary to-gold text-primary-foreground"
              >
                {savingLocation ? <Loader2 className="h-4 w-4 animate-spin" /> : t('apply')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test recommended banner */}
      {assessment.testRecommended && (
        <Card className="border-gold/40 bg-gold/5">
          <CardContent className="flex flex-col items-start gap-3 py-4 sm:flex-row sm:items-center">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold/15">
              <FlaskConical className="h-5 w-5 text-gold" />
            </div>
            <div className="flex-1">
              <p className="font-display text-sm font-bold text-gold">{t('testRecommended')}</p>
              <p className="text-xs text-foreground/80">{t(assessment.testReasonKey as any, assessment.testReasonParams)}</p>
            </div>
            {onNavigate && (
              <Button
                size="sm"
                onClick={() => onNavigate('water')}
                className="border-gold/40 bg-gold/10 text-gold hover:bg-gold/20"
                variant="outline"
              >
                <FlaskConical className="h-3.5 w-3.5" />
                {t('enterMeasures')}
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Current conditions + swim comfort + algae */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Current */}
        <Card className="glass-card lg:col-span-2">
          <CardHeader className="pb-2">
            <CardDescription>{t('currentConditions')}</CardDescription>
            <CardTitle className="flex items-center justify-between font-display text-base">
              <span>{t('nowAt', { location: weather.location })}</span>
              {codeToIcon(weather.weatherCode)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-end gap-6">
              <div>
                <p className="font-display text-5xl font-bold text-primary">{weather.currentTempC}°C</p>
                <p className="text-xs text-muted-foreground">
                  {t('feelsLike')} {weather.feelsLikeC}°C · {t(`codes.${weather.weatherCode}`)}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
                <Metric icon={<Droplets className="h-3.5 w-3.5 text-primary" />} label={t('humidity')} value={`${weather.humidity}%`} />
                <Metric icon={<Sun className="h-3.5 w-3.5 text-gold" />} label={t('uvShort')} value={`${weather.uvIndex}`} />
                <Metric icon={<Wind className="h-3.5 w-3.5 text-primary" />} label={t('wind')} value={`${weather.windKmph} km/h`} />
                <Metric icon={<Umbrella className="h-3.5 w-3.5 text-primary" />} label={t('precipShort')} value={`${weather.precipMm} mm`} />
                <Metric icon={<Thermometer className="h-3.5 w-3.5 text-gold" />} label={t('tomorrow')} value={`${weather.tomorrowMinC}–${weather.tomorrowMaxC}°C`} />
                <Metric icon={<CloudRain className="h-3.5 w-3.5 text-primary" />} label={t('rainTomorrow')} value={`${weather.tomorrowChanceRain}%`} />
              </div>
            </div>
            <p className="mt-3 rounded-lg border border-border/40 bg-background/40 p-2.5 text-xs leading-relaxed text-foreground/80">
              {t(assessment.summaryKey as any, assessment.summaryParams)}
            </p>
          </CardContent>
        </Card>

        {/* Right column: swim + algae */}
        <div className="space-y-4">
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardDescription>{t('swimComfort')}</CardDescription>
              <CardTitle className="font-display text-base">{t('estimatedWater')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`flex items-center gap-3 rounded-xl border p-3 ${swim.cls}`}>
                <span className="text-3xl">{swim.emoji}</span>
                <div>
                  <p className="font-display text-lg font-bold">{t(`swim.${swim.labelKey}`)}</p>
                  <p className="text-[10px] uppercase tracking-wide opacity-80">
                    {t('filtrationPerDay', { hours: assessment.filtration.hoursPerDay })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-gold" />
                {t('algaeRisk')}
              </CardDescription>
              <CardTitle className="font-display text-base">{t('vigilanceLevel')}</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant="outline" className={`px-3 py-1 text-sm font-bold ${algae.cls}`}>
                {t(`algae.${assessment.algaeRisk}`)}
              </Badge>
              <p className="mt-2 text-[11px] text-muted-foreground">
                {t('algaeRiskDesc')}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Weather alerts — the differentiator */}
      {assessment.alerts.length > 0 && (
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 font-display text-base">
              <AlertTriangle className="h-4 w-4 text-gold" />
              {t('poolWeatherAlerts')}
              <Badge variant="outline" className="ml-1 border-gold/40 text-gold">
                {assessment.alerts.length}
              </Badge>
            </CardTitle>
            <CardDescription className="text-xs">
              {t('alertsDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {assessment.alerts.map((a) => {
              const cfg = SEVERITY_CFG[a.severity] || SEVERITY_CFG.medium
              return (
                <div
                  key={a.id}
                  className={`relative overflow-hidden rounded-xl border p-3 ${cfg.cls}`}
                >
                  <span className={`absolute left-0 top-0 h-full w-1 ${cfg.dot}`} />
                  <div className="pl-2">
                    <div className="flex items-center gap-2">
                      <span className="text-current">{alertTypeIcon(a.type)}</span>
                      <p className="font-display text-sm font-bold">{t(a.titleKey as any)}</p>
                      <Badge variant="outline" className={`ml-auto text-[9px] uppercase tracking-wide ${cfg.cls}`}>
                        {t(`severity.${cfg.labelKey}`)}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed opacity-90">{t(a.messageKey as any, a.messageParams)}</p>
                    <div className="mt-2 rounded-lg bg-background/60 p-2 text-xs">
                      <p className="font-semibold text-foreground">
                        <Sparkles className="mr-1 inline h-3 w-3 text-gold" />
                        {t('actionLabel')} : {t(a.actionKey as any)}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {t('whenLabel')} : {t(a.whenKey as any)}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* Filtration recommandée */}
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardDescription className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-primary" />
            {t('recommendedFiltration')}
          </CardDescription>
          <CardTitle className="font-display text-base">{t('optimalDailyDuration')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <p className="font-display text-5xl font-bold text-gold">
              {assessment.filtration.hoursPerDay}
              <span className="ml-1 text-lg text-muted-foreground">{t('hoursPerDayShort')}</span>
            </p>
            <div className="flex-1">
              <p className="text-xs text-foreground/80">{t(assessment.filtration.reasonKey as any, assessment.filtration.reasonParams)}</p>
              <p className="mt-1 rounded-md bg-secondary/60 p-2 text-xs text-muted-foreground">
                {t(assessment.filtration.scheduleKey as any)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3-day forecast */}
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-base">{t('forecast3days')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2">
            {weather.next3days.map((d, i) => (
              <div
                key={i}
                className="flex flex-col items-center gap-1 rounded-xl border border-border/50 bg-background/40 p-3 text-center"
              >
                <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {i === 0 ? t('today') : i === 1 ? t('tomorrow') : new Date(d.date).toLocaleDateString(locale, { weekday: 'short' })}
                </span>
                <span className="text-2xl">{codeToIcon(d.code)}</span>
                <span className="font-display text-lg font-bold text-primary">{d.maxC}°C</span>
                <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                  <CloudRain className="h-3 w-3" />
                  {d.chanceRain}%
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {d.code ? t(`codes.${d.code}`) : ''}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Last test info */}
      <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
        <FlaskConical className="h-3 w-3 text-primary" />
        {t('lastWaterTest')} {data.lastTestDaysAgo >= 999 ? t('never') : t('daysAgo', { n: data.lastTestDaysAgo })}
        {onNavigate && (
          <button
            onClick={() => onNavigate('reminders')}
            className="ml-2 underline-offset-2 hover:underline"
          >
            {t('seeReminders')}
          </button>
        )}
      </div>
    </div>
  )
}

function Header({ t, right }: { t: ReturnType<typeof useTranslations>; right?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <div className="flex items-center gap-2">
          <span className="section-label">{t('smartWeather')}</span>
          <span className="h-px w-8 bg-gold/40" />
        </div>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight sm:text-4xl">
          {t('weatherPoolAdvice')}
        </h1>
        <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
          {t('subtitle')}
        </p>
      </div>
      {right}
    </div>
  )
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-muted-foreground">{icon}</span>
      <div>
        <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="font-display text-sm font-bold">{value}</p>
      </div>
    </div>
  )
}
