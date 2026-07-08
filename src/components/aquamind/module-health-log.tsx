'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  BookOpen,
  FlaskConical,
  Camera,
  TrendingUp,
  Activity,
  FileDown,
  RefreshCw,
  Trash2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/hooks/use-toast'
import { useTranslations, useLocale } from 'next-intl'
import { offlineApi, apiGetCached } from '@/lib/offline/api-cache'
import { api } from '@/lib/api-client'
import { useOfflineStore } from '@/lib/offline/offline-store'

interface WaterTestRow {
  id: string
  ph: number
  freeChlorine: number | null
  alkalinity: number | null
  status: string
  clearWaterIndex: number
  swimSafety: string
  source: string
  note: string | null
  createdAt: string
}

interface DiagnosticRow {
  id: string
  type: string
  imageUrl: string
  aiSummary: string
  detectedIssues: string
  createdAt: string
}

const STATUS_CLS: Record<string, string> = {
  ok: 'border-[oklch(0.7_0.15_155)]/30 bg-[oklch(0.7_0.15_155)]/10 text-[oklch(0.45_0.13_155)]',
  warning: 'border-yellow-400/30 bg-yellow-400/10 text-yellow-700 dark:text-yellow-300',
  critical: 'border-destructive/30 bg-destructive/10 text-destructive',
}

const SWIM_BADGE: Record<string, string> = {
  allowed: 'border-[oklch(0.7_0.15_155)]/30 bg-[oklch(0.7_0.15_155)]/10 text-[oklch(0.45_0.13_155)]',
  avoid: 'border-yellow-400/30 bg-yellow-400/10 text-yellow-700 dark:text-yellow-300',
  forbidden: 'border-destructive/30 bg-destructive/10 text-destructive',
  unknown: 'border-border bg-muted text-muted-foreground',
}

// Maps swimSafety DB enum value → translation key under `modules.waterTest`.
// Existing keys: swimAllowed / swimAvoid / swimForbidden / swimUnknown.
const SWIM_LABEL_KEY: Record<string, string> = {
  allowed: 'waterTest.swimAllowed',
  avoid: 'waterTest.swimAvoid',
  forbidden: 'waterTest.swimForbidden',
  unknown: 'waterTest.swimUnknown',
}

function clarityColorClass(score: number) {
  if (score >= 85) return 'text-[oklch(0.45_0.13_155)]'
  if (score >= 65) return 'text-yellow-700 dark:text-yellow-300'
  if (score >= 40) return 'text-orange-700 dark:text-orange-300'
  return 'text-destructive'
}

function safeParse<T>(s: string | null, fallback: T): T {
  if (!s) return fallback
  try {
    return JSON.parse(s) as T
  } catch {
    return fallback
  }
}

