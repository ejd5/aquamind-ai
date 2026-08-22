'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type {
  RuntimeBanner,
  RuntimeContent,
  RuntimePopup,
  RuntimeZone,
} from '@/lib/admin-runtime/content'

export const AQWELIA_MARKETING_TRIGGER_EVENT = 'aqwelia:marketing-trigger'

export type MarketingTrigger = RuntimePopup['trigger']

export function dispatchMarketingTrigger(trigger: MarketingTrigger) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent(AQWELIA_MARKETING_TRIGGER_EVENT, { detail: { trigger } })
  )
}

const BANNER_STYLES: Record<RuntimeBanner['variant'], string> = {
  LAGOON:
    'border-lagoon/35 bg-gradient-to-r from-lagoon/20 via-aqua-vivid/12 to-mist/70 text-deep-teal',
  CHAMPAGNE:
    'border-champagne/45 bg-gradient-to-r from-champagne/20 via-champagne/10 to-background text-foreground',
  NIGHT:
    'border-deep-teal/70 bg-gradient-to-r from-[#073C45] via-[#0A5660] to-[#073C45] text-white',
}

function isExternalUrl(url: string): boolean {
  return url.startsWith('https://')
}

function popupStorageKey(popup: RuntimePopup, scope: 'session' | 'once' | 'remind') {
  return `aqwelia:marketing:${scope}:${popup.id}:v${popup.version}`
}

function canShowByFrequency(popup: RuntimePopup): boolean {
  if (typeof window === 'undefined') return false
  try {
    // Any popup is shown at most once per browser session, even when its
    // persistent frequency allows a later impression.
    if (sessionStorage.getItem(popupStorageKey(popup, 'session'))) return false

    if (popup.frequency === 'ONCE') {
      return !localStorage.getItem(popupStorageKey(popup, 'once'))
    }
    if (popup.frequency === 'PER_SESSION') return true

    const previous = localStorage.getItem(popupStorageKey(popup, 'remind'))
    if (!previous) return true
    const previousAt = Number(previous)
    if (!Number.isFinite(previousAt)) return true
    const waitMs = popup.reminderDays * 24 * 60 * 60 * 1000
    return Date.now() - previousAt >= waitMs
  } catch {
    // Storage may be unavailable in hardened/private WebViews. In that case,
    // fail open for presentation only; server-side eligibility is unchanged.
    return true
  }
}

function markPopupImpression(popup: RuntimePopup) {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(popupStorageKey(popup, 'session'), '1')
    if (popup.frequency === 'ONCE') {
      localStorage.setItem(popupStorageKey(popup, 'once'), '1')
    }
    if (popup.frequency === 'REMIND_DAYS') {
      localStorage.setItem(popupStorageKey(popup, 'remind'), String(Date.now()))
    }
  } catch {
    // Non-critical: frequency persistence must never break the product.
  }
}

function Banner({ banner }: { banner: RuntimeBanner }) {
  const style = BANNER_STYLES[banner.variant]
  const ctaExternal = banner.ctaUrl ? isExternalUrl(banner.ctaUrl) : false

  return (
    <section
      data-testid="admin-runtime-banner"
      className={`relative z-30 border-b px-4 py-2.5 shadow-sm backdrop-blur-xl ${style}`}
      role="status"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-3 text-center sm:gap-4">
        <p className="text-sm font-semibold leading-5 sm:text-[15px]">{banner.text}</p>
        {banner.ctaUrl && banner.ctaLabel ? (
          <a
            href={banner.ctaUrl}
            target={ctaExternal ? '_blank' : undefined}
            rel={ctaExternal ? 'noopener noreferrer' : undefined}
            className="shrink-0 rounded-full border border-current/20 bg-white/70 px-3 py-1.5 text-xs font-bold shadow-sm transition hover:-translate-y-0.5 hover:bg-white/90"
          >
            {banner.ctaLabel}
          </a>
        ) : null}
      </div>
    </section>
  )
}

