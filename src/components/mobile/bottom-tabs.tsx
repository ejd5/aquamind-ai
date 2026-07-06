'use client'

import { Home, Droplets, MessageCircle, Wrench, User } from 'lucide-react'
import type { MobileScreen } from './types'

interface TabDef {
  id: MobileScreen
  label: string
  icon: typeof Home
}

const TABS: readonly TabDef[] = [
  { id: 'home', label: 'Accueil', icon: Home },
  { id: 'analyses', label: 'Analyses', icon: Droplets },
  { id: 'assistant', label: 'Assistant', icon: MessageCircle },
  { id: 'maintenance', label: 'Entretien', icon: Wrench },
  { id: 'profile', label: 'Profil', icon: User },
] as const

interface BottomTabsProps {
  activeTab: MobileScreen
  onNavigate: (screen: MobileScreen) => void
}

/**
 * AQWELIA — Mobile bottom tabs.
 *
 * Fixed at the bottom of the viewport, with `env(safe-area-inset-bottom)`
 * padding to clear the iOS home indicator. 5 entries, each `flex-1`,
 * with a 24px icon + 10px label. Active tab uses the gold accent
 * (`text-gold`) and a filled icon container; inactive tabs use
 * `text-muted-foreground`. Touch target ≥ 56px. No hover effects.
 */
export function BottomTabs({ activeTab, onNavigate }: BottomTabsProps) {
  return (
    <nav
      className="mobile-bottom-tabs border-t border-border/40 bg-background/95 backdrop-blur-lg"
      role="tablist"
      aria-label="Navigation principale"
    >
      <div className="flex items-stretch">
        {TABS.map((tab) => {
          const Icon = tab.icon
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              aria-current={active ? 'page' : undefined}
              onClick={() => onNavigate(tab.id)}
              className={`flex min-h-[56px] flex-1 flex-col items-center justify-center gap-1 px-1 py-2 transition-colors active:opacity-70 ${
                active ? 'text-gold' : 'text-muted-foreground'
              }`}
            >
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${
                  active
                    ? 'bg-gradient-to-br from-gold/20 to-primary/15 text-gold'
                    : 'bg-transparent'
                }`}
                aria-hidden
              >
                <Icon
                  className="h-5 w-5"
                  strokeWidth={active ? 2.4 : 1.8}
                  fill={active ? 'currentColor' : 'none'}
                  fillOpacity={active ? 0.18 : 0}
                />
              </span>
              <span className="text-[10px] font-medium leading-none">
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
