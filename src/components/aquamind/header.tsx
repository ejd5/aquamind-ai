import { Waves, Sparkles, Droplets, ArrowLeft } from 'lucide-react'
import type { TabId, PoolProfileLite } from './app-shell'

interface HeaderProps {
  profile: PoolProfileLite | null
  activeTab: TabId
  onNavigate: (tab: TabId) => void
  onBackToLanding?: () => void
}

export function Header({ profile, activeTab, onNavigate, onBackToLanding }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/70 backdrop-blur-2xl">
      {/* Subtle gold line at the bottom */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent" />

      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          {/* Logo with gold gradient ring */}
          <div className="relative">
            <div className="absolute -inset-[3px] rounded-[14px] bg-gradient-to-br from-gold via-[oklch(0.7_0.1_170)] to-primary opacity-80 blur-[2px]" />
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-[oklch(0.35_0.1_195)] shadow-lg shadow-primary/30">
              <Waves className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-br from-[oklch(0.85_0.14_85)] to-[oklch(0.65_0.12_85)] shadow-md shadow-gold/40">
              <Sparkles className="h-2.5 w-2.5 text-white" />
            </div>
          </div>

          <div className="leading-tight">
            <div className="flex items-center gap-1.5 text-base font-bold tracking-tight">
              <button onClick={() => onNavigate('today')} className="hover:opacity-80">
                <span>AquaMind</span>
                <span className="aqua-text-gradient">AI</span>
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
              <span className="relative inline-flex h-2 w-2 rounded-full bg-gold shadow-[0_0_8px_oklch(0.75_0.13_85)]" />
            </span>
            IA en ligne
          </span>
        </div>
      </div>
    </header>
  )
}
