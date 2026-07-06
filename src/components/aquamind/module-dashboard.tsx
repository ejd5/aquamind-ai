'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Camera,
  Droplets,
  MessageSquare,
  Siren,
  Sparkles,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Activity,
  FlaskConical,
  ArrowRight,
  RefreshCw,
  CloudSun,
  Bell,
  Umbrella,
  Sun,
  CloudRain,
  CloudLightning,
  Wind,
  Thermometer,
  Snowflake,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import type { TabId } from './app-shell'
import { evaluateParam } from '@/lib/pool/targets'

interface DashboardData {
  profile: any
  latestTest: any | null
  latestPlan: any | null
  clearWaterIndex: number | null
  clarity: { label: string; status: string; color: string } | null
  swim: { status: string; reasons: string[] } | null
  testsCount: number
  trend: any[]
  diagnosticsCount: number
  latestDiagnostic: any | null
  equipmentCount: number
  productsCount: number
  chatCount: number
}

interface Props {
  onNavigate: (tab: TabId) => void
  onOpenEmergency: () => void
  onAskAssistant: (q: string) => void
}

const CLARITY_COLORS: Record<string, string> = {
  ok: 'from-[oklch(0.7_0.15_155)] to-[oklch(0.55_0.13_195)]',
  warning: 'from-yellow-400 to-amber-500',
  critical: 'from-destructive to-[oklch(0.4_0.18_25)]',
  yellow: 'from-yellow-400 to-amber-500',
  orange: 'from-orange-400 to-orange-600',
  accent: 'from-[oklch(0.7_0.15_155)] to-[oklch(0.55_0.13_195)]',
  destructive: 'from-destructive to-[oklch(0.4_0.18_25)]',
}

const SWIM_CONFIG: Record<string, { label: string; cls: string; dot: string }> = {
  allowed: {
    label: 'Baignade autorisée',
    cls: 'border-[oklch(0.7_0.15_155)]/30 bg-[oklch(0.7_0.15_155)]/10 text-[oklch(0.4_0.13_155)]',
    dot: 'bg-[oklch(0.7_0.15_155)]',
  },
  avoid: {
    label: 'Baignade déconseillée',
    cls: 'border-yellow-400/30 bg-yellow-400/10 text-yellow-700 dark:text-yellow-300',
    dot: 'bg-yellow-500',
  },
  forbidden: {
    label: 'Baignade interdite',
    cls: 'border-destructive/30 bg-destructive/10 text-destructive',
    dot: 'bg-destructive',
  },
  unknown: {
    label: 'Baignade à confirmer',
    cls: 'border-border bg-muted text-muted-foreground',
    dot: 'bg-muted-foreground',
  },
}

function statusDotColor(status: string) {
  switch (status) {
    case 'ok':
      return 'bg-[oklch(0.7_0.15_155)]'
    case 'low_warning':
    case 'high_warning':
      return 'bg-yellow-500'
    case 'low_critical':
    case 'high_critical':
      return 'bg-destructive'
    default:
      return 'bg-muted-foreground'
  }
}

function Gauge({ value, label, color }: { value: number; label: string; color: string }) {
  const pct = Math.max(0, Math.min(100, value))
  const radius = 56
  const circ = 2 * Math.PI * radius
  const offset = circ - (pct / 100) * circ
  return (
    <div className="relative flex h-44 w-44 items-center justify-center">
      <svg className="h-44 w-44 -rotate-90" viewBox="0 0 128 128">
        <circle
          cx="64"
          cy="64"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="10"
          className="text-muted/40"
        />
        <circle
          cx="64"
          cy="64"
          r={radius}
          fill="none"
          stroke="url(#gaugeGrad)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />
        <defs>
          <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop
              offset="0%"
              stopColor={
                color === 'accent'
                  ? 'oklch(0.7 0.15 155)'
                  : color === 'yellow'
                    ? 'oklch(0.78 0.15 85)'
                    : color === 'orange'
                      ? 'oklch(0.7 0.16 60)'
                      : 'oklch(0.58 0.22 27)'
              }
            />
            <stop
              offset="100%"
              stopColor={
                color === 'accent'
                  ? 'oklch(0.55 0.13 195)'
                  : color === 'yellow'
                    ? 'oklch(0.7 0.16 60)'
                    : color === 'orange'
                      ? 'oklch(0.6 0.2 35)'
                      : 'oklch(0.4 0.2 20)'
              }
            />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="font-display text-4xl font-bold tracking-tight">{value}</span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          / 100
        </span>
      </div>
    </div>
  )
}

