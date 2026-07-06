import { Sparkles, Droplets, ArrowLeft, Settings, LogOut, ChevronDown } from 'lucide-react'
import { useSession, signOut } from 'next-auth/react'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
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
          {/* AQWELIA logo icon with gold gradient ring */}
          <div className="relative">
            <div className="absolute -inset-[3px] rounded-[14px] bg-gradient-to-br from-gold via-ocean-light to-primary opacity-80 blur-[2px]" />
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl overflow-hidden shadow-lg shadow-primary/30">
              <img
                src="/icon-aqwelia-48.png"
                alt="AQWELIA"
                className="h-10 w-10 object-cover"
              />
            </div>
            <div className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-br from-gold to-[oklch(0.55_0.10_195)] shadow-md shadow-gold/40">
              <Sparkles className="h-2.5 w-2.5 text-white" />
            </div>
          </div>

          <div className="leading-tight">
            <div className="flex items-center gap-1.5 text-base font-bold tracking-tight">
              <button onClick={() => onNavigate('today')} className="hover:opacity-80">
                <span className="aqua-text-gradient">AQWELIA</span>
              </button>
              <span className="ml-0.5 rounded-md border border-gold/40 bg-gold/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-gold">
                Pro
              </span>
            </div>
            <div className="hidden text-[10px] uppercase tracking-[0.22em] text-muted-foreground sm:block">
              Copilote piscine
            </div>
          </div>
        </div>

        <nav className="hidden items-center gap-0.5 lg:flex">
          {[
            { id: 'today' as const, label: "Aujourd'hui" },
            { id: 'diagnostic' as const, label: 'Diagnostic' },
            { id: 'water' as const, label: 'Analyse eau' },
            { id: 'plan' as const, label: "Plan d'action" },
            { id: 'log' as const, label: 'Carnet' },
            { id: 'maintenance' as const, label: 'Matériel' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                activeTab === item.id
                  ? 'bg-secondary/70 text-foreground'
                  : 'text-muted-foreground hover:bg-secondary/40 hover:text-foreground'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {onBackToLanding && (
            <button
              onClick={onBackToLanding}
              className="glass-pill flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-foreground/90 transition-colors hover:border-gold/40 hover:text-gold"
              title="Retour à la landing page"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Landing</span>
            </button>
          )}
          {profile && (
            <button
              onClick={() => onNavigate('maintenance')}
              className="glass-pill flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium text-foreground/90 transition-colors hover:border-gold/40"
              title="Profil piscine — cliquez pour gérer le matériel"
            >
              <Droplets className="h-3.5 w-3.5 text-primary" />
              <span className="hidden sm:inline">{profile.name}</span>
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
            IA en ligne
          </span>

          {/* User menu */}
          {session?.user && (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="glass-pill flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium text-foreground/90 transition-colors hover:border-gold/40"
                aria-label="Menu utilisateur"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-primary to-gold text-[10px] font-bold text-white">
                  {(session.user.name || session.user.email || 'U').charAt(0).toUpperCase()}
                </div>
                <span className="hidden max-w-[120px] truncate sm:inline">
                  {session.user.name || session.user.email?.split('@')[0]}
                </span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-border/60 bg-background/95 shadow-xl backdrop-blur-xl">
                  <div className="border-b border-border/40 px-4 py-3">
                    <p className="text-sm font-semibold text-foreground">{session.user.name || 'Utilisateur'}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{session.user.email}</p>
                  </div>
                  <Link
                    href="/settings"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground transition-colors hover:bg-secondary/60"
                  >
                    <Settings className="h-4 w-4 text-muted-foreground" />
                    Paramètres
                  </Link>
                  <button
                    onClick={() => signOut({ callbackUrl: '/' })}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-destructive transition-colors hover:bg-destructive/5"
                  >
                    <LogOut className="h-4 w-4" />
                    Déconnexion
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