export function ModuleHealthLog() {
  const t = useTranslations('modules')
  const locale = useLocale()
  const [tests, setTests] = useState<WaterTestRow[]>([])
  const [diags, setDiags] = useState<DiagnosticRow[]>([])
  const [loading, setLoading] = useState(true)
  const [stale, setStale] = useState(false)

  const isOnline = useOfflineStore((s) => s.isOnline)
  const queueAction = useOfflineStore((s) => s.queueAction)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [tRes, dRes] = await Promise.all([
        offlineApi.waterTests(),
        apiGetCached<{ diagnostics?: DiagnosticRow[] }>('/api/pool/photo-diagnostic'),
      ])
      const tData = tRes.data as { tests?: WaterTestRow[] } | null
      setTests(tData?.tests || [])
      setDiags(dRes.data?.diagnostics || [])
      setStale(tRes.stale || dRes.stale)
    } catch {
      setTests([])
      setDiags([])
      setStale(false)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function removeTest(id: string) {
    try {
      if (!isOnline) {
        queueAction({ method: 'DELETE', path: `/api/pool/water-test?id=${id}` })
        setTests((t2) => t2.filter((x) => x.id !== id))
        toast({
          title: t('healthLog.deleteQueued'),
          description: t('healthLog.syncLater'),
        })
        return
      }
      await api.delete(`/api/pool/water-test?id=${id}`)
      setTests((t2) => t2.filter((x) => x.id !== id))
      toast({ title: t('healthLog.testDeleted') })
    } catch {
      toast({ title: t('healthLog.error'), description: t('healthLog.deleteError'), variant: 'destructive' })
    }
  }

  // Trend data (reverse chronological → chronological for charts)
  const trend = [...tests].slice(0, 20).reverse()

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="section-label">{t('healthLog.sectionLabel')}</span>
            <span className="h-px w-8 bg-gold/40" />
          </div>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            {t('healthLog.headline')}
          </h1>
          <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
            {t('healthLog.subtitle')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="h-3.5 w-3.5" />
            {t('healthLog.refresh')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled
            title={t('healthLog.comingSoon')}
            className="opacity-60"
          >
            <FileDown className="h-3.5 w-3.5" />
            {t('healthLog.exportPdf')}
          </Button>
          {stale && (
            <span className="text-[10px] italic text-muted-foreground">{t('healthLog.cached')}</span>
          )}
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-32" />
        </div>
      ) : (
        <>
          {/* Charts */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* pH over time */}
            <Card className="glass-card">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 font-display text-base">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  {t('healthLog.phEvolution')}
                </CardTitle>
                <CardDescription className="text-xs">
                  {t('healthLog.phDesc', { count: trend.length })}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {trend.length < 2 ? (
                  <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                    {t('healthLog.notEnoughChart')}
                  </div>
                ) : (
                  <div className="relative h-48">
                    {/* Ideal band */}
                    <div className="absolute left-0 right-0 border-y border-dashed border-[oklch(0.7_0.15_155)]/30 bg-[oklch(0.7_0.15_155)]/5">
                      <div
                        className="absolute left-0 right-0"
                        style={{
                          top: `${((8 - 7.4) / (8 - 6.5)) * 100}%`,
                          height: `${((7.4 - 7.0) / (8 - 6.5)) * 100}%`,
                        }}
                      />
                    </div>
                    <svg viewBox="0 0 320 180" preserveAspectRatio="none" className="h-full w-full">
                      {/* Ideal zone rectangle */}
                      <rect
                        x="0"
                        y={((8 - 7.4) / (8 - 6.5)) * 180}
                        width="320"
                        height={((7.4 - 7.0) / (8 - 6.5)) * 180}
                        fill="oklch(0.7 0.15 155 / 0.08)"
                      />
                      {/* Line */}
                      <polyline
                        fill="none"
                        stroke="oklch(0.45 0.12 195)"
                        strokeWidth="2"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                        points={trend
                          .map((t2, i) => {
                            const x = (i / Math.max(1, trend.length - 1)) * 320
                            const y = ((8 - t2.ph) / (8 - 6.5)) * 180
                            return `${x},${y}`
                          })
                          .join(' ')}
                      />
                      {/* Points */}
                      {trend.map((t2, i) => {
                        const x = (i / Math.max(1, trend.length - 1)) * 320
                        const y = ((8 - t2.ph) / (8 - 6.5)) * 180
                        const inIdeal = t2.ph >= 7 && t2.ph <= 7.4
                        return (
                          <circle
                            key={i}
                            cx={x}
                            cy={y}
                            r="3"
                            fill={inIdeal ? 'oklch(0.7 0.15 155)' : 'oklch(0.78 0.15 85)'}
                          />
                        )
                      })}
                    </svg>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Clear water index over time */}
            <Card className="glass-card">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 font-display text-base">
                  <Activity className="h-4 w-4 text-gold" />
                  {t('healthLog.clearWaterIndex')}
                </CardTitle>
                <CardDescription className="text-xs">
                  {t('healthLog.clearWaterDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {trend.length < 2 ? (
                  <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                    {t('healthLog.notEnough')}
                  </div>
                ) : (
                  <div className="flex h-48 items-end justify-between gap-1">
                    {trend.map((t2, i) => {
                      const h = Math.max(4, t2.clearWaterIndex)
                      const color =
                        t2.clearWaterIndex >= 85
                          ? 'from-[oklch(0.55_0.13_195)] to-[oklch(0.7_0.15_155)]'
                          : t2.clearWaterIndex >= 65
                            ? 'from-yellow-500/60 to-yellow-400'
                            : t2.clearWaterIndex >= 40
                              ? 'from-orange-500/60 to-orange-400'
                              : 'from-destructive/70 to-destructive'
                      return (
                        <div
                          key={i}
                          className="flex flex-1 flex-col items-center gap-1"
                          title={`${t('healthLog.clearWaterIndex')} ${t2.clearWaterIndex} — ${new Date(t2.createdAt).toLocaleDateString(locale)}`}
                        >
                          <span className={`text-[9px] font-bold ${clarityColorClass(t2.clearWaterIndex)}`}>
                            {t2.clearWaterIndex}
                          </span>
                          <div
                            className={`w-full rounded-t-md bg-gradient-to-t ${color}`}
                            style={{ height: `${h}%` }}
                          />
                          <span className="text-[8px] text-muted-foreground">
                            {new Date(t2.createdAt).toLocaleDateString(locale, {
                              day: '2-digit',
                              month: '2-digit',
                            })}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Timeline of tests */}
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 font-display text-base">
                <FlaskConical className="h-4 w-4 text-primary" />
                {t('healthLog.waterTests')}
              </CardTitle>
              <CardDescription className="text-xs">
                {t('healthLog.testsCount', { count: tests.length })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {tests.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
                  <FlaskConical className="h-8 w-8 text-muted-foreground/40" />
                  {t('healthLog.noTests')}
                </div>
              ) : (
                <div className="custom-scroll relative max-h-[28rem] space-y-3 overflow-y-auto pr-2">
                  {/* Vertical timeline line */}
                  <div className="absolute bottom-3 left-3 top-3 w-px bg-gradient-to-b from-gold/40 via-primary/30 to-transparent" />
                  {tests.map((t2) => {
                    const statusCls = STATUS_CLS[t2.status] || STATUS_CLS.ok
                    return (
                      <div key={t2.id} className="relative flex gap-3 pl-6">
                        {/* Dot */}
                        <span className="absolute left-1.5 top-3 h-3 w-3 rounded-full border-2 border-background bg-gradient-to-br from-primary to-gold shadow-md" />
                        <div className="flex-1 rounded-xl border border-border/50 bg-background/60 p-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-foreground">
                              {new Date(t2.createdAt).toLocaleDateString(locale, {
                                weekday: 'short',
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <Badge variant="outline" className={statusCls}>
                                {t(`healthLog.status.${t2.status}`)}
                              </Badge>
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${SWIM_BADGE[t2.swimSafety] || SWIM_BADGE.unknown}`}
                              >
                                {t((SWIM_LABEL_KEY[t2.swimSafety] || 'waterTest.swimUnknown') as any)}
                              </span>
                              <span className={`rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-bold text-gold`}>
                                {t2.clearWaterIndex}/100
                              </span>
                            </div>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-3 text-xs">
                            <span className="text-muted-foreground">
                              pH <span className="font-semibold text-foreground">{t2.ph.toFixed(2)}</span>
                            </span>
                            {t2.freeChlorine != null && (
                              <span className="text-muted-foreground">
                                {t('healthLog.freeChlorine')} <span className="font-semibold text-foreground">{t2.freeChlorine} mg/L</span>
                              </span>
                            )}
                            {t2.alkalinity != null && (
                              <span className="text-muted-foreground">
                                {t('healthLog.alkalinity')} <span className="font-semibold text-foreground">{t2.alkalinity}</span>
                              </span>
                            )}
                          </div>
                          {t2.note && (() => {
                            // Try to parse note as JSON { key, params } for translation
                            // If it fails, display the raw note (legacy French text)
                            try {
                              const parsed = JSON.parse(t2.note)
                              if (parsed.key) {
                                return <p className="mt-1.5 text-xs italic text-muted-foreground">« {t(parsed.key as any, parsed.params || {})} »</p>
                              }
                            } catch { /* not JSON, display raw */ }
                            return <p className="mt-1.5 text-xs italic text-muted-foreground">« {t2.note} »</p>
                          })()}
                          <div className="mt-2 flex items-center justify-between">
                            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                              {t('healthLog.source')} {t2.source === 'strip_photo' ? t('healthLog.stripPhoto') : t2.source === 'manual' ? t('healthLog.manualSource') : t2.source}
                            </span>
                            <button
                              onClick={() => removeTest(t2.id)}
                              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                              aria-label={t('healthLog.delete')}
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Diagnostics history */}
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 font-display text-base">
                <Camera className="h-4 w-4 text-primary" />
                {t('healthLog.diagnostics')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {diags.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
                  <Camera className="h-8 w-8 text-muted-foreground/40" />
                  {t('healthLog.noDiagnostics')}
                </div>
              ) : (
                <div className="custom-scroll grid max-h-80 grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-3 lg:grid-cols-4">
                  {diags.map((d) => {
                    const detected = safeParse<string[]>(d.detectedIssues, [])
                    return (
                      <div
                        key={d.id}
                        className="overflow-hidden rounded-xl border border-border/50 bg-background/60"
                      >
                        <div className="flex aspect-square items-center justify-center overflow-hidden bg-secondary">
                          {d.imageUrl && d.imageUrl.startsWith('data:') ? (
                            <img src={d.imageUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <Camera className="h-6 w-6 text-muted-foreground" />
                          )}
                        </div>
                        <div className="p-2">
                          <div className="flex items-center justify-between">
                            <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                              {d.type}
                            </span>
                            <span className="text-[9px] text-muted-foreground">
                              {new Date(d.createdAt).toLocaleDateString(locale, {
                                day: '2-digit',
                                month: '2-digit',
                              })}
                            </span>
                          </div>
                          <p className="mt-1 line-clamp-2 text-[10px] text-muted-foreground">
                            {detected[0] || d.aiSummary}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* PDF disclaimer */}
          <div className="flex items-center gap-2 rounded-xl border border-border/40 bg-secondary/30 p-3 text-xs text-muted-foreground">
            <BookOpen className="h-3.5 w-3.5 shrink-0 text-gold" />
            {t('healthLog.pdfDisclaimer')}
          </div>
        </>
      )}
    </div>
  )
}