interface WeatherLite {
  weather?: { location?: string; currentTempC?: number; weatherDesc?: string } | null
  assessment?: {
    alerts: { id: string; type: string; severity: 'low' | 'medium' | 'high' | 'extreme'; title: string; message: string; action: string }[]
    algaeRisk?: 'low' | 'medium' | 'high' | 'extreme'
  } | null
}

interface ReminderLite {
  id: string
  type: string
  title: string
  detail: string
  action: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  dueInHours: number
  source: string
}

const WEATHER_ALERT_CFG: Record<string, { cls: string; dot: string; icon: typeof CloudSun }> = {
  low: { cls: 'border-border/60 bg-secondary/40 text-muted-foreground', dot: 'bg-muted-foreground', icon: CloudSun },
  medium: { cls: 'border-yellow-400/40 bg-yellow-400/10 text-yellow-700 dark:text-yellow-300', dot: 'bg-yellow-500', icon: Sun },
  high: { cls: 'border-orange-400/40 bg-orange-400/10 text-orange-700 dark:text-orange-300', dot: 'bg-orange-500', icon: AlertTriangle },
  extreme: { cls: 'border-destructive/40 bg-destructive/10 text-destructive', dot: 'bg-destructive', icon: AlertTriangle },
}

const REMINDER_PRIO: Record<string, { cls: string; stripe: string; label: string }> = {
  urgent: { cls: 'text-destructive', stripe: 'bg-destructive', label: 'Urgent' },
  high: { cls: 'text-orange-600 dark:text-orange-300', stripe: 'bg-orange-500', label: "Aujourd'hui" },
  medium: { cls: 'text-primary', stripe: 'bg-primary', label: 'Cette semaine' },
  low: { cls: 'text-muted-foreground', stripe: 'bg-muted-foreground', label: 'Plus tard' },
}

function weatherAlertIcon(type: string) {
  switch (type) {
    case 'storm': return CloudLightning
    case 'heat': return Thermometer
    case 'rain': return Umbrella
    case 'wind': return Wind
    case 'uv': return Sun
    case 'cold': return Snowflake
    default: return CloudRain
  }
}