function PopupDialog({ popup, onClose }: { popup: RuntimePopup; onClose: () => void }) {
  const t = useTranslations('common')
  const ctaExternal = popup.ctaUrl ? isExternalUrl(popup.ctaUrl) : false

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div
      data-testid="admin-runtime-popup-backdrop"
      className="fixed inset-0 z-[120] flex items-center justify-center bg-night/55 p-4 backdrop-blur-sm"
      onMouseDown={onClose}
    >
      <section
        data-testid="admin-runtime-popup"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`runtime-popup-title-${popup.id}`}
        className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[28px] border border-lagoon/25 bg-background/95 p-5 shadow-2xl shadow-deep-teal/25 backdrop-blur-2xl sm:p-7"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={t('close')}
          className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-background/80 text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        {popup.imageUrl ? (
          <div className="mb-5 overflow-hidden rounded-2xl border border-border/50 bg-mist/50">
            <img
              src={popup.imageUrl}
              alt=""
              className="max-h-60 w-full object-cover"
            />
          </div>
        ) : null}

        <div className="pr-8">
          <div className="mb-3 h-1 w-12 rounded-full bg-gradient-to-r from-lagoon to-aqua-vivid" />
          <h2
            id={`runtime-popup-title-${popup.id}`}
            className="font-display text-2xl font-bold tracking-tight text-foreground"
          >
            {popup.title}
          </h2>
          <p className="mt-3 whitespace-pre-line text-sm leading-6 text-muted-foreground">
            {popup.body}
          </p>
        </div>

        {popup.ctaUrl && popup.ctaLabel ? (
          <div className="mt-6">
            <a
              href={popup.ctaUrl}
              target={ctaExternal ? '_blank' : undefined}
              rel={ctaExternal ? 'noopener noreferrer' : undefined}
              onClick={onClose}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-gradient-to-r from-lagoon to-aqua-vivid px-5 py-2.5 text-sm font-bold text-deep-teal shadow-lg shadow-lagoon/20 transition hover:-translate-y-0.5 sm:w-auto"
            >
              {popup.ctaLabel}
            </a>
          </div>
        ) : null}
      </section>
    </div>
  )
}

export function MarketingRuntime({ zone }: { zone: RuntimeZone }) {
  const [content, setContent] = useState<RuntimeContent>({ banner: null, popups: [] })
  const [activePopup, setActivePopup] = useState<RuntimePopup | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    setContent({ banner: null, popups: [] })
    setActivePopup(null)

    fetch(`/api/content/runtime?zone=${encodeURIComponent(zone)}`, {
      method: 'GET',
      cache: 'no-store',
      credentials: 'same-origin',
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) return { banner: null, popups: [] } as RuntimeContent
        return (await response.json()) as RuntimeContent
      })
      .then((next) => {
        if (!controller.signal.aborted) setContent(next)
      })
      .catch(() => {
        if (!controller.signal.aborted) setContent({ banner: null, popups: [] })
      })

    return () => controller.abort()
  }, [zone])

  const popups = useMemo(() => content.popups || [], [content.popups])

  const showFirstForTrigger = useCallback(
    (trigger: MarketingTrigger) => {
      if (activePopup) return
      const popup = popups.find(
        (candidate) => candidate.trigger === trigger && canShowByFrequency(candidate)
      )
      if (!popup) return
      markPopupImpression(popup)
      setActivePopup(popup)
    },
    [activePopup, popups]
  )

  useEffect(() => {
    if (popups.length === 0) return
    showFirstForTrigger('ON_LOAD')
  }, [popups, showFirstForTrigger])

  useEffect(() => {
    const onMouseOut = (event: MouseEvent) => {
      if (event.relatedTarget === null && event.clientY <= 0) {
        showFirstForTrigger('ON_EXIT')
      }
    }
    document.addEventListener('mouseout', onMouseOut)
    return () => document.removeEventListener('mouseout', onMouseOut)
  }, [showFirstForTrigger])

  useEffect(() => {
    const onMarketingTrigger = (event: Event) => {
      const trigger = (event as CustomEvent<{ trigger?: MarketingTrigger }>).detail?.trigger
      if (trigger) showFirstForTrigger(trigger)
    }
    window.addEventListener(AQWELIA_MARKETING_TRIGGER_EVENT, onMarketingTrigger)
    return () => window.removeEventListener(AQWELIA_MARKETING_TRIGGER_EVENT, onMarketingTrigger)
  }, [showFirstForTrigger])

  return (
    <>
      {content.banner ? <Banner banner={content.banner} /> : null}
      {activePopup ? (
        <PopupDialog popup={activePopup} onClose={() => setActivePopup(null)} />
      ) : null}
    </>
  )
}
