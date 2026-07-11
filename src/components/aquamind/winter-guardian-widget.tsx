'use client'

import { useEffect, useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import {
  Snowflake,
  Droplets,
  Umbrella,
  CloudRain,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Info,
  AlertOctagon,
  Sparkles,
  ArrowRight,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { apiGetCached } from '@/lib/offline/api-cache'

interface WinterAlert {
  id: string
  type: 'frost' | 'water_level' | 'cover' | 'rain' | 'filtration'
  severity: 'info' | 'warning' | 'critical'
  title: string
  titleKey: string
  description: string
  descriptionKey: string
}

interface WinterTask {
  id: string
  label: string
  labelKey: string
  applicable: boolean
  frequency: 'once' | 'monthly' | 'weekly'
}

interface WinterStatusResponse {
  mode: 'active' | 'passive' | 'not_started'
  modeLabel: string
  modeLabelKey: string
  modeDesc: string
  modeDescKey: string
  alerts: WinterAlert[]
  checklist: WinterTask[]
  nextActions: string[]
  nextActionKeys: string[]
  springPrepActive: boolean
  springBudgetEstimate: number
  springPrepMonth: string
  profileName: string | null
  weatherLocation: string | null
}

interface Props {
  /** Active pool id (multi-pool). When provided, scoped. */
  activePoolId?: string | null
  /** Called when user clicks "Prepare spring" — opens chat with a canned question. */
  onAskAssistant?: (question: string) => void
}

const MODE_CFG: Record<WinterStatusResponse['mode'], {
  badge: string
  dot: string
  ring: string
}> = {
  active: {
    badge: 'border-blue-400/40 bg-blue-400/10 text-blue-700 dark:text-blue-300',
    dot: 'bg-blue-400',
    ring: 'ring-blue-400/30',
  },
  passive: {
    badge: 'border-purple-400/40 bg-purple-400/10 text-purple-700 dark:text-purple-300',
    dot: 'bg-purple-400',
    ring: 'ring-purple-400/30',
  },
  not_started: {
    badge: 'border-border/60 bg-muted text-muted-foreground',
    dot: 'bg-muted-foreground',
    ring: 'ring-border/30',
  },
}

const ALERT_ICON: Record<WinterAlert['type'], typeof Snowflake> = {
  frost: Snowflake,
  water_level: Droplets,
  cover: Umbrella,
  rain: CloudRain,
  filtration: RefreshCw,
}

const ALERT_STYLE: Record<WinterAlert['severity'], { icon: typeof Info; cls: string }> = {
  info: { icon: Info, cls: 'border-blue-400/30 bg-blue-400/5 text-blue-700 dark:text-blue-300' },
  warning: {
    icon: AlertTriangle,
    cls: 'border-yellow-400/30 bg-yellow-400/5 text-yellow-700 dark:text-yellow-300',
  },
  critical: {
    icon: AlertOctagon,
    cls: 'border-destructive/30 bg-destructive/5 text-destructive',
  },
}

export function WinterGuardianWidget({ activePoolId, onAskAssistant }: Props) {
  const t = useTranslations('winterGuardian')
  const tDash = useTranslations('modules.dashboard')
  const [data, setData] = useState<WinterStatusResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [checkedTasks, setCheckedTasks] = useState<Record<string, boolean>>({})

  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const path = activePoolId
        ? `/api/pool/winter-guardian?poolId=${encodeURIComponent(activePoolId)}`
        : '/api/pool/winter-guardian'
      const res = await apiGetCached<WinterStatusResponse>(path, 'winterGuardian')
      if (res.data) {
        setData(res.data)
      } else {
        setError(true)
      }
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [activePoolId])

  useEffect(() => {
    load()
  }, [load])

  // Helper: translate via key with French fallback
  const trW = useCallback(
    (fr: string, key?: string): string => {
      if (key) {
        try {
          return t(key as any)
        } catch {
          return fr
        }
      }
      return fr
    },
    [t],
  )

  if (loading) {
    return (
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardDescription className="flex items-center gap-1.5">
            <Snowflake className="h-3.5 w-3.5 text-gold" />
            {t('title')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-4 w-1/3" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardDescription className="flex items-center gap-1.5">
            <Snowflake className="h-3.5 w-3.5 text-gold" />
            {t('title')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">{t('errorLoad')}</p>
          <Button variant="outline" size="sm" className="mt-2" onClick={load}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            {tDash('refresh')}
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!data) return null

  const modeCfg = MODE_CFG[data.mode]
  const applicableTasks = data.checklist.filter((task) => task.applicable)
  const doneCount = applicableTasks.filter((task) => checkedTasks[task.id]).length
  const totalCount = applicableTasks.length

  return (
    <Card className={`glass-card ring-1 ${modeCfg.ring}`}>
      {/* Top accent line */}
      <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-400 to-transparent" />

      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-1.5 text-base">
            <Snowflake className="h-4 w-4 text-blue-400" />
            {t('title')}
          </CardTitle>
          <Badge variant="outline" className={`${modeCfg.badge} flex items-center gap-1.5`}>
            <span className={`inline-block h-1.5 w-1.5 rounded-full ${modeCfg.dot}`} />
            {trW(data.modeLabel, data.modeLabelKey)}
          </Badge>
        </div>
        <CardDescription className="text-xs">{trW(data.modeDesc, data.modeDescKey)}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Alerts */}
        {data.alerts.length > 0 && (
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {t('alertsTitle')}
            </p>
            <div className="space-y-1.5">
              {data.alerts.map((alert) => {
                const Icon = ALERT_ICON[alert.type] || Info
                const SeverityIcon = ALERT_STYLE[alert.severity].icon
                const cls = ALERT_STYLE[alert.severity].cls
                return (
                  <div
                    key={alert.id}
                    className={`flex items-start gap-2 rounded-lg border px-2.5 py-2 ${cls}`}
                  >
                    <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1 text-xs font-semibold">
                        {trW(alert.title, alert.titleKey)}
                        <SeverityIcon className="h-3 w-3 opacity-60" />
                      </p>
                      <p className="mt-0.5 text-[11px] leading-snug opacity-90">
                        {trW(alert.description, alert.descriptionKey)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Checklist */}
        {applicableTasks.length > 0 && (
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {t('checklistTitle')}
              </p>
              <span className="text-[10px] font-medium text-muted-foreground">
                {t('tasksCompleted', { done: doneCount, total: totalCount })}
              </span>
            </div>
            <ul className="space-y-1">
              {applicableTasks.map((task) => {
                const isChecked = !!checkedTasks[task.id]
                return (
                  <li key={task.id}>
                    <button
                      type="button"
                      onClick={() =>
                        setCheckedTasks((prev) => ({ ...prev, [task.id]: !prev[task.id] }))
                      }
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-gold/5"
                    >
                      <CheckCircle2
                        className={`h-4 w-4 shrink-0 transition-colors ${
                          isChecked
                            ? 'text-[oklch(0.7_0.15_155)]'
                            : 'text-muted-foreground/40'
                        }`}
                      />
                      <span
                        className={`flex-1 text-xs ${
                          isChecked
                            ? 'text-muted-foreground line-through'
                            : 'text-foreground'
                        }`}
                      >
                        {trW(task.label, task.labelKey)}
                      </span>
                      <span className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
                        {task.frequency}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        {/* Spring preparation CTA */}
        {data.springPrepActive && (
          <div className="rounded-xl border border-gold/30 bg-gold/5 p-3">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-gold" />
              <p className="text-xs font-semibold text-gold">{t('prepareSpring')}</p>
            </div>
            <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
              {t('prepareSpringDesc')}
            </p>
            <Button
              size="sm"
              className="mt-2 w-full bg-gradient-to-r from-gold via-[oklch(0.65_0.11_195)] to-[oklch(0.55_0.10_195)] text-[oklch(0.99_0.01_195)] hover:scale-[1.02]"
              onClick={() => onAskAssistant?.(t('prepareSpring'))}
            >
              {t('prepareSpring')}
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        {/* Next actions */}
        {data.nextActions.length > 0 && !data.springPrepActive && (
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {t('nextActionsTitle')}
            </p>
            <ul className="space-y-1">
              {data.nextActions.map((action, idx) => {
                const key = data.nextActionKeys[idx]
                return (
                  <li
                    key={idx}
                    className="flex items-center gap-2 text-xs text-muted-foreground"
                  >
                    <span className="inline-block h-1 w-1 rounded-full bg-gold" />
                    {trW(action, key)}
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
