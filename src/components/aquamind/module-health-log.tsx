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

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  ok: { label: 'OK', cls: 'border-[oklch(0.7_0.15_155)]/30 bg-[oklch(0.7_0.15_155)]/10 text-[oklch(0.45_0.13_155)]' },
  warning: { label: 'Attention', cls: 'border-yellow-400/30 bg-yellow-400/10 text-yellow-700 dark:text-yellow-300' },
  critical: { label: 'Critique', cls: 'border-destructive/30 bg-destructive/10 text-destructive' },
}

const SWIM_BADGE: Record<string, string> = {
  allowed: 'border-[oklch(0.7_0.15_155)]/30 bg-[oklch(0.7_0.15_155)]/10 text-[oklch(0.45_0.13_155)]',
  avoid: 'border-yellow-400/30 bg-yellow-400/10 text-yellow-700 dark:text-yellow-300',
  forbidden: 'border-destructive/30 bg-destructive/10 text-destructive',
  unknown: 'border-border bg-muted text-muted-foreground',
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
  const [tests, setTests] = useState<WaterTestRow[]>([])
  const [diags, setDiags] = useState<DiagnosticRow[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [tRes, dRes] = await Promise.all([
        fetch('/api/pool/water-test'),
        fetch('/api/pool/photo-diagnostic'),
      ])
      const tData = await tRes.json()
      const dData = await dRes.json()
      setTests(tData.tests || [])
      setDiags(dData.diagnostics || [])
    } catch {
      setTests([])
      setDiags([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function removeTest(id: string) {
    try {
      await fetch(`/api/pool/water-test?id=${id}`, { method: 'DELETE' })
      setTests((t) => t.filter((x) => x.id !== id))
      toast({ title: 'Mesure supprimée' })
    } catch {
      toast({ title: 'Erreur', description: 'Suppression impossible', variant: 'destructive' })
    }
  }

  // Trend data (reverse chronological → chronological for charts)
  const trend = [...tests].slice(0, 20).reverse()

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="section-label">Carnet de santé</span>
            <span className="h-px w-8 bg-gold/40" />
          </div>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Carnet de santé
          </h1>
          <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
            Historique complet : mesures d'eau, indices de qualité, diagnostics photo. Rapport PDF
            bientôt disponible.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="h-3.5 w-3.5" />
            Actualiser
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled
            title="Bientôt disponible"
            className="opacity-60"
          >
            <FileDown className="h-3.5 w-3.5" />
            Export PDF
          </Button>
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
                  Évolution du pH
                </CardTitle>
                <CardDescription className="text-xs">
                  {trend.length} mesure(s) — zone idéale 7.0–7.4
                </CardDescription>
              </CardHeader>
              <CardContent>
                {trend.length < 2 ? (
                  <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                    Pas assez de mesures pour un graphique.
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
                          .map((t, i) => {
                            const x = (i / Math.max(1, trend.length - 1)) * 320
                            const y = ((8 - t.ph) / (8 - 6.5)) * 180
                            return `${x},${y}`
                          })
                          .join(' ')}
                      />
                      {/* Points */}
                      {trend.map((t, i) => {
                        const x = (i / Math.max(1, trend.length - 1)) * 320
                        const y = ((8 - t.ph) / (8 - 6.5)) * 180
                        const inIdeal = t.ph >= 7 && t.ph <= 7.4
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
                  Indice eau claire
                </CardTitle>
                <CardDescription className="text-xs">
                  Score global 0–100, plus c'est haut mieux c'est.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {trend.length < 2 ? (
                  <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                    Pas assez de mesures.
                  </div>
                ) : (
                  <div className="flex h-48 items-end justify-between gap-1">
                    {trend.map((t, i) => {
                      const h = Math.max(4, t.clearWaterIndex)
                      const color =
                        t.clearWaterIndex >= 85
                          ? 'from-[oklch(0.55_0.13_195)] to-[oklch(0.7_0.15_155)]'
                          : t.clearWaterIndex >= 65
                            ? 'from-yellow-500/60 to-yellow-400'
                            : t.clearWaterIndex >= 40
                              ? 'from-orange-500/60 to-orange-400'
                              : 'from-destructive/70 to-destructive'
                      return (
                        <div
                          key={i}
                          className="flex flex-1 flex-col items-center gap-1"
                          title={`Indice ${t.clearWaterIndex} — ${new Date(t.createdAt).toLocaleDateString('fr-FR')}`}
                        >
                          <span className={`text-[9px] font-bold ${clarityColorClass(t.clearWaterIndex)}`}>
                            {t.clearWaterIndex}
                          </span>
                          <div
                            className={`w-full rounded-t-md bg-gradient-to-t ${color}`}
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
                )}
              </CardContent>
            </Card>
          </div>

          {/* Timeline of tests */}
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 font-display text-base">
                <FlaskConical className="h-4 w-4 text-primary" />
                Mesures d'eau
              </CardTitle>
              <CardDescription className="text-xs">
                {tests.length} mesure(s) au total
              </CardDescription>
            </CardHeader>
            <CardContent>
              {tests.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
                  <FlaskConical className="h-8 w-8 text-muted-foreground/40" />
                  Aucune mesure enregistrée.
                </div>
              ) : (
                <div className="custom-scroll relative max-h-[28rem] space-y-3 overflow-y-auto pr-2">
                  {/* Vertical timeline line */}
                  <div className="absolute bottom-3 left-3 top-3 w-px bg-gradient-to-b from-gold/40 via-primary/30 to-transparent" />
                  {tests.map((t) => {
                    const st = STATUS_BADGE[t.status] || STATUS_BADGE.ok
                    return (
                      <div key={t.id} className="relative flex gap-3 pl-6">
                        {/* Dot */}
                        <span className="absolute left-1.5 top-3 h-3 w-3 rounded-full border-2 border-background bg-gradient-to-br from-primary to-gold shadow-md" />
                        <div className="flex-1 rounded-xl border border-border/50 bg-background/60 p-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-foreground">
                              {new Date(t.createdAt).toLocaleDateString('fr-FR', {
                                weekday: 'short',
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <Badge variant="outline" className={st.cls}>
                                {st.label}
                              </Badge>
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${SWIM_BADGE[t.swimSafety] || SWIM_BADGE.unknown}`}
                              >
                                {t.swimSafety}
                              </span>
                              <span className={`rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-bold text-gold`}>
                                {t.clearWaterIndex}/100
                              </span>
                            </div>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-3 text-xs">
                            <span className="text-muted-foreground">
                              pH <span className="font-semibold text-foreground">{t.ph.toFixed(2)}</span>
                            </span>
                            {t.freeChlorine != null && (
                              <span className="text-muted-foreground">
                                Cl libre <span className="font-semibold text-foreground">{t.freeChlorine} mg/L</span>
                              </span>
                            )}
                            {t.alkalinity != null && (
                              <span className="text-muted-foreground">
                                TAC <span className="font-semibold text-foreground">{t.alkalinity}</span>
                              </span>
                            )}
                          </div>
                          {t.note && (
                            <p className="mt-1.5 text-xs italic text-muted-foreground">« {t.note} »</p>
                          )}
                          <div className="mt-2 flex items-center justify-between">
                            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                              Source : {t.source === 'strip_photo' ? 'Bandelette photo' : t.source}
                            </span>
                            <button
                              onClick={() => removeTest(t.id)}
                              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                              aria-label="Supprimer"
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
                Diagnostics photo
              </CardTitle>
            </CardHeader>
            <CardContent>
              {diags.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
                  <Camera className="h-8 w-8 text-muted-foreground/40" />
                  Aucun diagnostic photo.
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
                              {new Date(d.createdAt).toLocaleDateString('fr-FR', {
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
            Le rapport PDF complet (mesures, plans d'action, diagnostics) arrive bientôt. En
            attendant, toutes vos données sont conservées dans le carnet.
          </div>
        </>
      )}
    </div>
  )
}
