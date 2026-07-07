'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  BookOpen,
  Search,
  Clock,
  Sparkles,
  Lock,
  Lightbulb,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Bookmark,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { toast } from '@/hooks/use-toast'
import { useTranslations, useMessages } from 'next-intl'
import type { TabId } from './app-shell'
import { offlineApi, apiGetCached } from '@/lib/offline/api-cache'

type CategoryId =
  | 'getting_started'
  | 'problems'
  | 'products'
  | 'equipment'
  | 'weather_seasons'
  | 'safety'
  | 'treatments'
  | 'faq'

interface GuideStep {
  title: string
  titleKey: string
  detail: string
  detailKey: string
  tip?: string
  tipKey?: string
  warning?: string
  warningKey?: string
}

interface Guide {
  id: string
  title: string
  titleKey: string
  category: CategoryId
  categoryLabelKey: string
  summary: string
  summaryKey: string
  durationMin: number
  level: 'beginner' | 'intermediate' | 'expert'
  tags: string[]
  steps: GuideStep[]
  relatedGuideIds?: string[]
}

interface Category {
  id: CategoryId
  label: string
  labelKey: string
  icon: string
}

interface Props {
  onNavigate?: (tab: TabId) => void
}

const LEVEL_CLS: Record<string, string> = {
  beginner: 'border-[oklch(0.7_0.15_155)]/30 bg-[oklch(0.7_0.15_155)]/10 text-[oklch(0.45_0.13_155)]',
  intermediate: 'border-gold/30 bg-gold/10 text-gold',
  expert: 'border-primary/30 bg-primary/10 text-primary',
}

// Free categories for the free plan: only getting_started + faq
const FREE_CATEGORIES: CategoryId[] = ['getting_started', 'faq']

