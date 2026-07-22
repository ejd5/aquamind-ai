'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Droplets,
  FlaskConical,
  Loader2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ListChecks,
  Clock,
  Euro,
  ShieldX,
  Sparkles,
  ScanLine,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useTranslations, useLocale } from 'next-intl'
import { toast } from '@/hooks/use-toast'
import { TARGETS, evaluateParam, type ParamStatus } from '@/lib/pool/targets'
import type { TabId } from './app-shell'
import { offlineApi } from '@/lib/offline/api-cache'
import { api } from '@/lib/api-client'
import { useOfflineStore } from '@/lib/offline/offline-store'
import { StripScanner } from './strip-scanner'

interface Props {
  onNavigate: (tab: TabId) => void
  activePoolId?: string | null
}

interface WaterTestRow {
  id: string
  ph: number
  freeChlorine: number | null
  totalChlorine: number | null
  combinedChlorine: number | null
  alkalinity: number | null
  calciumHardness: number | null
  cyanuricAcid: number | null
  salt: number | null
  phosphates: number | null
  temperature: number | null
  status: string
  clearWaterIndex: number
  swimSafety: string
  source: string
  note: string | null
  createdAt: string
}

interface ActionPlanResult {
  diagnosis: string
  severity: 'low' | 'medium' | 'high' | 'urgent'
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
  swimReasons?: string[]
  doNotDo: string[]
  estimatedCost: string
  whenToCallProfessional: string | null
}

const FIELDS: { key: string; labelKey: string; placeholder: string; required?: boolean }[] = [
  { key: 'ph', labelKey: 'ph', placeholder: '7.2', required: true },
  { key: 'freeChlorine', labelKey: 'freeChlorine', placeholder: '2.0' },
  { key: 'totalChlorine', labelKey: 'totalChlorine', placeholder: '2.5' },
  { key: 'combinedChlorine', labelKey: 'combinedChlorine', placeholder: '0.2' },
  { key: 'alkalinity', labelKey: 'alkalinity', placeholder: '100' },
  { key: 'calciumHardness', labelKey: 'calciumHardness', placeholder: '300' },
  { key: 'cyanuricAcid', labelKey: 'cyanuricAcid', placeholder: '40' },
  { key: 'salt', labelKey: 'saltLabel', placeholder: '5' },
  { key: 'phosphates', labelKey: 'phosphates', placeholder: '0.05' },
  { key: 'temperature', labelKey: 'temperatureLabel', placeholder: '26' },
]

