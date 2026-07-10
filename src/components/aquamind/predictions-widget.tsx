'use client'

import { useEffect, useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import {
  Sparkles,
  RefreshCw,
  AlertTriangle,
  TrendingUp,
  ChevronRight,
  CheckCircle2,
  Droplet,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { apiGetCached } from '@/lib/offline/api-cache'
import type { Prediction, RiskLevel } from '@/lib/pool/predict-engine'

interface PredictionsResponse {
  predictions: Prediction[]
  globalScore: number
  level: RiskLevel
  samplesAnalyzed: number
  weatherFetched: boolean
  generatedAt: string
}

interface Props {
  /** Triggered when user clicks the action button on a prediction. */
  onAskAssistant?: (question: string) => void
}

const LEVEL_CFG: Record<RiskLevel, {
  dot: string
  badge: string
  ring: string
  glow: string
  labelKey: string
}> = {
  low: {
    dot: 'bg-[oklch(0.7_0.15_155)]',
    badge: 'border-[oklch(0.7_0.15_155)]/40 bg-[oklch(0.7_0.15_155)]/10 text-[oklch(0.45_0.13_155)]',
    ring: 'ring-[oklch(0.7_0.15_155)]/30',
    glow: '',
    labelKey: 'predictLowRisk',
  },
  medium: {
    dot: 'bg-yellow-500',
    badge: 'border-yellow-400/40 bg-yellow-400/10 text-yellow-700 dark:text-yellow-300',
    ring: 'ring-yellow-400/30',
    glow: 'shadow-yellow-500/10',
    labelKey: 'predictMediumRisk',
  },
  high: {
    dot: 'bg-destructive',
    badge: 'border-destructive/40 bg-destructive/10 text-destructive',
    ring: 'ring-destructive/40',
    glow: 'shadow-destructive/20 animate-pulse',
    labelKey: 'predictHighRisk',
  },
}

function riskEmoji(level: RiskLevel): string {
  return level === 'high' ? '🔴' : level === 'medium' ? '🟡' : '🟢'
}

export function PredictionsWidget({ onAskAssistant }: Props) {
  const t = useTranslations('modules.dashboard')
  const tPredict = useTranslations('predict')
  const [data, setData] = useState<PredictionsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const res = await apiGetCached<PredictionsResponse>('/api/pool/predictions', 'waterTests')
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
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Helper: translate via key with French fallback (for prediction text fields)
  const trP = useCallback(
    (fr: string, key?: string, params?: Record<string, string | number> | null): string => {
      if (key) {
        try {
          return tPredict(key as any, params || {})
        } catch {
          return fr
        }
      }
      return fr
    },
    [tPredict],
  )

  if (loading) {
    return (
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardDescription className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-gold" />
            {tPredict('predictTitle')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (error || !data) {
    // Silent failure — don't block the dashboard with a heavy error card.
    return null
  }

  const { predictions, globalScore, level } = data
  const cfg = LEVEL_CFG[level]

  // Aucune prédiction = bonne nouvelle, on montre une mini card "tout va bien"
  if (predictions.length === 0) {
    return (
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardDescription className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-gold" />
            {tPredict('predictTitle')}
          </CardDescription>
          <CardTitle className="flex items-center gap-2 font-display text-base">
            <Droplet className="h-4 w-4 text-[oklch(0.7_0.15_155)]" />
            {tPredict('predictAllClear')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 rounded-xl border border-[oklch(0.7_0.15_155)]/30 bg-[oklch(0.7_0.15_155)]/10 p-3 text-[oklch(0.45_0.13_155)]">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <p className="text-sm">{tPredict('predictAllClearDesc')}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`glass-card ring-1 ${cfg.ring} ${level === 'high' ? cfg.glow : ''}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <CardDescription className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-gold" />
              {tPredict('predictTitle')}
            </CardDescription>
            <CardTitle className="flex items-center gap-2 font-display text-base">
              <span className={`h-2 w-2 shrink-0 rounded-full ${cfg.dot} ${level === 'high' ? 'animate-pulse' : ''}`} />
              {tPredict('predictGlobalScore')}
              <span className="ml-1 text-2xl font-bold tabular-nums">{globalScore}</span>
              <span className="text-xs font-normal text-muted-foreground">/100</span>
            </CardTitle>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 shrink-0"
            onClick={load}
            title={t('refresh')}
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-2 pt-0">
        {/* Top prediction — highlighted */}
        {predictions.slice(0, 3).map((p) => {
          const pCfg = LEVEL_CFG[p.level]
          const etaLabel =
            p.etaHours <= 24
              ? tPredict('predictEtaHours', { hours: p.etaHours })
              : tPredict('predictEtaDays', { days: Math.round(p.etaHours / 24) })
          return (
            <div
              key={p.id}
              className={`relative overflow-hidden rounded-xl border p-3 pl-4 ${pCfg.badge} ${p.level === 'high' ? 'animate-pulse' : ''}`}
            >
              <span className={`absolute left-0 top-0 h-full w-1 ${pCfg.dot}`} />
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-start gap-2">
                  <span className="text-base leading-none">{riskEmoji(p.level)}</span>
                  <div className="min-w-0">
                    <p className="font-display text-sm font-bold leading-tight">
                      {trP(p.title, p.titleKey, p.titleParams)}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs opacity-90">
                      {trP(p.message, p.messageKey, p.messageParams)}
                    </p>
                  </div>
                </div>
                <span className="shrink-0 rounded-full bg-background/60 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide">
                  {etaLabel}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="flex items-center gap-1 text-[10px] uppercase tracking-wide opacity-70">
                  <TrendingUp className="h-3 w-3" />
                  {tPredict(`predictCat_${p.category}` as any)}
                </span>
                {onAskAssistant && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 gap-1 px-2 text-xs font-semibold"
                    onClick={() => {
                      const q = tPredict('predictActionQuery', {
                        title: trP(p.title, p.titleKey, p.titleParams),
                      })
                      onAskAssistant(q)
                    }}
                  >
                    {trP(p.action, p.actionKey, p.actionParams)}
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          )
        })}

        {/* More predictions collapsed hint */}
        {predictions.length > 3 && (
          <p className="pt-1 text-center text-[10px] text-muted-foreground">
            {tPredict('predictMoreCount', { count: predictions.length - 3 })}
          </p>
        )}

        {/* Footer — quick legend */}
        <div className="flex items-center justify-between gap-2 pt-1 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            {tPredict('predictDisclaimer')}
          </span>
          <span>
            {tPredict('predictSamples', { count: data.samplesAnalyzed })}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