export function ModuleDashboard({ onNavigate, onOpenEmergency, onAskAssistant }: Props) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [weather, setWeather] = useState<WeatherLite | null>(null)
  const [reminders, setReminders] = useState<ReminderLite[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [dashRes, wxRes, remRes] = await Promise.allSettled([
        fetch('/api/dashboard').then((r) => r.json()),
        fetch('/api/pool/weather').then((r) => (r.ok ? r.json() : null)),
        fetch('/api/pool/reminders').then((r) => (r.ok ? r.json() : null)),
      ])
      if (dashRes.status === 'fulfilled') setData(dashRes.value)
      else setData(null)
      setWeather(wxRes.status === 'fulfilled' ? wxRes.value : null)
      const remData = remRes.status === 'fulfilled' ? remRes.value : null
      const all = [...(remData?.reminders || []), ...(remData?.manualReminders || [])]
      // Sort by priority then dueInHours
      const prio: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 }
      all.sort((a: ReminderLite, b: ReminderLite) => {
        if (prio[a.priority] !== prio[b.priority]) return prio[a.priority] - prio[b.priority]
        return a.dueInHours - b.dueInHours
      })
      setReminders(all)
    } catch {
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-72" />
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-64" />
          <Skeleton className="h-64 lg:col-span-2" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <AlertTriangle className="h-8 w-8 text-destructive" />
        <p className="text-sm text-muted-foreground">Impossible de charger le tableau de bord.</p>
        <Button onClick={load} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4" />
          Réessayer
        </Button>
      </div>
    )
  }

  const { latestTest, latestPlan, clarity, swim, trend } = data
  const cwi = data.clearWaterIndex ?? 0
  const swimCfg = swim ? SWIM_CONFIG[swim.status] || SWIM_CONFIG.unknown : SWIM_CONFIG.unknown
  const clarityColor = clarity?.color || 'accent'
  const clarityGrad = CLARITY_COLORS[clarityColor] || CLARITY_COLORS.accent

  // Risk alerts — derive from latest test
  const alerts: { level: 'warning' | 'critical'; text: string }[] = []
  if (latestTest) {
    const phS = evaluateParam('ph', latestTest.ph)
    if (phS.includes('critical'))
      alerts.push({ level: 'critical', text: `pH ${latestTest.ph} hors plage de sécurité.` })
    else if (phS.includes('warning'))
      alerts.push({ level: 'warning', text: `pH ${latestTest.ph} légèrement hors idéal.` })
    if (latestTest.combinedChlorine != null && latestTest.combinedChlorine > 0.4)
      alerts.push({
        level: 'critical',
        text: `Chlore combiné ${latestTest.combinedChlorine} mg/L : chloramines irritantes.`,
      })
    if (latestTest.freeChlorine != null && latestTest.freeChlorine < 0.5)
      alerts.push({
        level: 'critical',
        text: 'Chlore libre insuffisant : désinfection non assurée.',
      })
    if (latestTest.phosphates != null && latestTest.phosphates > 0.2)
      alerts.push({
        level: 'warning',
        text: `Phosphates ${latestTest.phosphates} mg/L : risque algues.`,
      })
  }

  return (
    <div className="space-y-5">
      {/* Title row */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="section-label">Aujourd'hui</span>
            <span className="h-px w-8 bg-gold/40" />
          </div>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Votre piscine aujourd'hui
          </h1>
        </div>
        <Button variant="outline" size="sm" onClick={load} className="border-border/60">
          <RefreshCw className="h-3.5 w-3.5" />
          Actualiser
        </Button>
      </div>

      {!latestTest ? (
        <Card className="glass-card">
          <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-gold shadow-lg shadow-primary/30">
              <FlaskConical className="h-7 w-7 text-primary-foreground" />
            </div>
            <div>
              <p className="font-display text-lg font-semibold">Aucune mesure d'eau pour le moment</p>
              <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                Entrez votre premier test (pH au minimum) pour activer l'indice eau claire, le plan
                d'action et la sécurité baignade.
              </p>
            </div>
            <Button
              onClick={() => onNavigate('water')}
              className="bg-gradient-to-r from-primary to-gold text-primary-foreground shadow-lg shadow-primary/20"
            >
              <FlaskConical className="h-4 w-4" />
              Entrer ma première mesure
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-5 lg:grid-cols-3">
          {/* Clear-water gauge */}
          <Card className="glass-card lg:col-span-1">
            <CardHeader className="pb-2">
              <CardDescription>Indice eau claire</CardDescription>
              <CardTitle className="font-display text-lg">Qualité globale</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-3 pt-2">
              <Gauge value={cwi} label={clarity?.label || ''} color={clarityColor} />
              <div
                className={`rounded-full bg-gradient-to-r ${clarityGrad} px-4 py-1.5 text-sm font-bold text-white shadow-md`}
              >
                {clarity?.label || '—'}
              </div>
              <p className="text-center text-[11px] text-muted-foreground">
                {latestTest
                  ? `Mesuré le ${new Date(latestTest.createdAt).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}`
                  : ''}
              </p>
            </CardContent>
          </Card>

          {/* Right column: swim + à faire + retest */}
          <div className="space-y-4 lg:col-span-2">
            {/* Swim safety banner */}
            <div className={`flex items-start gap-3 rounded-2xl border p-4 ${swimCfg.cls}`}>
              <div className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ${swimCfg.dot} shadow-[0_0_8px_currentColor]`} />
              <div className="flex-1">
                <p className="font-display text-base font-bold">{swimCfg.label}</p>
                {swim && swim.reasons.length > 0 && (
                  <ul className="mt-1.5 space-y-1 text-xs opacity-90">
                    {swim.reasons.slice(0, 3).map((r, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-current opacity-60" />
                        {r}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* À faire maintenant */}
              <Card className="glass-card">
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-gold" />
                    À faire maintenant
                  </CardDescription>
                  <CardTitle className="font-display text-base">Priorité n°1</CardTitle>
                </CardHeader>
                <CardContent className="pt-1">
                  {latestPlan && latestPlan.immediateActions?.length > 0 ? (
                    <div>
                      <p className="font-display text-lg font-semibold text-gold">
                        {latestPlan.immediateActions[0].action}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {latestPlan.immediateActions[0].detail}
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-3 border-gold/40 text-gold hover:bg-gold/10"
                        onClick={() => onNavigate('plan')}
                      >
                        Voir le plan complet
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-[oklch(0.7_0.15_155)]" />
                      Aucune action urgente.
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Prochain re-test */}
              <Card className="glass-card">
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-primary" />
                    Prochain re-test
                  </CardDescription>
                  <CardTitle className="font-display text-base">Dans combien de temps ?</CardTitle>
                </CardHeader>
                <CardContent className="pt-1">
                  {latestPlan ? (
                    <div>
                      <p className="font-display text-3xl font-bold text-primary">
                        {Math.round(latestPlan.retestInHours)}h
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Pour vérifier l'effet du traitement en cours.
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-3"
                        onClick={() => onNavigate('water')}
                      >
                        <FlaskConical className="h-3.5 w-3.5" />
                        Saisir un test
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">—</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { icon: Camera, label: 'Diagnostiquer avec photo', tab: 'diagnostic' as TabId, accent: 'from-primary/15 to-primary/5 text-primary' },
          { icon: FlaskConical, label: 'Entrer mes mesures', tab: 'water' as TabId, accent: 'from-gold/15 to-gold/5 text-gold' },
          { icon: Siren, label: "J'ai un problème", action: 'emergency', accent: 'from-destructive/15 to-destructive/5 text-destructive' },
          { icon: MessageSquare, label: "Demander à l'assistant", tab: 'assistant' as TabId, accent: 'from-[oklch(0.7_0.15_155)]/15 to-[oklch(0.7_0.15_155)]/5 text-[oklch(0.45_0.13_155)]' },
        ].map((a) => (
          <button
            key={a.label}
            onClick={() => {
              if (a.action === 'emergency') onOpenEmergency()
              else if (a.tab) onNavigate(a.tab)
            }}
            className="group relative overflow-hidden rounded-xl border border-border/50 bg-card/60 p-3 text-left backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-gold/40 hover:shadow-lg hover:shadow-primary/5"
          >
            <div className={`mb-2 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br ${a.accent}`}>
              <a.icon className="h-4 w-4" />
            </div>
            <p className="text-xs font-semibold leading-tight">{a.label}</p>
          </button>
        ))}
      </div>

      {/* Latest test summary + trend */}
      {latestTest && (
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Latest test summary */}
          <Card className="glass-card lg:col-span-2">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 font-display text-base">
                  <Activity className="h-4 w-4 text-primary" />
                  Dernière analyse
                </CardTitle>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => onNavigate('log')}
                >
                  Carnet
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-3 pt-0 sm:grid-cols-5">
              {[
                { key: 'ph', label: 'pH', value: latestTest.ph, unit: '' },
                { key: 'freeChlorine', label: 'Chlore', value: latestTest.freeChlorine, unit: 'mg/L' },
                { key: 'alkalinity', label: 'TAC', value: latestTest.alkalinity, unit: '' },
                { key: 'cyanuricAcid', label: 'CYA', value: latestTest.cyanuricAcid, unit: '' },
                { key: 'temperature', label: 'Temp.', value: latestTest.temperature, unit: '°C' },
              ].map((m) => {
                const has = m.value != null
                const status = has ? evaluateParam(m.key, m.value) : 'unknown'
                return (
                  <div
                    key={m.key}
                    className="rounded-xl border border-border/50 bg-background/60 p-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {m.label}
                      </span>
                      <span className={`h-1.5 w-1.5 rounded-full ${statusDotColor(status)}`} />
                    </div>
                    <p className="mt-1 font-display text-xl font-bold">
                      {has ? m.value : '—'}
                      {has && m.unit && <span className="ml-0.5 text-[10px] text-muted-foreground">{m.unit}</span>}
                    </p>
                  </div>
                )
              })}
            </CardContent>
          </Card>

          {/* Mini 7-day pH trend */}
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 font-display text-base">
                <TrendingUp className="h-4 w-4 text-gold" />
                Tendance pH
              </CardTitle>
              <CardDescription className="text-xs">
                {trend.length} mesure(s) récente(s)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {trend.length > 1 ? (
                <div className="flex h-32 items-end justify-between gap-1.5">
                  {trend.map((t, i) => {
                    const h = Math.max(8, ((t.ph - 6.5) / (8 - 6.5)) * 100)
                    const inIdeal = t.ph >= 7 && t.ph <= 7.4
                    return (
                      <div
                        key={i}
                        className="flex flex-1 flex-col items-center gap-1"
                        title={`pH ${t.ph} — ${new Date(t.createdAt).toLocaleDateString('fr-FR')}`}
                      >
                        <span className="text-[9px] font-medium text-muted-foreground">
                          {t.ph.toFixed(1)}
                        </span>
                        <div
                          className={`w-full rounded-t-md ${
                            inIdeal
                              ? 'bg-gradient-to-t from-primary/60 to-gold'
                              : 'bg-gradient-to-t from-yellow-500/40 to-yellow-500'
                          }`}
                          style={{ height: `${h}%` }}
                        />
                        <span className="text-[8px] text-muted-foreground">
                          {new Date(t.createdAt).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: '2-digit',
                          })}
                        </span>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="flex h-32 items-center justify-center text-xs text-muted-foreground">
                  Pas assez de données
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Risk alerts */}
      {alerts.length > 0 && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 font-display text-base text-destructive">
              <AlertTriangle className="h-4 w-4" />
              Alertes sur votre eau
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {alerts.map((a, i) => (
              <div
                key={i}
                className={`flex items-start gap-2 rounded-lg border p-2.5 text-xs ${
                  a.level === 'critical'
                    ? 'border-destructive/30 bg-destructive/10 text-destructive'
                    : 'border-yellow-400/30 bg-yellow-400/10 text-yellow-700 dark:text-yellow-200'
                }`}
              >
                <span
                  className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${
                    a.level === 'critical' ? 'bg-destructive' : 'bg-yellow-500'
                  }`}
                />
                {a.text}
              </div>
            ))}
            <div className="flex flex-wrap gap-2 pt-1">
              <Button size="sm" onClick={() => onNavigate('plan')} className="bg-gradient-to-r from-primary to-gold text-primary-foreground">
                <ListChecksIcon />
                Voir le plan d'action
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onAskAssistant("J'ai des alertes sur mon eau, aide-moi à prioriser.")}
              >
                <MessageSquare className="h-3.5 w-3.5" />
                Demander à l'assistant
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Météo & rappels preview */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Risque météo */}
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <CloudSun className="h-3.5 w-3.5 text-gold" />
              Risque météo
            </CardDescription>
            <CardTitle className="font-display text-base">
              {weather?.weather?.location ? `À ${weather.weather.location}` : 'Météo en direct'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {weather?.assessment?.alerts?.length ? (
              (() => {
                const a = weather.assessment!.alerts[0]
                const cfg = WEATHER_ALERT_CFG[a.severity] || WEATHER_ALERT_CFG.medium
                const Icon = weatherAlertIcon(a.type)
                return (
                  <div className={`relative overflow-hidden rounded-xl border p-3 pl-4 ${cfg.cls}`}>
                    <span className={`absolute left-0 top-0 h-full w-1 ${cfg.dot}`} />
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      <p className="font-display text-sm font-bold">{a.title}</p>
                      <Badge variant="outline" className={`ml-auto text-[9px] uppercase tracking-wide ${cfg.cls}`}>
                        {a.severity}
                      </Badge>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs opacity-90">{a.message}</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onNavigate('weather')}
                      className="mt-2 h-7"
                    >
                      Voir la météo
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </div>
                )
              })()
            ) : (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 rounded-xl border border-[oklch(0.7_0.15_155)]/30 bg-[oklch(0.7_0.15_155)]/10 p-3 text-[oklch(0.45_0.13_155)]">
                  <CheckCircle2 className="h-4 w-4" />
                  <p className="text-sm font-semibold">Météo clémente</p>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {weather?.weather?.currentTempC != null
                    ? `${weather.weather.currentTempC}°C · ${weather.weather.weatherDesc || ''}`
                    : 'Aucune alerte météo pour le moment.'}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onNavigate('weather')}
                  className="h-7"
                >
                  Voir la météo
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Prochain rappel */}
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <Bell className="h-3.5 w-3.5 text-gold" />
              Prochain rappel
            </CardDescription>
            <CardTitle className="font-display text-base">
              {reminders.length > 0 ? `${reminders.length} rappel(s) en attente` : 'Aucun rappel'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {reminders.length > 0 ? (() => {
              const r = reminders[0]
              const cfg = REMINDER_PRIO[r.priority] || REMINDER_PRIO.medium
              return (
                <div className="relative overflow-hidden rounded-xl border border-border/50 bg-background/60 p-3 pl-4">
                  <span className={`absolute left-0 top-0 h-full w-1 ${cfg.stripe}`} />
                  <div className="flex items-center gap-2">
                    <Bell className={`h-4 w-4 ${cfg.cls}`} />
                    <p className="font-display text-sm font-bold">{r.title}</p>
                    <Badge variant="outline" className={`ml-auto text-[9px] ${cfg.cls}`}>
                      {cfg.label}
                    </Badge>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{r.detail}</p>
                  <div className="mt-1.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {r.dueInHours <= 0 ? 'Maintenant' : r.dueInHours < 24 ? `dans ${r.dueInHours}h` : `dans ${Math.round(r.dueInHours / 24)}j`}
                    <span className="ml-1 rounded-full bg-secondary/60 px-1.5 py-0.5 capitalize">{r.source}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onNavigate('reminders')}
                    className="mt-2 h-7"
                  >
                    Voir tous
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </div>
              )
            })() : (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 rounded-xl border border-[oklch(0.7_0.15_155)]/30 bg-[oklch(0.7_0.15_155)]/10 p-3 text-[oklch(0.45_0.13_155)]">
                  <CheckCircle2 className="h-4 w-4" />
                  <p className="text-sm font-semibold">Aucun rappel en attente</p>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Vous êtes à jour. Les rappels intelligents apparaîtront ici.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onNavigate('reminders')}
                  className="h-7"
                >
                  Voir tous
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Mesures', value: data.testsCount, icon: FlaskConical, action: () => onNavigate('log') },
          { label: 'Diagnostics photo', value: data.diagnosticsCount, icon: Camera, action: () => onNavigate('diagnostic') },
          { label: 'Équipements', value: data.equipmentCount, icon: Activity, action: () => onNavigate('maintenance') },
          { label: 'Produits', value: data.productsCount, icon: Droplets, action: () => onNavigate('maintenance') },
        ].map((s) => (
          <button
            key={s.label}
            onClick={s.action}
            className="glass-card rounded-xl p-3 text-left transition-all hover:-translate-y-0.5 hover:border-gold/40"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {s.label}
              </span>
              <s.icon className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <p className="mt-1 font-display text-2xl font-bold">{s.value}</p>
          </button>
        ))}
      </div>
    </div>
  )
}

// tiny inline icon to avoid extra import shadowing
function ListChecksIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
      <path d="M3 5l2 2 4-4" />
      <path d="M3 13l2 2 4-4" />
      <path d="M3 21l2 2 4-4" />
      <path d="M13 6h8" />
      <path d="M13 14h8" />
      <path d="M13 22h8" />
    </svg>
  )
}
