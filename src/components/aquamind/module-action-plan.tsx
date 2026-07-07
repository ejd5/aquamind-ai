'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  ListChecks,
  Droplets,
  ShieldX,
  Clock,
  Euro,
  RefreshCw,
  AlertTriangle,
  PhoneCall,
  ArrowRight,
  Sparkles,
  ShieldAlert,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/hooks/use-toast'
import { useTranslations, useLocale } from 'next-intl'
import { offlineApi } from '@/lib/offline/api-cache'
import { api } from '@/lib/api-client'
import { useOfflineStore } from '@/lib/offline/offline-store'
import type { TabId } from './app-shell'

interface Props {
  onNavigate: (tab: TabId) => void
}

interface LatestPlan {
  id: string
  diagnosis: string
  severity: 'low' | 'medium' | 'high' | 'urgent'
  confidence: number
  immediateActions: { order: number; action: string; detail: string; product?: string }[]
  chemicalDosages: {
    param: string
    product: string
    quantity: string
    method: string
    filtrationHours: number
    retestInHours: number
    waitBeforeSwimHours: number
    warnings: string[]
    estimatedCost: string
  }[]
  filtrationHours: number
  retestInHours: number
  swimSafety: string
  doNotDo: string[]
  estimatedCost: string
  whenToCallProfessional: string | null
  createdAt: string
  waterTestId: string
}

const SEVERITY_CLS: Record<string, string> = {
  low: 'border-[oklch(0.7_0.15_155)]/30 bg-[oklch(0.7_0.15_155)]/10 text-[oklch(0.45_0.13_155)]',
  medium: 'border-yellow-400/30 bg-yellow-400/10 text-yellow-700 dark:text-yellow-300',
  high: 'border-orange-400/30 bg-orange-400/10 text-orange-700 dark:text-orange-300',
  urgent: 'border-destructive/30 bg-destructive/10 text-destructive',
}

const SWIM_CLS: Record<string, { cls: string; icon: string }> = {
  allowed: { cls: 'border-[oklch(0.7_0.15_155)]/40 bg-[oklch(0.7_0.15_155)]/15 text-[oklch(0.4_0.13_155)]', icon: 'bg-[oklch(0.7_0.15_155)]' },
  avoid: { cls: 'border-yellow-400/40 bg-yellow-400/15 text-yellow-700 dark:text-yellow-200', icon: 'bg-yellow-500' },
  forbidden: { cls: 'border-destructive/40 bg-destructive/15 text-destructive', icon: 'bg-destructive' },
  unknown: { cls: 'border-border bg-muted text-muted-foreground', icon: 'bg-muted-foreground' },
}

