'use client'

import { Sparkles, Droplets } from 'lucide-react'
import type { PoolProfileLite } from './types'

interface MobileHeaderProps {
  profile: PoolProfileLite | null
  onBackToLanding?: () => void
}

/**
 * AQWELIA — Mobile compact header (h-14 + safe-area-top).
 *
 * Layout: logo + "AQWELIA" wordmark + "Pro" badge ............ pool pill.
 * Gold divider line at the bottom (matches desktop Header).
 * Touch targets ≥ 44px. No hover effects (mobile-only).
 */
export function MobileHeader({ profile, onBackToLanding }: MobileHeaderProps) {
  return (
    <header
      className="mobile-header sticky top-0 z-40 w-full border-b border-border/40 bg-background/85 backdrop-blur-xl"
    >
      <div className="flex h-14 items-center justify-between px-4">
        {/* Left: logo + wordmark + Pro badge */}
        <button
          type="button"
          onClick={onBackToLanding}
          className="flex items-center gap-2.5 rounded-lg py-1 pr-2"
          aria-label="Retour à la landing page"
        >
          {/* Logo icon with gold gradient ring (32x32) */}
          <div className="relative">
            <div className="absolute -inset-[2px] rounded-[10px] bg-gradient-to-br from-gold via-ocean-light to-primary opacity-80 blur-[1.5px]" />
            <div className="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg shadow-md shadow-primary/25">
              <img
                src="/icon-aqwelia-48.png"
                alt="AQWELIA"
                className="h-8 w-8 object-cover"
              />
            </div>
          </div>

          <div className="flex items-center gap-1.5 leading-none">
            <span className="aqua-text-gradient text-base font-bold tracking-tight">
              AQWELIA
            </span>
            <span className="rounded-md border border-gold/40 bg-gold/10 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.16em] text-gold">
              Pro
            </span>
            <Sparkles className="ml-0.5 h-3 w-3 text-gold" aria-hidden />
          </div>
        </button>

        {/* Right: profile pill (pool name + volume) */}
        {profile ? (
          <div
            className="glass-pill flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium text-foreground/90"
            title={`${profile.name} — ${profile.volume} ${profile.unit === 'm3' ? 'm³' : 'gal'}`}
          >
            <Droplets className="h-3.5 w-3.5 text-primary" aria-hidden />
            <span className="max-w-[120px] truncate">{profile.name}</span>
            <span className="rounded-full bg-gold/15 px-1.5 py-0.5 text-[10px] font-bold text-gold">
              {profile.volume}
              {profile.unit === 'm3' ? ' m³' : ' gal'}
            </span>
          </div>
        ) : (
          <div className="glass-pill flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium text-muted-foreground">
            <Droplets className="h-3.5 w-3.5" aria-hidden />
            <span>Non configuré</span>
          </div>
        )}
      </div>

      {/* Gold divider line at the bottom */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent" />
    </header>
  )
}