function statusDot(s: ParamStatus | 'unknown') {
  switch (s) {
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

const STATUS_BADGE: Record<string, { labelKey: string; cls: string }> = {
  ok: { labelKey: 'balanced', cls: 'border-[oklch(0.7_0.15_155)]/30 bg-[oklch(0.7_0.15_155)]/10 text-[oklch(0.45_0.13_155)]' },
  warning: { labelKey: 'statusWarning', cls: 'border-yellow-400/30 bg-yellow-400/10 text-yellow-700 dark:text-yellow-300' },
  critical: { labelKey: 'statusCritical', cls: 'border-destructive/30 bg-destructive/10 text-destructive' },
}

const SEVERITY_CONFIG: Record<string, { labelKey: string; cls: string }> = {
  low: { labelKey: 'balanced', cls: 'border-[oklch(0.7_0.15_155)]/30 bg-[oklch(0.7_0.15_155)]/10 text-[oklch(0.45_0.13_155)]' },
  medium: { labelKey: 'watch', cls: 'border-yellow-400/30 bg-yellow-400/10 text-yellow-700 dark:text-yellow-300' },
  high: { labelKey: 'actionRecommended', cls: 'border-orange-400/30 bg-orange-400/10 text-orange-700 dark:text-orange-300' },
  urgent: { labelKey: 'urgent', cls: 'border-destructive/30 bg-destructive/10 text-destructive' },
}

const SWIM_LABEL_KEY: Record<string, string> = {
  allowed: 'swimAllowed',
  avoid: 'swimAvoid',
  forbidden: 'swimForbidden',
  unknown: 'swimUnknown',
}

export function ModuleWaterTest({ onNavigate, activePoolId }: Props) {
  const t = useTranslations('modules.waterTest')
  const tAct = useTranslations('actionPlan')
  const tTargets = useTranslations('targets')

  // Helper: translate via key with French fallback (for DB-stored plans without keys)
  const trAct = useCallback((fr: string, key?: string | null, params?: Record<string, string | number> | null): string => {
    if (key) {
      try { return tAct(key as any, params || {}) } catch { return fr }
    }
    return fr
  }, [tAct])

  // Helper: render diagnosis with pre-translated ICU params
  const renderDiagnosis = useCallback((data: any): string => {
    const key = data?.diagnosisKey
    if (!key) return data?.diagnosis as string
    const params: Record<string, any> = { ...(data.diagnosisParams || {}) }
    if (typeof params.sevLabel === 'string') {
      try { params.sevLabel = tAct(params.sevLabel as any) } catch { /* keep */ }
    }
    if (typeof params.swim === 'string') {
      try { params.swim = tAct(params.swim as any) } catch { /* keep */ }
    }
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
  const [values, setValues] = useState<Record<string, string>>({
    ph: '',
    freeChlorine: '',
    totalChlorine: '',
    combinedChlorine: '',
    alkalinity: '',
    calciumHardness: '',
    cyanuricAcid: '',
    salt: '',
    phosphates: '',
    temperature: '',
  })
  const [source, setSource] = useState<'manual' | 'strip_photo'>('manual')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [plan, setPlan] = useState<ActionPlanResult | null>(null)
  const [tests, setTests] = useState<WaterTestRow[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [stale, setStale] = useState(false)
  const [scannerOpen, setScannerOpen] = useState(false)

  const isOnline = useOfflineStore((s) => s.isOnline)
  const queueAction = useOfflineStore((s) => s.queueAction)

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true)
    try {
      const { data, stale } = await offlineApi.waterTests(activePoolId)
      const d = data as { tests?: WaterTestRow[] } | null
      setTests(d?.tests || [])
      setStale(stale)
    } catch {
      setTests([])
      setStale(false)
    } finally {
      setLoadingHistory(false)
    }
  }, [activePoolId])

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  function update(key: string, val: string) {
    setValues((v) => ({ ...v, [key]: val }))
  }

  async function submit() {
    const ph = Number(values.ph)
    if (isNaN(ph)) {
      toast({ title: t('phRequired'), description: t('phRequiredDesc'), variant: 'destructive' })
      return
    }
    setSaving(true)
    setPlan(null)
    const body: Record<string, unknown> = {
      ph,
      source,
      note: note.trim() || undefined,
      ...(activePoolId ? { poolId: activePoolId } : {}),
    }
    for (const f of FIELDS) {
      if (f.key === 'ph') continue
      if (values[f.key] !== '') body[f.key] = values[f.key]
    }
    try {
      if (!isOnline) {
        queueAction({ method: 'POST', path: '/api/pool/water-test', body })
        toast({
          title: t('measureRecorded'),
          description: t('measureRecordedOffline'),
        })
        // reset required fields, keep optionals
        setValues((v) => ({ ...v, ph: '' }))
        setNote('')
        return
      }
      const data = await api.post<{ actionPlan?: ActionPlanResult; error?: string }>(
        '/api/pool/water-test',
        body,
      )
      setPlan(data.actionPlan || null)
      toast({
        title: t('measureRecorded'),
        description: data.actionPlan
          ? t('planGenerated')
          : t('noProfile'),
      })
      // reset required fields, keep optionals
      setValues((v) => ({ ...v, ph: '' }))
      setNote('')
      loadHistory()
    } catch (e) {
      toast({
        title: t('errorTitle'),
        description: e instanceof Error ? e.message : t('saveFailed'),
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  async function removeTest(id: string) {
    try {
      if (!isOnline) {
        queueAction({ method: 'DELETE', path: `/api/pool/water-test?id=${id}` })
        setTests((t) => t.filter((x) => x.id !== id))
        toast({
          title: t('measureDeleted'),
          description: t('measureRecordedOffline'),
        })
        return
      }
      await api.delete(`/api/pool/water-test?id=${id}`)
      setTests((t) => t.filter((x) => x.id !== id))
      toast({ title: t('measureDeleted') })
    } catch {
      toast({ title: t('errorTitle'), description: t('deleteFailed'), variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2">
          <span className="section-label">{t('sectionLabel')}</span>
          <span className="h-px w-8 bg-gold/40" />
        </div>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight sm:text-4xl">
          {t('enterMeasureTitle')}
        </h1>
        <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
          {t('enterMeasureDesc')}
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        {/* Form */}
        <Card className="glass-card lg:col-span-3">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 font-display text-base">
              <FlaskConical className="h-4 w-4 text-primary" />
              {t('formCardTitle')}
            </CardTitle>
            <CardDescription className="text-xs">
              {t('formCardDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Source toggle + StripScan CTA */}
            <div className="flex flex-wrap items-stretch gap-2">
              <div className="flex flex-1 gap-2">
                {[
                  { v: 'manual' as const, label: t('sourceManual') },
                  { v: 'strip_photo' as const, label: t('sourceStrip') },
                ].map((s) => (
                  <button
                    key={s.v}
                    onClick={() => setSource(s.v)}
                    className={`flex-1 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                      source === s.v
                        ? 'border-gold/60 bg-gold/10 text-gold shadow-sm'
                        : 'border-border bg-background hover:border-gold/30'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              <Button
                type="button"
                onClick={() => setScannerOpen(true)}
                className="gap-1.5 bg-gradient-to-r from-gold to-[oklch(0.65_0.11_195)] text-[oklch(0.99_0.01_195)] shadow-md shadow-gold/30 hover:shadow-lg hover:shadow-gold/40"
                size="sm"
              >
                <ScanLine className="h-3.5 w-3.5" />
                {t('stripScanButton')}
              </Button>
            </div>

            {/* Fields grid */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {FIELDS.map((f) => {
                const target = TARGETS[f.key]
                const val = values[f.key] ? Number(values[f.key]) : NaN
                const status = !isNaN(val) ? evaluateParam(f.key, val) : 'unknown'
                return (
                  <div key={f.key} className="space-y-1">
                    <Label htmlFor={f.key} className="flex items-center justify-between text-xs">
                      <span className="font-medium">
                        {t(f.labelKey as any)}
                        {f.required && <span className="ml-0.5 text-destructive">*</span>}
                      </span>
                      {target && (
                        <span className="text-[9px] text-muted-foreground">
                          {target.idealLow}–{target.idealHigh}
                          {target.unit && ` ${target.unit}`}
                        </span>
                      )}
                    </Label>
                    <div className="relative">
                      <Input
                        id={f.key}
                        type="number"
                        step="any"
                        inputMode="decimal"
                        value={values[f.key]}
                        onChange={(e) => update(f.key, e.target.value)}
                        placeholder={f.placeholder}
                        className={`pr-7 ${f.required && !values[f.key] ? 'border-gold/40' : ''}`}
                      />
                      {values[f.key] && (
                        <span
                          className={`absolute right-2 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full ${statusDot(status)}`}
                          title={status}
                        />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="space-y-1">
              <Label htmlFor="note" className="text-xs">{t('noteLabel')}</Label>
              <Textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t('notePlaceholder')}
                className="min-h-[60px] resize-none"
              />
            </div>

            <Button
              onClick={submit}
              disabled={saving || !values.ph}
              className="w-full bg-gradient-to-r from-primary to-gold text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('savingWithPlan')}
                </>
              ) : (
                <>
                  <Droplets className="h-4 w-4" />
                  {t('saveWithPlan')}
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Side: ideal ranges */}
        <Card className="glass-card lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-base">{t('idealRanges')}</CardTitle>
            <CardDescription className="text-xs">
              {t('idealRangesDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {Object.entries(TARGETS).map(([key, tg]) => (
              <div
                key={key}
                className="flex items-center justify-between rounded-lg border border-border/40 bg-background/40 px-3 py-1.5 text-xs"
              >
                <span className="font-medium">{tg.labelKey ? tTargets(tg.labelKey as any) : tg.label}</span>
                <span className="font-mono text-gold">
                  {tg.idealLow}–{tg.idealHigh}
                  <span className="ml-1 text-[10px] text-muted-foreground">{tg.unit}</span>
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Generated plan */}
      {plan && (
        <Card className="glass-card border-gold/30">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 font-display text-lg">
                <Sparkles className="h-5 w-5 text-gold" />
                {t('generatedPlan')}
              </CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={SEVERITY_CONFIG[plan.severity]?.cls || ''}>
                  {SEVERITY_CONFIG[plan.severity] ? t(SEVERITY_CONFIG[plan.severity].labelKey as any) : plan.severity}
                </Badge>
                <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary">
                  {SWIM_LABEL_KEY[plan.swimSafety] ? t(SWIM_LABEL_KEY[plan.swimSafety] as any) : plan.swimSafety}
                </Badge>
              </div>
            </div>
            <CardDescription className="text-sm leading-relaxed text-foreground/80">
              {renderDiagnosis(plan)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Immediate actions */}
            {plan.immediateActions.length > 0 && (
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-gold">
                  <ListChecks className="h-3.5 w-3.5" />
                  {t('immediateActions')}
                </p>
                <ol className="space-y-2">
                  {plan.immediateActions.map((item, i) => {
                    const ai = item as any
                    return (
                    <li
                      key={i}
                      className="flex items-start gap-3 rounded-lg border border-border/50 bg-background/60 p-2.5"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-gold text-xs font-bold text-primary-foreground">
                        {ai.order}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">{trAct(ai.action, ai.actionKey)}</p>
                        <p className="text-xs text-muted-foreground">{trAct(ai.detail, ai.detailKey, ai.detailParams)}</p>
                        {ai.product && (
                          <span className="mt-1 inline-block rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium">
                            {trAct(ai.product, ai.productKey)}
                          </span>
                        )}
                      </div>
                    </li>
                    )
                  })}
                </ol>
              </div>
            )}

            {/* Chemical dosages */}
            {plan.chemicalDosages.length > 0 && (
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
                  <Droplets className="h-3.5 w-3.5" />
                  {t('dosages')}
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {plan.chemicalDosages.map((dosage, i) => {
                    const di = dosage as any
                    return (
                    <div
                      key={i}
                      className="rounded-lg border border-border/50 bg-background/60 p-3"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground">{di.param}</p>
                          <p className="font-display text-sm font-semibold">{trAct(di.product, di.productKey)}</p>
                        </div>
                        <p className="font-display text-lg font-bold text-gold">{di.quantity}</p>
                      </div>
                      <p className="mt-1.5 text-xs text-muted-foreground">{trAct(di.method, di.methodKey)}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {t('filtration')} {di.filtrationHours}h
                        </span>
                        <span className="flex items-center gap-1">
                          <ArrowRight className="h-3 w-3" />
                          {t('retest')} {di.retestInHours}h
                        </span>
                        {di.estimatedCost && di.estimatedCost !== '—' && (
                          <span className="flex items-center gap-1">
                            <Euro className="h-3 w-3" />
                            {di.estimatedCost}
                          </span>
                        )}
                      </div>
                      {di.warnings?.length > 0 && (
                        <ul className="mt-2 space-y-0.5 text-[10px] text-destructive">
                          {di.warnings.map((w: string, j: number) => (
                            <li key={j}>⚠ {trAct(w, di.warningKeys?.[j], di.warningParams?.[j])}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Do not do */}
            {plan.doNotDo.length > 0 && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-destructive">
                  <ShieldX className="h-3.5 w-3.5" />
                  {t('doNotDo')}
                </p>
                <ul className="space-y-1 text-xs text-destructive/90">
                  {plan.doNotDo.slice(0, 6).map((dnd: string, i: number) => (
                    <li key={i}>• {trAct(dnd, (plan as any).doNotDoKeys?.[i])}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Footer info */}
            <div className="flex flex-wrap items-center gap-3 border-t border-border/40 pt-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {t('retestInHours', { hours: Math.round(plan.retestInHours) })}
              </span>
              <span className="flex items-center gap-1">
                <Euro className="h-3 w-3" />
                {t('totalCost', { cost: plan.estimatedCost })}
              </span>
              <Button size="sm" variant="outline" onClick={() => onNavigate('plan')}>
                {t('seeFullPlan')}
                <ArrowRight className="h-3 w-3" />
              </Button>
            </div>

            {((plan as any).whenToCallProfessional || (plan as any).whenToCallProfessionalKey) && (
              <div className="flex items-start gap-2 rounded-lg border border-gold/30 bg-gold/5 p-3 text-xs">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" />
                <p className="text-foreground/80">
                  <strong className="text-gold">{t('proAdvice')}</strong> {trAct((plan as any).whenToCallProfessional, (plan as any).whenToCallProfessionalKey, (plan as any).whenToCallProfessionalParams)}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* History */}
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 font-display text-base">
            <Clock className="h-4 w-4 text-primary" />
            {t('recentMeasures')}
            {stale && (
              <span className="text-[10px] font-normal italic text-muted-foreground">
                {t('cachedData')}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingHistory ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : tests.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
              <FlaskConical className="h-8 w-8 text-muted-foreground/40" />
              {t('noMeasures')}
            </div>
          ) : (
            <div className="custom-scroll max-h-96 space-y-2 overflow-y-auto pr-1">
              {tests.map((row) => {
                const st = STATUS_BADGE[row.status] || STATUS_BADGE.ok
                return (
                  <div
                    key={row.id}
                    className="flex flex-wrap items-center gap-3 rounded-xl border border-border/50 bg-background/60 p-3"
                  >
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        {new Date(row.createdAt).toLocaleDateString(locale, {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <span className="font-display text-lg font-bold">{row.ph.toFixed(2)}</span>
                      <span className="text-[10px] text-muted-foreground">pH</span>
                    </div>
                    <div className="flex flex-1 flex-wrap gap-3 text-xs">
                      {[
                        { l: 'Cl', v: row.freeChlorine },
                        { l: 'TAC', v: row.alkalinity },
                        { l: 'TH', v: row.calciumHardness },
                        { l: 'CYA', v: row.cyanuricAcid },
                        { l: t('saltLabel'), v: row.salt },
                      ].map(
                        (m) =>
                          m.v != null && (
                            <span key={m.l} className="text-muted-foreground">
                              {m.l} <span className="font-semibold text-foreground">{m.v}</span>
                            </span>
                          )
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={st.cls}>
                        {t(st.labelKey as any)}
                      </Badge>
                      <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-bold text-gold">
                        {row.clearWaterIndex}/100
                      </span>
                      <button
                        onClick={() => removeTest(row.id)}
                        className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        aria-label={t('delete')}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Floating helper */}
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <CheckCircle2 className="h-3 w-3 text-[oklch(0.7_0.15_155)]" />
        {t('tip')}
      </div>

      {/* StripScan™ modal — IA-powered test strip scanner */}
      <StripScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onSave={(values) => {
          // Pre-fill the manual form with scanned values + switch source
          setValues((v) => ({ ...v, ...values }))
          setSource('strip_photo')
          setScannerOpen(false)
          toast({
            title: t('stripScanPrefilled'),
            description: t('stripScanPrefilledDesc'),
          })
        }}
      />
    </div>
  )
}
