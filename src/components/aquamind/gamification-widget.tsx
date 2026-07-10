'use client'

import { useEffect, useState } from 'react'
import { Flame, Trophy, Lock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useTranslations } from 'next-intl'
import { apiGetCached } from '@/lib/offline/api-cache'
import { hapticSuccess, hapticLight } from '@/lib/native'

interface Badge {
  id: string
  icon: string
  titleKey: string
  descKey: string
  unlocked: boolean
  progress: number
  progressLabel?: string
}

interface Streak {
  current: number
  best: number
  unit: 'day'
}

interface Rank {
  tier: string
  tierKey: string
  percentile: number
}

interface GamificationReport {
  badges: Badge[]
  streak: Streak
  rank: Rank
  totalBadges: number
  unlockedBadges: number
  nextBadge: Badge | null
}

export function GamificationWidget() {
  const t = useTranslations('gamification')
  const [data, setData] = useState<GamificationReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [newlyUnlocked, setNewlyUnlocked] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    void (async () => {
      try {
        const res = await apiGetCached<GamificationReport>(
          '/api/pool/gamification',
          'dashboard',
        )
        if (!mounted) return
        setData(res.data)
        if (res.data && res.data.unlockedBadges > 0) {
          // Celebrate the most recent unlocked badge on first load.
          const unlocked = res.data.badges.filter((b) => b.unlocked)
          const last = unlocked[unlocked.length - 1]
          if (last) {
            setNewlyUnlocked(last.id)
            setTimeout(() => setNewlyUnlocked(null), 1600)
            void hapticSuccess()
          }
        }
      } catch {
        setData(null)
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  if (loading) {
    return (
      <Card className="glass-card">
        <CardContent className="py-6">
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (!data) return null

  const nextBadge = data.nextBadge

  return (
    <Card className="glass-card relative overflow-hidden">
      <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
      <CardHeader className="pb-2">
        <CardDescription className="flex items-center gap-1.5">
          <Trophy className="h-3.5 w-3.5 text-gold" />
          {t('title')}
        </CardDescription>
        <CardTitle className="font-display text-base">{t('subtitle')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Streak + Rank */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-orange-400/30 bg-orange-400/10 p-3">
            <div className="flex items-center gap-2">
              <Flame className="streak-flame h-6 w-6 text-orange-500" />
              <div>
                <p className="font-display text-2xl font-bold leading-none text-orange-600 dark:text-orange-300">
                  {data.streak.current}
                </p>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {t('currentStreak')}
                </p>
              </div>
            </div>
            <p className="mt-1.5 text-[10px] text-muted-foreground">
              {t('bestStreak', { best: data.streak.best })}
            </p>
          </div>
          <div className="rounded-xl border border-gold/30 bg-gold/5 p-3">
            <p className="font-display text-lg font-bold leading-tight text-gold">
              {t(data.rank.tierKey as any)}
            </p>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {t('rank')}
            </p>
            <p className="mt-1 text-[10px] font-semibold text-gold/80">
              {t('percentile', { pct: data.rank.percentile })}
            </p>
          </div>
        </div>

        {/* Badges grid (4 cols) */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {t('badges')}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {t('badgesCount', {
                unlocked: data.unlockedBadges,
                total: data.totalBadges,
              })}
            </p>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {data.badges.map((b) => {
              const isCelebrating = newlyUnlocked === b.id
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => void hapticLight()}
                  title={`${t(b.titleKey as any)} — ${t(b.descKey as any)}${
                    b.progressLabel ? ` (${b.progressLabel})` : ''
                  }`}
                  className={`group relative flex aspect-square flex-col items-center justify-center rounded-2xl border transition-all ${
                    b.unlocked
                      ? 'border-gold/40 bg-gradient-to-br from-gold/20 to-gold/5 shadow-md shadow-gold/10 hover:scale-105'
                      : 'border-border/50 bg-muted/30 opacity-60 hover:opacity-90'
                  } ${isCelebrating ? 'ring-2 ring-gold ring-offset-2 ring-offset-background' : ''}`}
                >
                  <span className={`text-2xl ${b.unlocked ? '' : 'grayscale'}`}>
                    {b.icon}
                  </span>
                  {b.unlocked && (
                    <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-gold text-[9px] font-bold text-white shadow-sm">
                      ✓
                    </span>
                  )}
                  {!b.unlocked && (
                    <Lock className="absolute right-1 top-1 h-2.5 w-2.5 text-muted-foreground" />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Progress to next badge */}
        {nextBadge && (
          <div className="rounded-xl border border-border/50 bg-background/60 p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className="text-lg grayscale opacity-60">{nextBadge.icon}</span>
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold">
                    {t(nextBadge.titleKey as any)}
                  </p>
                  <p className="truncate text-[10px] text-muted-foreground">
                    {t(nextBadge.descKey as any)}
                  </p>
                </div>
              </div>
              <span className="shrink-0 text-[10px] font-semibold text-muted-foreground">
                {nextBadge.progressLabel || `${nextBadge.progress}%`}
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted/60">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary/60 to-gold transition-all duration-700"
                style={{ width: `${nextBadge.progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Flame keyframes (local scope — unique name avoids collisions) */}
        <style>{`
          @keyframes aqwelia-flame-flicker {
            0%, 100% { transform: scale(1) rotate(-2deg); filter: drop-shadow(0 0 4px rgba(249, 115, 22, 0.5)); }
            50%      { transform: scale(1.12) rotate(2deg); filter: drop-shadow(0 0 9px rgba(249, 115, 22, 0.75)); }
          }
          .streak-flame { animation: aqwelia-flame-flicker 1.4s ease-in-out infinite; transform-origin: bottom center; }
        `}</style>
      </CardContent>
    </Card>
  )
}
