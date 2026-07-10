'use client'

import { useEffect, useState } from 'react'
import {
  Coins,
  Share2,
  TrendingUp,
  Clock,
  CheckCircle2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useTranslations, useLocale } from 'next-intl'
import { apiGetCached } from '@/lib/offline/api-cache'
import { shareText, hapticSuccess, hapticLight } from '@/lib/native'

interface SavingsTrendPoint {
  month: string
  monthly: number
  cumulative: number
}

interface SavingsBadge {
  id: string
  threshold: number
  icon: string
  titleKey: string
  unlocked: boolean
  unlockedAt?: string | null
}

interface SavingsReport {
  proMonthlyCost: number
  aqweliaMonthlyCost: number
  monthlySaving: number
  yearlySaving: number
  totalSaved: number
  totalSavedThisYear: number
  interventionsAvoided: number
  hoursSaved: number
  monthsActive: number
  monthsActiveThisYear: number
  trend: SavingsTrendPoint[]
  badges: SavingsBadge[]
  nextBadge: SavingsBadge | null
  progressToNext: number
  startedAt: string | null
}

/**
 * Animated count-up hook (easeOutCubic).
 * Re-runs whenever `target` changes (e.g. after the API returns).
 * When `target` is 0 the hook simply does not animate — the previous value
 * is left in place (the parent initialises the widget with `target=0`, so the
 * first paint shows 0 and the first non-zero target triggers the animation).
 */
function useCountUp(target: number, duration = 1200): number {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (target <= 0) return
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(Math.round(target * eased))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])
  return value
}

/**
 * CSS-only confetti burst — 24 falling pieces. Rendered when `visible` is
 * true; the parent toggles visibility on a timer (no internal state, so no
 * setState-in-effect violation).
 */
function ConfettiBurst({ visible }: { visible: boolean }) {
  if (!visible) return null
  const colors = ['#FFD700', '#36C5F0', '#4ADE80', '#F472B6', '#FBBF24']
  const pieces = Array.from({ length: 24 })
  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden rounded-2xl">
      {pieces.map((_, i) => {
        const color = colors[i % colors.length]
        const left = (i * 4 + 4) % 100
        const delay = (i % 8) * 60
        const dur = 1400 + (i % 5) * 200
        return (
          <span
            key={i}
            className="absolute -top-2 h-2.5 w-2.5 rounded-[2px]"
            style={{
              left: `${left}%`,
              backgroundColor: color,
              animation: `aqwelia-confetti-fall ${dur}ms cubic-bezier(0.2, 0.7, 0.4, 1) ${delay}ms forwards`,
            }}
          />
        )
      })}
      <style>{`
        @keyframes aqwelia-confetti-fall {
          0% { transform: translateY(-12px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(320px) rotate(540deg); opacity: 0; }
        }
      `}</style>
    </div>
  )
}

