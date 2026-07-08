import { Sparkles, Droplets, ArrowLeft, Settings, LogOut, ChevronDown } from 'lucide-react'
import { useSession, signOut } from 'next-auth/react'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { getDefaultPoolNameKey, getDefaultAccountNameKey } from '@/lib/pool/default-names'
import type { TabId, PoolProfileLite } from './app-shell'

interface HeaderProps {
  profile: PoolProfileLite | null
  activeTab: TabId
  onNavigate: (tab: TabId) => void
  onBackToLanding?: () => void
}

export function Header({ profile, activeTab, onNavigate, onBackToLanding }: HeaderProps) {
  const { data: session } = useSession()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const t = useTranslations('nav')
  const tl = useTranslations('landing')
  const tc = useTranslations('common')

  // Helper: translate account name if it's a French default, else show as-is
  const displayName = (name?: string | null) => {
    if (!name) return ''
    const key = getDefaultAccountNameKey(name)
    return key ? tc(key as any) : name
  }

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
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/70 backdrop-blur-2xl">
      {/* Subtle gold line at the bottom */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent" />

      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          {/* AQWELIA logo — standalone, no frame, no background */}
          <img
            src="/icon-aqwelia-48.png"
            alt="AQWELIA"
            className="h-12 w-12 object-contain"
          />

          <div className="leading-tight">
            <div className="flex items-center gap-1.5 text-base font-bold tracking-tight">
              <button onClick={() => onNavigate('today')} className="hover:opacity-80">
                <span className="aqua-text-gradient">AQWELIA</span>
              </button>
              <span className="ml-0.5 rounded-md border border-gold/40 bg-gold/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-gold">
                {t('pro')}
              </span>
            </div>
            <div className="hidden text-[10px] uppercase tracking-[0.22em] text-muted-foreground sm:block">
              {tl('headerCopilote')}
            </div>
          </div>
        </div>

        {/* Top nav removed — sidebar (desktop) and bottom nav (mobile) handle navigation.
            This avoids duplication between top nav and sidebar. */}

        <div className="flex items-center gap-2">
          {onBackToLanding && (
            <button
              onClick={onBackToLanding}
              className="glass-pill flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-foreground/90 transition-colors hover:border-gold/40 hover:text-gold"
              title={t('backToLandingTitle')}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t('landing')}</span>
            </button>
          )}
          {profile && (
            <button
              onClick={() => onNavigate('maintenance')}
              className="glass-pill flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium text-foreground/90 transition-colors hover:border-gold/40"
              title={t('poolProfileTitle')}
            >
              <Droplets className="h-3.5 w-3.5 text-primary" />
              <span className="hidden sm:inline">{(() => { const k = getDefaultPoolNameKey(profile.name); return k ? tc(k as any) : profile.name })()}</span>
              <span className="rounded-full bg-gold/15 px-1.5 py-0.5 text-[10px] font-bold text-gold">
                {profile.volume}
                {profile.unit === 'm3' ? ' m³' : ' gal'}
              </span>
            </button>
          )}
          <span className="glass-pill hidden items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-foreground/80 sm:flex">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-gold shadow-[0_0_8px_oklch(0.65_0.11_195)]" />
            </span>
            {t('online')}
          </span>

          {/* User menu */}
          {session?.user && (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="glass-pill flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium text-foreground/90 transition-colors hover:border-gold/40"
                aria-label={t('userMenuAria')}
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-primary to-gold text-[10px] font-bold text-white">
                  {(displayName(session.user.name) || session.user.email || 'U').charAt(0).toUpperCase()}
                </div>
                <span className="hidden max-w-[120px] truncate sm:inline">
                  {displayName(session.user.name) || session.user.email?.split('@')[0]}
                </span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-border/60 bg-background/95 shadow-xl backdrop-blur-xl">
                  <div className="border-b border-border/40 px-4 py-3">
                    <p className="text-sm font-semibold text-foreground">{displayName(session.user.name) || t('user')}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{session.user.email}</p>
                  </div>
                  <Link
                    href="/settings"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground transition-colors hover:bg-secondary/60"
                  >
                    <Settings className="h-4 w-4 text-muted-foreground" />
                    {t('settings')}
                  </Link>
                  <button
                    onClick={() => signOut({ callbackUrl: '/' })}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-destructive transition-colors hover:bg-destructive/5"
                  >
                    <LogOut className="h-4 w-4" />
                    {t('signOut')}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
