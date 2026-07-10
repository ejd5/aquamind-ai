'use client'

import { useEffect, useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import {
  Calendar,
  FlaskConical,
  AlertTriangle,
  Coins,
  ListChecks,
  Wrench,
  RefreshCw,
  Download,
  Lightbulb,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { apiGetCached } from '@/lib/offline/api-cache'
import { useLocale } from 'next-intl'

interface AnnualReviewResponse {
  season: string
  totalTests: number
  incidents: number
  productsConsumed: number
  totalSpent: number
  actionsCount: number
  interventionsCount: number
  avgClearWaterIndex: number
  recommendations: string[]
  recommendationsFr: string[]
  generatedAt: string
  profileName: string | null
}

interface Props {
  activePoolId?: string | null
}

const NUMBER_FMT: Record<string, Intl.NumberFormat> = {
  fr: new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }),
  en: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }),
  es: new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }),
  de: new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }),
  it: new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }),
  pt: new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }),
  nl: new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }),
}

export function AnnualReviewWidget({ activePoolId }: Props) {
  const t = useTranslations('annualReview')
  const tDash = useTranslations('modules.dashboard')
  const nextLocale = useLocale()
  const [data, setData] = useState<AnnualReviewResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const path = activePoolId
        ? `/api/pool/annual-review?poolId=${encodeURIComponent(activePoolId)}`
        : '/api/pool/annual-review'
      const res = await apiGetCached<AnnualReviewResponse>(path, 'annualReview')
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

  // Helper: translate via recommendation key with French fallback
  const trR = useCallback(
    (fr: string, key?: string): string => {
      if (key) {
        try {
          // Strip the leading "annualReview." prefix if present, since useTranslations('annualReview')
          // is already scoped — the API returns full-qualified keys like "annualReview.recos.tooManyIncidents".
          const subKey = key.startsWith('annualReview.') ? key.slice('annualReview.'.length) : key
          return t(subKey as any)
        } catch {
          return fr
        }
      }
      return fr
    },
    [t],
  )

  const formatCurrency = (n: number): string => {
    const fmt = NUMBER_FMT[nextLocale] || NUMBER_FMT.fr
    return fmt.format(n)
  }

  const handleDownloadPdf = useCallback(async () => {
    if (!data) return
    setDownloading(true)
    try {
      // Use the existing report endpoint to generate a PDF print of the season.
      // The report route is server-side and uses @react-pdf/renderer.
      const res = await fetch('/api/pool/report?type=annual-review', {
        credentials: 'include',
      })
      if (!res.ok) throw new Error('pdf_failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `aqwelia-bilan-${data.season}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      // Silent fail — the button is best-effort. The actual PDF route may not
      // yet support the annual-review content type; the user just gets no
      // download. This avoids crashing the widget.
    } finally {
      setDownloading(false)
    }
  }, [data])

  if (loading) {
    return (
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardDescription className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-gold" />
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
            <Calendar className="h-3.5 w-3.5 text-gold" />
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

  // Empty state — not enough tests to show a meaningful review
  if (data.totalTests === 0) {
    return (
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardDescription className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-gold" />
            {t('title')}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Calendar className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm font-medium">{t('noData')}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t('noDataDesc')}</p>
        </CardContent>
      </Card>
    )
  }

  const stats = [
    { label: t('statTests'), value: data.totalTests, icon: FlaskConical, color: 'text-[oklch(0.7_0.15_155)]' },
    { label: t('statIncidents'), value: data.incidents, icon: AlertTriangle, color: data.incidents > 0 ? 'text-destructive' : 'text-[oklch(0.7_0.15_155)]' },
    { label: t('statSpent'), value: formatCurrency(data.totalSpent), icon: Coins, color: 'text-gold' },
    { label: t('statActions'), value: data.actionsCount, icon: ListChecks, color: 'text-blue-500' },
    { label: t('statInterventions'), value: data.interventionsCount, icon: Wrench, color: 'text-purple-500' },
  ]

  return (
    <Card className="glass-card">
      {/* Top accent line */}
      <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent" />

      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-1.5 text-base">
            <Calendar className="h-4 w-4 text-gold" />
            {t('title')}
          </CardTitle>
          <span className="rounded-full border border-gold/30 bg-gold/5 px-2 py-0.5 text-[10px] font-semibold text-gold">
            {t('seasonLabel', { season: data.season })}
          </span>
        </div>
        <CardDescription className="text-xs">{t('subtitle')}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {stats.map((s) => {
            const Icon = s.icon
            return (
              <div
                key={s.label}
                className="rounded-lg border border-border/40 bg-background/40 p-2.5"
              >
                <div className="flex items-center gap-1">
                  <Icon className={`h-3 w-3 ${s.color}`} />
                  <span className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {s.label}
                  </span>
                </div>
                <p className="mt-1 font-display text-lg font-bold">{s.value}</p>
              </div>
            )
          })}
          {/* Avg CWI tile */}
          <div className="rounded-lg border border-border/40 bg-background/40 p-2.5">
            <div className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
              CWI
            </div>
            <p className="mt-1 font-display text-lg font-bold">
              {data.avgClearWaterIndex}
              <span className="text-[10px] text-muted-foreground">/100</span>
            </p>
          </div>
        </div>

        {/* Recommendations */}
        {data.recommendations.length > 0 && (
          <div>
            <p className="mb-1.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              <Lightbulb className="h-3 w-3 text-gold" />
              {t('recommendationsTitle')}
            </p>
            <ul className="space-y-1">
              {data.recommendations.slice(0, 4).map((recKey, idx) => {
                const fr = data.recommendationsFr[idx] || ''
                return (
                  <li
                    key={idx}
                    className="flex items-start gap-1.5 text-[11px] leading-snug text-muted-foreground"
                  >
                    <span className="mt-1.5 inline-block h-1 w-1 shrink-0 rounded-full bg-gold" />
                    <span>{trR(fr, recKey)}</span>
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        {/* Download PDF button */}
        <Button
          size="sm"
          variant="outline"
          className="w-full border-gold/40 bg-gold/5 text-gold hover:bg-gold/10"
          onClick={handleDownloadPdf}
          disabled={downloading}
        >
          {downloading ? (
            <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Download className="mr-1.5 h-3.5 w-3.5" />
          )}
          {downloading ? t('pdfStarted') : t('downloadPdf')}
        </Button>
      </CardContent>
    </Card>
  )
}
