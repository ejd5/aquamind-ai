import { Droplets, ArrowLeft, Settings, LogOut, ChevronDown, Plus, Check, Trash2, Users } from 'lucide-react'
import { useSession, signOut } from 'next-auth/react'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { getDefaultPoolNameKey, getDefaultAccountNameKey } from '@/lib/pool/default-names'
import type { TabId, PoolProfileLite } from './app-shell'
import { FamilyManager } from './family-manager'

interface HeaderProps {
  profile: PoolProfileLite | null
  /** All user pools (for the switcher). If undefined → still loading; if [] → no pool yet. */
  pools?: PoolProfileLite[]
  /** Can the user add another pool? (plan gate) */
  canAddPool?: boolean
  /** Called when the user selects a different pool in the switcher. */
  onSwitchPool?: (id: string) => void
  /** Called when the user clicks "Add pool". */
  onAddPool?: () => void
  /** Called when the user clicks the trash icon next to a pool in the switcher. */
  onDeletePool?: (id: string) => void
  activeTab: TabId
  onNavigate: (tab: TabId) => void
  onBackToLanding?: () => void
}

export function Header({
  profile,
  pools,
  canAddPool,
  onSwitchPool,
  onAddPool,
  onDeletePool,
  activeTab,
  onNavigate,
  onBackToLanding,
}: HeaderProps) {
  const { data: session } = useSession()
  const [menuOpen, setMenuOpen] = useState(false)
  const [poolOpen, setPoolOpen] = useState(false)
  const [familyOpen, setFamilyOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const poolRef = useRef<HTMLDivElement>(null)
  const t = useTranslations('nav')
  const tl = useTranslations('landing')
  const tc = useTranslations('common')
  const tp = useTranslations('pool')
  const tfam = useTranslations('family')

  // Helper: translate account name if it's a French default, else show as-is
  const displayName = (name?: string | null) => {
    if (!name) return ''
    const key = getDefaultAccountNameKey(name)
    return key ? tc(key as any) : name
  }

  const displayPoolName = (name?: string | null) => {
    if (!name) return ''
    const key = getDefaultPoolNameKey(name)
    return key ? tc(key as any) : name
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
      if (poolRef.current && !poolRef.current.contains(e.target as Node)) {
        setPoolOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const hasMultiplePools = (pools?.length || 0) > 1
  return (
    <header className="sticky top-0 z-50 w-full border-b border-gold/20 bg-background/40 backdrop-blur-xl">
      {/* Subtle gold line at the bottom */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent" />

      <div className="mx-auto flex h-32 max-w-7xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          {/* AQWELIA logo — standalone, no frame, no background */}
          <img
            src="/logo-aqwelia-web.png"
            alt="AQWELIA"
            className="h-24 w-auto object-contain"
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
            <div className="relative" ref={poolRef}>
              <button
                onClick={() => {
                  // Only open the switcher if there's actually a choice, or if add is allowed.
                  if (hasMultiplePools || canAddPool) {
                    setPoolOpen((v) => !v)
                  } else {
                    onNavigate('maintenance')
                  }
                }}
                className="glass-pill flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium text-foreground/90 transition-colors hover:border-gold/40"
                title={t('poolProfileTitle')}
              >
                <Droplets className="h-3.5 w-3.5 text-primary" />
                <span className="hidden sm:inline">{displayPoolName(profile.name)}</span>
                <span className="rounded-full bg-gold/15 px-1.5 py-0.5 text-[10px] font-bold text-gold">
                  {profile.volume}
                  {profile.unit === 'm3' ? ' m³' : ' gal'}
                </span>
                {(hasMultiplePools || canAddPool) && (
                  <ChevronDown className={`h-3 w-3 text-muted-foreground transition-transform ${poolOpen ? 'rotate-180' : ''}`} />
                )}
              </button>

              {poolOpen && (hasMultiplePools || canAddPool) && (
                <div className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border border-border/60 bg-background/95 shadow-xl backdrop-blur-xl">
                  <div className="border-b border-border/40 px-4 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {tp('myPools')}
                    </p>
                  </div>
                  <ul className="max-h-64 overflow-y-auto py-1">
                    {pools?.map((p) => {
                      const isActive = p.id === profile.id
                      return (
                        <li key={p.id}>
                          <div className="flex items-center gap-1 pr-2">
                            <button
                              onClick={() => {
                                onSwitchPool?.(p.id)
                                setPoolOpen(false)
                              }}
                              className={`flex flex-1 items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-secondary/60 ${
                                isActive ? 'bg-gold/10 text-foreground' : 'text-foreground/90'
                              }`}
                            >
                              <Droplets className={`h-3.5 w-3.5 ${isActive ? 'text-gold' : 'text-muted-foreground'}`} />
                              <span className="flex-1 truncate">{displayPoolName(p.name)}</span>
                              <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">
                                {p.volume}{p.unit === 'm3' ? ' m³' : ' gal'}
                              </span>
                              {isActive && <Check className="h-3.5 w-3.5 text-gold" />}
                            </button>
                            {hasMultiplePools && onDeletePool && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onDeletePool(p.id)
                                }}
                                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                                title={tp('deletePool')}
                                aria-label={tp('deletePool')}
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                  {canAddPool && (
                    <button
                      onClick={() => {
                        onAddPool?.()
                        setPoolOpen(false)
                      }}
                      className="flex w-full items-center gap-2 border-t border-border/40 px-3 py-2.5 text-sm font-medium text-gold transition-colors hover:bg-gold/10"
                    >
                      <Plus className="h-4 w-4" />
                      {tp('addPool')}
                    </button>
                  )}
                  {!canAddPool && (
                    <div className="border-t border-border/40 px-3 py-2 text-[10px] text-muted-foreground">
                      {tp('upgradeForMorePools')}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          {/* AQWELIA Family — pool sharing trigger */}
          {profile && (
            <>
              <button
                onClick={() => setFamilyOpen(true)}
                className="glass-pill flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-foreground/90 transition-colors hover:border-gold/40 hover:text-gold"
                aria-label={tfam('triggerAria')}
                title={tfam('triggerTitle')}
              >
                <Users className="h-3.5 w-3.5 text-gold" />
                <span className="hidden lg:inline">{tfam('sharedBadge')}</span>
              </button>
              <FamilyManager
                open={familyOpen}
                onClose={() => setFamilyOpen(false)}
                poolId={profile.id}
                poolName={displayPoolName(profile.name)}
              />
            </>
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