export function ModuleActionPlan({ onNavigate }: Props) {
  const t = useTranslations('diagnostic')
  const tAct = useTranslations('actionPlan')

  // Helper: translate via key with French fallback (for DB-stored plans without keys)
  const tr = useCallback((fr: string, key?: string | null, params?: Record<string, string | number> | null): string => {
    if (key) {
      try { return tAct(key as any, params || {}) } catch { return fr }
    }
    return fr
  }, [tAct])

  // Helper: render diagnosis with pre-translated ICU params (sevLabel, swim, issues are themselves keys)
  const renderDiagnosis = useCallback((data: any): string => {
    const key = data?.diagnosisKey
    if (!key) return data?.diagnosis as string
    const params: Record<string, any> = { ...(data.diagnosisParams || {}) }
    // Pre-translate sevLabel and swim (they are keys in actionPlan namespace)
    if (typeof params.sevLabel === 'string') {
      try { params.sevLabel = tAct(params.sevLabel as any) } catch { /* keep */ }
    }
    if (typeof params.swim === 'string') {
      try { params.swim = tAct(params.swim as any) } catch { /* keep */ }
    }
    // Rebuild issues from issueKeys + issueParams (CSV + JSON)
    if (typeof params.issueKeys === 'string' && typeof params.issueParams === 'string') {
      try {
        const keys = params.issueKeys.split(',')
        const arr = JSON.parse(params.issueParams) as Record<string, any>[]
        params.issues = keys.map((k: string, i: number) => {
          try { return tAct(k as any, arr[i] || {}) } catch { return '' }
        }).filter(Boolean).join(', ')
      } catch { /* keep */ }
    }
    delete params.issueKeys
    delete params.issueParams
    try { return tAct(key as any, params) } catch { return data?.diagnosis as string }
  }, [tAct])
  const locale = useLocale()
  const [plan, setPlan] = useState<LatestPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [regenerating, setRegenerating] = useState(false)
  const [stale, setStale] = useState(false)

  const isOnline = useOfflineStore((s) => s.isOnline)
  const queueAction = useOfflineStore((s) => s.queueAction)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data, stale } = await offlineApi.dashboard()
      setPlan((data as { latestPlan?: LatestPlan } | null)?.latestPlan || null)
      setStale(stale)
    } catch {
      setPlan(null)
      setStale(false)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function regenerate() {
    if (!plan?.waterTestId) return
    setRegenerating(true)
    const payload = { testId: plan.waterTestId }
    try {
      if (!isOnline) {
        queueAction({ method: 'POST', path: '/api/pool/action-plan', body: payload })
        toast({
          title: t('actionQueued'),
          description: t('actionQueuedDesc'),
        })
        return
      }
      await api.post('/api/pool/action-plan', payload)
      toast({ title: t('regeneratedToast'), description: t('regeneratedDesc') })
      load()
    } catch (e) {
      toast({
        title: t('error'),
        description: e instanceof Error ? e.message : t('regenerateError'),
        variant: 'destructive',
      })
    } finally {
      setRegenerating(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-32" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (!plan) {
    return (
      <Card className="glass-card">
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <ListChecks className="h-10 w-10 text-muted-foreground/40" />
          <p className="font-display text-lg font-semibold">{t('noPlan')}</p>
          <p className="max-w-md text-sm text-muted-foreground">
            {t('noPlanDesc')}
          </p>
          <Button
            onClick={() => onNavigate('water')}
            className="bg-gradient-to-r from-primary to-gold text-primary-foreground shadow-lg shadow-primary/20"
          >
            <Droplets className="h-4 w-4" />
            {t('enterMeasure')}
          </Button>
        </CardContent>
      </Card>
    )
  }

  const sevCls = SEVERITY_CLS[plan.severity] || SEVERITY_CLS.low
  const swim = SWIM_CLS[plan.swimSafety] || SWIM_CLS.unknown

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="section-label">{t('sectionLabel')}</span>
            <span className="h-px w-8 bg-gold/40" />
          </div>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            {t('headline')}
          </h1>
          <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
            {t('actionPlanSubtitle')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={regenerate} disabled={regenerating}>
            <RefreshCw className={`h-3.5 w-3.5 ${regenerating ? 'animate-spin' : ''}`} />
            {t('regenerate')}
          </Button>
          {stale && (
            <span className="text-[10px] italic text-muted-foreground">{t('cached')}</span>
          )}
        </div>
      </div>

      {/* Diagnosis card */}
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 font-display text-lg">
              <Sparkles className="h-5 w-5 text-gold" />
              {t('diagnostic')}
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={sevCls}>
                {t(`severity.${plan.severity}`)}
              </Badge>
              <span className="text-[10px] text-muted-foreground">
                {new Date(plan.createdAt).toLocaleDateString(locale, {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </div>
          <CardDescription className="pt-2 text-sm leading-relaxed text-foreground/80">
            {renderDiagnosis(plan)}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Swim safety banner */}
      <div className={`flex items-center gap-4 rounded-2xl border-2 p-4 ${swim.cls}`}>
        <span className={`flex h-10 w-10 items-center justify-center rounded-full ${swim.icon} shadow-md`}>
          <ShieldAlert className="h-5 w-5 text-white" />
        </span>
        <div>
          <p className="font-display text-lg font-bold">{t(`swimSafety.${plan.swimSafety}`)}</p>
          <p className="text-xs opacity-80">
            {t('swimSafetyDesc')}
          </p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Immediate actions */}
        <Card className="glass-card lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 font-display text-base">
              <ListChecks className="h-4 w-4 text-gold" />
              {t('immediateActions')}
            </CardTitle>
            <CardDescription className="text-xs">
              {t('immediateActionsDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2.5">
              {plan.immediateActions.map((item, i) => {
                const ai = item as any
                return (
                <li
                  key={i}
                  className="flex items-start gap-3 rounded-xl border border-border/50 bg-background/60 p-3"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-gold text-xs font-bold text-primary-foreground shadow-md shadow-primary/30">
                    {ai.order}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{tr(ai.action, ai.actionKey)}</p>
                    <p className="text-xs text-muted-foreground">{tr(ai.detail, ai.detailKey, ai.detailParams)}</p>
                    {ai.product && (
                      <span className="mt-1 inline-block rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium">
                        {tr(ai.product, ai.productKey)}
                      </span>
                    )}
                  </div>
                </li>
                )
              })}
            </ol>
          </CardContent>
        </Card>

        {/* Side info */}
        <div className="space-y-4">
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-base">{t('synthesis')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  {t('retest')}
                </span>
                <span className="font-display font-bold text-primary">
                  {Math.round(plan.retestInHours)}h
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <RefreshCw className="h-3.5 w-3.5" />
                  {t('filtrationMin')}
                </span>
                <span className="font-display font-bold text-primary">
                  {plan.filtrationHours}h
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Euro className="h-3.5 w-3.5" />
                  {t('estimatedCost')}
                </span>
                <span className="font-display font-bold text-gold">
                  {plan.estimatedCost}
                </span>
              </div>
            </CardContent>
          </Card>

          {((plan as any).whenToCallProfessional || (plan as any).whenToCallProfessionalKey) && (
            <div className="rounded-xl border border-gold/30 bg-gold/5 p-3 text-xs">
              <p className="flex items-center gap-1.5 font-semibold text-gold">
                <PhoneCall className="h-3.5 w-3.5" />
                {t('callPro')}
              </p>
              <p className="mt-1 text-foreground/80">{tr((plan as any).whenToCallProfessional, (plan as any).whenToCallProfessionalKey, (plan as any).whenToCallProfessionalParams)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Chemical dosages */}
      {plan.chemicalDosages.length > 0 && (
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 font-display text-base">
              <Droplets className="h-4 w-4 text-primary" />
              {t('dosages')}
            </CardTitle>
            <CardDescription className="text-xs">
              {t('dosagesDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {plan.chemicalDosages.map((dosage, i) => {
                const di = dosage as any
                return (
                <div
                  key={i}
                  className="rounded-xl border border-border/50 bg-background/60 p-3 transition-all hover:border-gold/30 hover:shadow-md"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        {di.param}
                      </p>
                      <p className="font-display text-sm font-semibold">{tr(di.product, di.productKey)}</p>
                    </div>
                    <p className="font-display text-2xl font-bold text-gold">{di.quantity}</p>
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">{tr(di.method, di.methodKey)}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5">
                      <Clock className="h-3 w-3" />
                      {t('filtrationHoursShort', { n: di.filtrationHours })}
                    </span>
                    <span className="flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5">
                      <ArrowRight className="h-3 w-3" />
                      {t('retestHoursShort', { n: di.retestInHours })}
                    </span>
                    {di.waitBeforeSwimHours > 0 && (
                      <span className="flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-destructive">
                        ⌛ {t('swimWaitHours', { n: di.waitBeforeSwimHours })}
                      </span>
                    )}
                  </div>
                  {di.estimatedCost && di.estimatedCost !== '—' && (
                    <p className="mt-1.5 text-[10px] text-muted-foreground">
                      ≈ <span className="font-semibold text-gold">{di.estimatedCost}</span>
                    </p>
                  )}
                  {di.warnings?.length > 0 && (
                    <ul className="mt-2 space-y-0.5 text-[10px] text-destructive">
                      {di.warnings.map((w: string, j: number) => (
                        <li key={j}>⚠ {tr(w, di.warningKeys?.[j], di.warningParams?.[j])}</li>
                      ))}
                    </ul>
                  )}
                </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Do not do */}
      <Card className="border-destructive/30 bg-destructive/5">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 font-display text-base text-destructive">
            <ShieldX className="h-4 w-4" />
            {t('doNotDo')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-1.5 text-xs text-destructive/90 sm:grid-cols-2">
            {plan.doNotDo.map((dnd: string, i: number) => (
              <li key={i} className="flex items-start gap-2 rounded-lg bg-background/40 p-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-destructive" />
                {tr(dnd, (plan as any).doNotDoKeys?.[i])}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Footer disclaimer + actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-gold" />
          {t('disclaimer')}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => onNavigate('water')}>
            <Droplets className="h-3.5 w-3.5" />
            {t('newTest')}
          </Button>
          <Button variant="outline" size="sm" onClick={() => onNavigate('log')}>
            {t('seeLog')}
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
