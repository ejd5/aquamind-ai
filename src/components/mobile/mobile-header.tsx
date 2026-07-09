'use client'

import { Sparkles, Droplets } from 'lucide-react'
import { useSession, signOut } from 'next-auth/react'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
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
  const t = useTranslations('nav')
  const { data: session } = useSession()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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
          aria-label={t('backToLanding')}
        >
          {/* Logo icon with gold gradient ring (32x32) */}
          <div className="relative">
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
              {t('pro')}
            </span>
            <Sparkles className="ml-0.5 h-3 w-3 text-gold" aria-hidden />
          </div>
        </button>

        {/* Right: profile pill (pool name + volume) + user avatar */}
        <div className="flex items-center gap-2">
          {profile ? (
            <div
              className="glass-pill flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium text-foreground/90"
              title={`${profile.name} — ${profile.volume} ${profile.unit === 'm3' ? 'm³' : 'gal'}`}
            >
              <Droplets className="h-3.5 w-3.5 text-primary" aria-hidden />
              <span className="max-w-[80px] truncate">{profile.name}</span>
              <span className="rounded-full bg-gold/15 px-1.5 py-0.5 text-[10px] font-bold text-gold">
                {profile.volume}
                {profile.unit === 'm3' ? ' m³' : ' gal'}
              </span>
            </div>
          ) : null}

          {/* User avatar + menu */}
          {session?.user && (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-gold text-xs font-bold text-white shadow-md"
                aria-label={t('userMenuAria')}
              >
                {(session.user.name || session.user.email || 'U').charAt(0).toUpperCase()}
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-border/60 bg-background/95 shadow-xl backdrop-blur-xl">
                  <div className="border-b border-border/40 px-4 py-3">
                    <p className="text-sm font-semibold text-foreground">{session.user.name || t('user')}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{session.user.email}</p>
                  </div>
                  <Link
                    href="/settings"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground transition-colors hover:bg-secondary/60"
                  >
                    <svg className="h-4 w-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                    {t('settings')}
                  </Link>
                  <button
                    onClick={() => signOut({ callbackUrl: '/' })}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-destructive transition-colors hover:bg-destructive/5"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                    {t('signOut')}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Gold divider line at the bottom */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent" />
    </header>
  )
}
