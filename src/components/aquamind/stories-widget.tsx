'use client'

/**
 * AQWELIA Stories — horizontal carousel of short video tutorials.
 *
 * Each story is a 150x200 card with a thumbnail (placeholder gradient), a
 * title, a duration badge and a topic emoji. Clicking opens a player modal
 * (no real video yet — placeholder + share buttons).
 *
 * i18n: titles come from `stories.topics.<id>` namespace. Share buttons use
 * `stories.shareTikTok`, `stories.shareInstagram`, `stories.shareCopy`.
 */
import { useCallback, useEffect, useState } from 'react'
import { Play, X, Clock, Share2, Copy, Check, ExternalLink } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { toast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

interface Story {
  id: string
  topicKey: string
  guideId: string | null
  durationSec: number
  thumbnailHue: number
  category: string
}

interface StoriesWidgetProps {
  /** Limit the number of cards displayed (default 6). */
  limit?: number
}

export function StoriesWidget({ limit = 6 }: StoriesWidgetProps) {
  const t = useTranslations('stories')
  const tc = useTranslations('common')
  const [stories, setStories] = useState<Story[]>([])
  const [loading, setLoading] = useState(true)
  const [activeStory, setActiveStory] = useState<Story | null>(null)
  const [shareOpen, setShareOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/stories', { cache: 'no-store' })
      if (!res.ok) throw new Error('fetch failed')
      const data = await res.json()
      setStories(data.stories || [])
    } catch {
      setStories([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Lock body scroll when modal is open.
  useEffect(() => {
    if (activeStory) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [activeStory])

  // Esc to close
  useEffect(() => {
    if (!activeStory) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (shareOpen) setShareOpen(false)
        else setActiveStory(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [activeStory, shareOpen])

  const storyTitle = (s: Story) => {
    try {
      return t(`topics.${s.topicKey}` as any)
    } catch {
      return s.topicKey
    }
  }

  const shareUrl = (s: Story) => {
    if (typeof window === 'undefined') return `https://aqwelia.app/stories/${s.id}`
    return `${window.location.origin}/guides?id=${s.guideId || s.id}`
  }

  const handleCopy = async (s: Story) => {
    try {
      await navigator.clipboard.writeText(shareUrl(s))
      setCopied(true)
      toast({ title: t('shareCopied') })
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast({ title: tc('error'), variant: 'destructive' })
    }
  }

  return (
    <section aria-label={t('title')} className="space-y-3">
      <div className="flex items-end justify-between gap-2">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="section-label">{t('subtitle')}</span>
            <span className="h-px w-8 bg-gold/40" />
          </div>
          <h2 className="mt-1 font-display text-2xl font-bold tracking-tight sm:text-3xl">
            {t('title')}
          </h2>
        </div>
      </div>

      {loading ? (
        <div className="custom-scroll flex gap-3 overflow-x-auto pb-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[200px] w-[150px] shrink-0 rounded-2xl" />
          ))}
        </div>
      ) : stories.length === 0 ? null : (
        <div className="custom-scroll flex gap-3 overflow-x-auto pb-2">
          {stories.slice(0, limit).map((s) => {
            const hue = s.thumbnailHue
            return (
              <button
                key={s.id}
                onClick={() => setActiveStory(s)}
                className="group relative h-[200px] w-[150px] shrink-0 overflow-hidden rounded-2xl border border-gold/20 text-left transition-all hover:-translate-y-0.5 hover:border-gold/50 hover:shadow-lg hover:shadow-primary/20"
                style={{
                  background: `linear-gradient(135deg, oklch(0.45 0.13 ${hue}) 0%, oklch(0.35 0.15 ${hue + 20}) 100%)`,
                }}
                aria-label={`${t('watch')} — ${storyTitle(s)}`}
              >
                {/* Top sheen */}
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
                {/* Emoji + play overlay */}
                <div className="absolute inset-0 flex flex-col justify-between p-2.5">
                  <div className="flex items-start justify-between">
                    <span className="text-2xl drop-shadow-lg">{s.category}</span>
                    <span className="flex items-center gap-0.5 rounded-full bg-black/40 px-1.5 py-0.5 text-[9px] font-semibold text-white backdrop-blur-sm">
                      <Clock className="h-2.5 w-2.5" />
                      {t('duration', { sec: s.durationSec })}
                    </span>
                  </div>
                  <div>
                    <p className="font-display text-sm font-bold leading-tight text-white drop-shadow-md">
                      {storyTitle(s)}
                    </p>
                    <div className="mt-1.5 flex items-center gap-1 text-[10px] font-semibold text-white/90 opacity-0 transition-opacity group-hover:opacity-100">
                      <Play className="h-3 w-3" />
                      {t('watch')}
                    </div>
                  </div>
                </div>
                {/* Glossy overlay */}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-white/10" />
              </button>
            )
          })}
        </div>
      )}

      {/* Player modal */}
      {activeStory && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t('playerAria')}
          className="fixed inset-0 z-[110] flex items-center justify-center bg-background/80 backdrop-blur-2xl"
          onClick={() => setActiveStory(null)}
        >
          <div
            className="relative w-full max-w-md overflow-hidden rounded-3xl border border-gold/20 bg-background/95 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent" />
            <button
              onClick={() => setActiveStory(null)}
              aria-label={t('closePlayer')}
              className="absolute right-3 top-3 z-10 rounded-full bg-black/40 p-1.5 text-white transition-colors hover:bg-destructive/60"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Video placeholder (gradient) */}
            <div
              className="relative flex aspect-[9/16] max-h-[60vh] w-full items-center justify-center"
              style={{
                background: `linear-gradient(135deg, oklch(0.45 0.13 ${activeStory.thumbnailHue}) 0%, oklch(0.35 0.15 ${activeStory.thumbnailHue + 20}) 100%)`,
              }}
            >
              <div className="flex flex-col items-center gap-2 text-white">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                  <Play className="h-6 w-6 fill-white" />
                </div>
                <span className="rounded-full bg-black/40 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                  {t('placeholder')}
                </span>
                <p className="mt-1 text-center text-3xl">{activeStory.category}</p>
              </div>
            </div>

            {/* Title + actions */}
            <div className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    {t('duration', { sec: activeStory.durationSec })}
                  </p>
                  <h3 className="mt-0.5 font-display text-lg font-bold tracking-tight">
                    {storyTitle(activeStory)}
                  </h3>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShareOpen((v) => !v)}
                  className="border-gold/40"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  {t('share')}
                </Button>
              </div>

              {shareOpen && (
                <div className="rounded-xl border border-border/60 bg-secondary/40 p-2.5">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {t('shareTitle')}
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    <a
                      href={`https://www.tiktok.com/upload?refer=screen&${new URLSearchParams({
                        url: shareUrl(activeStory),
                      }).toString()}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col items-center gap-1 rounded-lg border border-border/50 bg-background/60 p-2 text-[10px] font-medium transition-colors hover:border-gold/40 hover:bg-gold/5"
                    >
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                      {t('shareTikTok')}
                    </a>
                    <a
                      href={`https://www.instagram.com/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col items-center gap-1 rounded-lg border border-border/50 bg-background/60 p-2 text-[10px] font-medium transition-colors hover:border-gold/40 hover:bg-gold/5"
                    >
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                      {t('shareInstagram')}
                    </a>
                    <button
                      onClick={() => handleCopy(activeStory)}
                      className="flex flex-col items-center gap-1 rounded-lg border border-border/50 bg-background/60 p-2 text-[10px] font-medium transition-colors hover:border-gold/40 hover:bg-gold/5"
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-[oklch(0.7_0.15_155)]" />
                      ) : (
                        <Copy className="h-4 w-4 text-muted-foreground" />
                      )}
                      {t('shareCopy')}
                    </button>
                  </div>
                </div>
              )}

              {activeStory.guideId && (
                <a
                  href={`/guides?id=${activeStory.guideId}`}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-gold px-3 py-2 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                >
                  <Play className="h-3.5 w-3.5" />
                  {t('watch')}
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