export function ModuleGuides({ onNavigate }: Props) {
  const t = useTranslations('modules.guides')
  const td = useTranslations('guidesData')
  const messages = useMessages() as any
  const tagMessages: Record<string, unknown> = messages?.guidesData ?? {}

  /**
   * Translate a guide tag. Locale keys follow the convention
   * `tag_<normalized>` where `<normalized>` is the French tag lowercased with
   * accents stripped (e.g. 'sécurité' → 'tag_securite'). If no key exists,
   * fall back to the original French tag value (preserved in the data layer).
   */
  const translateTag = useCallback((tag: string): string => {
    const normalized = tag
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
    const key = `tag_${normalized}`
    if (tagMessages[key] != null) {
      return td(key as any)
    }
    return tag
  }, [tagMessages, td])
  const [guides, setGuides] = useState<Guide[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [recommended, setRecommended] = useState<Guide[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stale, setStale] = useState(false)

  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<CategoryId | 'all'>('all')
  const [selectedGuide, setSelectedGuide] = useState<Guide | null>(null)
  const [openingGuide, setOpeningGuide] = useState(false)
  const [currentPlanId, setCurrentPlanId] = useState<string>('free')

  const loadAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [listRes, recRes, subRes] = await Promise.all([
        offlineApi.guides(),
        apiGetCached<{ guides?: Guide[] }>('/api/guides?recommend=1&new=1&salt=1', 'guides'),
        offlineApi.subscription(),
      ])
      const listData = listRes.data as { guides?: Guide[]; categories?: Category[] } | null
      const recData = recRes.data
      const subData = subRes.data as { plan?: { id?: string } } | null
      setGuides(listData?.guides || [])
      setCategories(listData?.categories || [])
      setRecommended(recData?.guides || [])
      if (subData?.plan?.id) setCurrentPlanId(subData.plan.id)
      setStale(listRes.stale || recRes.stale || subRes.stale)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('error'))
      setStale(false)
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  async function openGuide(g: Guide) {
    // Premium gate: if user is on free plan and guide is in a paid category, show upsell
    const isPremium = !FREE_CATEGORIES.includes(g.category)
    if (isPremium && currentPlanId === 'free') {
      toast({
        title: t('premiumGuide'),
        description: t('premiumGuideDesc'),
      })
      if (onNavigate) onNavigate('paywall')
      return
    }
    setOpeningGuide(true)
    try {
      const { data } = await apiGetCached<{ guide?: Guide }>(
        `/api/guides?id=${encodeURIComponent(g.id)}`,
        'guides',
      )
      setSelectedGuide(data?.guide || g)
    } catch {
      setSelectedGuide(g)
    } finally {
      setOpeningGuide(false)
    }
  }

  function isGuidePremium(g: Guide) {
    return !FREE_CATEGORIES.includes(g.category)
  }

  function isGuideLocked(g: Guide) {
    return isGuidePremium(g) && currentPlanId === 'free'
  }

  // Filtered list (client-side search + category)
  const filtered = useMemo(() => {
    let list = guides
    if (activeCategory !== 'all') {
      list = list.filter((g) => g.category === activeCategory)
    }
    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (g) =>
          td(g.titleKey as any).toLowerCase().includes(q) ||
          td(g.summaryKey as any).toLowerCase().includes(q) ||
          g.tags.some((tag) => translateTag(tag).toLowerCase().includes(q))
      )
    }
    return list
  }, [guides, activeCategory, search, td, translateTag])

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-28" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-5">
        <Header t={t} />
        <Card className="glass-card">
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <AlertTriangle className="h-8 w-8 text-destructive" />
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button onClick={loadAll} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4" />
              {t('retry')}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <Header t={t} />
      {stale && (
        <p className="-mt-3 text-[11px] italic text-muted-foreground">{t('cached')}</p>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={t('searchTagPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Recommended */}
      {recommended.length > 0 && (
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-gold" />
            <h2 className="font-display text-lg font-semibold">{t('recommended')}</h2>
            <span className="h-px flex-1 bg-gold/20" />
          </div>
          <div className="custom-scroll flex gap-3 overflow-x-auto pb-2">
            {recommended.map((g) => (
              <button
                key={g.id}
                onClick={() => openGuide(g)}
                className="glass-card w-64 shrink-0 rounded-xl p-3 text-left transition-all hover:-translate-y-0.5 hover:border-gold/40"
              >
                <div className="mb-1 flex items-center gap-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wide text-gold">
                    {td(g.categoryLabelKey)}
                  </span>
                  {isGuideLocked(g) && <Lock className="ml-auto h-3 w-3 text-gold" />}
                </div>
                <p className="font-display text-sm font-bold leading-tight">{td(g.titleKey)}</p>
                <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">{td(g.summaryKey)}</p>
                <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {g.durationMin} {t('min')}
                  <Badge variant="outline" className={`ml-auto text-[9px] ${LEVEL_CLS[g.level] || ''}`}>
                    {t(`level.${g.level}`)}
                  </Badge>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Category filter */}
      <div className="custom-scroll flex flex-wrap gap-2">
        <CategoryPill
          active={activeCategory === 'all'}
          onClick={() => setActiveCategory('all')}
          label={t('all')}
          icon="📚"
        />
        {categories.map((c) => (
          <CategoryPill
            key={c.id}
            active={activeCategory === c.id}
            onClick={() => setActiveCategory(c.id)}
            label={td(c.labelKey)}
            icon={c.icon}
          />
        ))}
      </div>

      {/* Guide grid */}
      {filtered.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <BookOpen className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              {t('noResultsDesc')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((g) => {
            const locked = isGuideLocked(g)
            return (
              <Card
                key={g.id}
                className="glass-card group relative flex cursor-pointer flex-col overflow-hidden transition-all hover:-translate-y-0.5 hover:border-gold/40"
                onClick={() => openGuide(g)}
              >
                <CardContent className="flex flex-1 flex-col gap-2 p-4">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wide text-gold">
                      {td(g.categoryLabelKey)}
                    </span>
                    {isGuidePremium(g) && (
                      <Badge variant="outline" className="border-gold/40 bg-gold/10 px-1.5 text-[9px] font-bold text-gold">
                        {t('premiumBadge')}
                      </Badge>
                    )}
                    {locked && (
                      <Lock className="ml-auto h-3.5 w-3.5 text-gold" />
                    )}
                  </div>
                  <p className="font-display text-base font-bold leading-tight">{td(g.titleKey)}</p>
                  <p className="line-clamp-2 text-xs text-muted-foreground">{td(g.summaryKey)}</p>
                  <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
                    {g.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-secondary/60 px-2 py-0.5 text-[9px] font-medium text-muted-foreground"
                      >
                        {translateTag(tag)}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 border-t border-border/40 pt-2 text-[10px] text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {g.durationMin} {t('min')}
                    <Badge variant="outline" className={`ml-auto text-[9px] ${LEVEL_CLS[g.level] || ''}`}>
                      {t(`level.${g.level}`)}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Detail dialog */}
      <Dialog open={!!selectedGuide} onOpenChange={(o) => !o && setSelectedGuide(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          {selectedGuide && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-gold">
                    {td(selectedGuide.categoryLabelKey)}
                  </span>
                  {isGuidePremium(selectedGuide) && (
                    <Badge variant="outline" className="border-gold/40 bg-gold/10 px-1.5 text-[9px] font-bold text-gold">
                      {t('premiumBadge')}
                    </Badge>
                  )}
                </div>
                <DialogTitle className="font-display text-xl">{td(selectedGuide.titleKey)}</DialogTitle>
                <DialogDescription>{td(selectedGuide.summaryKey)}</DialogDescription>
              </DialogHeader>

              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {selectedGuide.durationMin} {t('min')}
                </span>
                <Badge variant="outline" className={LEVEL_CLS[selectedGuide.level] || ''}>
                  {t(`level.${selectedGuide.level}`)}
                </Badge>
              </div>

              <ol className="space-y-3">
                {selectedGuide.steps.map((s, i) => (
                  <li
                    key={i}
                    className="rounded-xl border border-border/50 bg-background/60 p-3"
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-gold text-xs font-bold text-primary-foreground">
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">{td(s.titleKey)}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{td(s.detailKey)}</p>
                        {s.tipKey && (
                          <p className="mt-2 flex items-start gap-1.5 rounded-md border border-gold/30 bg-gold/5 p-2 text-xs text-foreground/80">
                            <Lightbulb className="mt-0.5 h-3 w-3 shrink-0 text-gold" />
                            <span><strong className="text-gold">{t('tipLabel')}</strong> {td(s.tipKey as any)}</span>
                          </p>
                        )}
                        {s.warningKey && (
                          <p className="mt-2 flex items-start gap-1.5 rounded-md border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive">
                            <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                            <span><strong>{t('warningLabel')}</strong> {td(s.warningKey as any)}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>

              {selectedGuide.relatedGuideIds && selectedGuide.relatedGuideIds.length > 0 && (
                <div className="border-t border-border/40 pt-3">
                  <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    <Bookmark className="h-3 w-3" />
                    {t('related')}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedGuide.relatedGuideIds.map((id) => {
                      const r = guides.find((x) => x.id === id)
                      if (!r) return null
                      return (
                        <button
                          key={id}
                          onClick={() => openGuide(r)}
                          className="rounded-full border border-border/60 bg-secondary/40 px-3 py-1 text-xs font-medium hover:border-gold/40 hover:text-gold"
                        >
                          {td(r.titleKey)}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setSelectedGuide(null)}
                  className="border-border/60"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {t('close')}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Loading overlay */}
      {openingGuide && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full bg-background/95 px-4 py-2 text-xs shadow-lg border border-border/60">
          <RefreshCw className="h-3 w-3 animate-spin text-gold" />
          {t('opening')}
        </div>
      )}
    </div>
  )
}

function Header({ t }: { t: ReturnType<typeof useTranslations> }) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="section-label">{t('sectionLabel')}</span>
        <span className="h-px w-8 bg-gold/40" />
      </div>
      <h1 className="mt-1 font-display text-3xl font-bold tracking-tight sm:text-4xl">
        {t('headline')}
      </h1>
      <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
        {t('subtitle')}
      </p>
    </div>
  )
}

function CategoryPill({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean
  onClick: () => void
  label: string
  icon: string
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
        active
          ? 'border-gold/60 bg-gold/10 text-gold shadow-sm'
          : 'border-border bg-background hover:border-gold/30 hover:text-foreground'
      }`}
    >
      <span className="text-sm">{icon}</span>
      {label}
    </button>
  )
}
