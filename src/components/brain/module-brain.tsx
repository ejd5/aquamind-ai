'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  BrainCircuit,
  Clock3,
  Droplets,
  ImageIcon,
  Loader2,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { api } from '@/lib/api-client'

interface BrainData {
  pool: { name: string }
  intelligence: {
    testsObserved: number
    diagnosticsObserved: number
    outcomesObserved: number
    awaitingRetest: number
  }
  timeline: Array<{
    id: string
    type: string
    occurredAt: string
    status: string
    clearWaterIndex?: number
  }>
}

export function ModuleBrain({
  activePoolId,
}: {
  activePoolId?: string | null
}) {
  const t = useTranslations('aqweliaBrain.workspace')
  const common = useTranslations('common')
  const [data, setData] = useState<BrainData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const query = activePoolId
        ? `?poolId=${encodeURIComponent(activePoolId)}`
        : ''
      setData(await api.get<BrainData>(`/api/brain/timeline${query}`))
    } catch {
      setData(null)
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [activePoolId])

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(timer)
  }, [load])

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center" role="status">
        <Loader2 className="animate-spin text-gold" aria-hidden="true" />
        <span className="sr-only">{common('loading2')}</span>
      </div>
    )
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="flex min-h-64 flex-col items-center justify-center gap-4 p-6 text-center">
          <BrainCircuit className="h-8 w-8 text-gold" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">{common('error')}</p>
          <Button variant="outline" onClick={() => void load()}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            {common('retry')}
          </Button>
        </CardContent>
      </Card>
    )
  }

  const metrics = [
    {
      label: t('testsObserved'),
      value: data.intelligence.testsObserved,
      icon: Droplets,
    },
    {
      label: t('diagnosticsObserved'),
      value: data.intelligence.diagnosticsObserved,
      icon: ImageIcon,
    },
    {
      label: t('resultsMeasured'),
      value: data.intelligence.outcomesObserved,
      icon: TrendingUp,
    },
    {
      label: t('awaitingRetest'),
      value: data.intelligence.awaitingRetest,
      icon: Clock3,
    },
  ]

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-gold/25 bg-gradient-to-br from-primary/10 via-background to-gold/10 p-6 sm:p-8">
        <div className="flex justify-between gap-4">
          <div>
            <span className="section-label">{t('eyebrow')}</span>
            <h1 className="mt-2 flex items-center gap-3 font-display text-3xl font-bold">
              <BrainCircuit className="text-gold" aria-hidden="true" />
              {t('title')}
            </h1>
            <p className="mt-3 text-muted-foreground">
              {t('subtitle', { pool: data.pool.name })}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void load()}
            aria-label={t('refresh')}
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            {t('refresh')}
          </Button>
        </div>
        <p className="mt-5 flex gap-2 rounded-xl border bg-background/60 p-3 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          {t('governance')}
        </p>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="flex items-center gap-4 p-5">
              <Icon className="text-gold" aria-hidden="true" />
              <div>
                <b className="text-2xl">{value}</b>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="space-y-2 p-5">
          <h2 className="font-display text-xl font-bold">{t('timelineTitle')}</h2>
          {data.timeline.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {t('empty')}
            </p>
          ) : (
            data.timeline.slice(0, 20).map((event) => (
              <div
                key={`${event.type}-${event.id}`}
                className="flex justify-between gap-4 rounded-xl border p-3 text-sm"
              >
                <span>
                  {t(`event.${event.type}` as never)} ·{' '}
                  {event.clearWaterIndex ?? event.status}
                </span>
                <time
                  dateTime={event.occurredAt}
                  className="shrink-0 text-xs text-muted-foreground"
                >
                  {new Date(event.occurredAt).toLocaleDateString()}
                </time>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