export function SavingsWidget() {
  const t = useTranslations('savings')
  const locale = useLocale()
  const [data, setData] = useState<SavingsReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [confetti, setConfetti] = useState(false)
  const [shareStatus, setShareStatus] = useState<'idle' | 'shared' | 'error'>('idle')

  useEffect(() => {
    let mounted = true
    let hideTimer: ReturnType<typeof setTimeout> | undefined
    void (async () => {
      try {
        const res = await apiGetCached<SavingsReport>('/api/pool/savings', 'dashboard')
        if (!mounted) return
        setData(res.data)
        // Burst confetti once when savings > 0 (first dashboard view of the session).
        if (res.data && res.data.totalSaved > 0) {
          setConfetti(true)
          hideTimer = setTimeout(() => {
            if (mounted) setConfetti(false)
          }, 2200)
          void hapticSuccess()
        }
      } catch {
        setData(null)
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
      if (hideTimer) clearTimeout(hideTimer)
    }
  }, [])

  const animatedSaved = useCountUp(data?.totalSaved ?? 0)

  if (loading) {
    return (
      <Card className="glass-card relative overflow-hidden">
        <CardContent className="py-6">
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (!data) return null

  const fmt = (n: number) =>
    new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(n)
  const fmtMonth = (iso: string) =>
    new Intl.DateTimeFormat(locale, { month: 'short' }).format(new Date(iso))

  const maxCumulative = Math.max(1, ...data.trend.map((p) => p.cumulative))

  const handleShare = async () => {
    await hapticLight()
    const days = data.monthsActive * 30
    const text = t('shareText', { amount: fmt(data.totalSaved), days })
    const url = 'https://aqwelia.app'
    const ok = await shareText({
      title: t('shareTitle'),
      text,
      url,
      dialogTitle: t('shareDialogTitle'),
    })
    setShareStatus(ok ? 'shared' : 'error')
    setTimeout(() => setShareStatus('idle'), 1800)
  }

  return (
    <Card className="glass-card relative overflow-hidden">
      <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent" />
      <ConfettiBurst visible={confetti} />
      <CardHeader className="pb-2">
        <CardDescription className="flex items-center gap-1.5">
          <Coins className="h-3.5 w-3.5 text-gold" />
          {t('title')}
        </CardDescription>
        <CardTitle className="font-display text-base">{t('subtitle')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Big golden number */}
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="font-display text-5xl font-bold leading-none tracking-tight text-gold drop-shadow-[0_2px_12px_rgba(255,215,0,0.35)]">
              {fmt(animatedSaved)}
            </p>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {t('savedSinceStart', { months: data.monthsActive })}
            </p>
          </div>
          <div className="rounded-full border border-gold/30 bg-gold/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-gold">
            {t('thisYear')}: {fmt(data.totalSavedThisYear)}
          </div>
        </div>

        {/* Comparison pisciniste vs AQWELIA */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-border/50 bg-background/60 p-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {t('vsPro')}
            </p>
            <p className="font-display text-lg font-bold text-destructive/80">
              {fmt(data.proMonthlyCost)}
              <span className="text-[10px] font-normal text-muted-foreground">/{t('month')}</span>
            </p>
          </div>
          <div className="rounded-xl border border-gold/30 bg-gold/5 p-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gold">
              {t('withAqwelia')}
            </p>
            <p className="font-display text-lg font-bold text-gold">
              {fmt(data.aqweliaMonthlyCost)}
              <span className="text-[10px] font-normal text-muted-foreground">/{t('month')}</span>
            </p>
          </div>
        </div>

        {/* Trend bar chart */}
        <div className="rounded-xl border border-border/50 bg-background/60 p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              <TrendingUp className="h-3 w-3" />
              {t('trend')}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {t('yearlyPotential', { amount: fmt(data.yearlySaving) })}
            </p>
          </div>
          <div className="flex h-20 items-end justify-between gap-1.5">
            {data.trend.map((p, i) => {
              const h = Math.max(4, (p.cumulative / maxCumulative) * 100)
              return (
                <div key={i} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t-md bg-gradient-to-t from-gold/60 to-gold transition-all duration-700"
                    style={{ height: `${h}%` }}
                    title={fmt(p.cumulative)}
                  />
                  <span className="text-[9px] text-muted-foreground">{fmtMonth(p.month)}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Mini stats: interventions avoided + time saved */}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2 rounded-lg bg-background/40 p-2">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[oklch(0.7_0.15_155)]" />
            <div>
              <p className="font-display text-sm font-bold">{data.interventionsAvoided}</p>
              <p className="text-[9px] uppercase tracking-wide text-muted-foreground">
                {t('interventionsAvoided')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-background/40 p-2">
            <Clock className="h-3.5 w-3.5 shrink-0 text-primary" />
            <div>
              <p className="font-display text-sm font-bold">{data.hoursSaved}h</p>
              <p className="text-[9px] uppercase tracking-wide text-muted-foreground">
                {t('timeSaved')}
              </p>
            </div>
          </div>
        </div>

        {/* Badges row + progress to next */}
        {data.badges.length > 0 && (
          <div className="flex items-center gap-2 rounded-lg bg-background/40 p-2">
            {data.badges.map((b) => (
              <div
                key={b.id}
                className={`flex h-9 w-9 items-center justify-center rounded-full text-lg ${
                  b.unlocked
                    ? 'bg-gold/15 ring-1 ring-gold/40'
                    : 'bg-muted/40 opacity-50 grayscale'
                }`}
                title={t(b.titleKey as any)}
              >
                <span>{b.icon}</span>
              </div>
            ))}
            {data.nextBadge && (
              <div className="ml-auto flex-1 pl-2">
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>{t('nextBadge')}</span>
                  <span className="font-semibold text-gold">
                    {fmt(data.nextBadge.threshold)}
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted/60">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-gold/60 to-gold transition-all duration-700"
                    style={{ width: `${data.progressToNext}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Share button */}
        <Button
          onClick={handleShare}
          className="w-full bg-gradient-to-r from-gold to-[oklch(0.7_0.15_60)] text-[oklch(0.99_0.01_60)] shadow-lg shadow-gold/20 hover:shadow-gold/40"
        >
          <Share2 className="h-4 w-4" />
          {shareStatus === 'shared'
            ? t('shareCopied')
            : shareStatus === 'error'
              ? t('shareFailed')
              : t('shareButton')}
        </Button>
      </CardContent>
    </Card>
  )
}
