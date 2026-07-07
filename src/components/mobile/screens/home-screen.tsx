'use client'

import { useTranslations } from 'next-intl'

import { Sun } from 'lucide-react'
import { ModuleDashboard } from '../../aquamind/module-dashboard'
import type { TabId } from '../../aquamind/app-shell'

interface HomeScreenProps {
  /** Called when a module wants to navigate to another module (desktop TabId). */
  onNavigate: (tab: TabId) => void
  /** Trigger the emergency mode (handled by the shell). */
  onOpenEmergency: () => void
  /** Ask the assistant a preset question — shell stores it then switches tab. */
  onAskAssistant: (question: string) => void
}

/**
 * Mobile "Accueil" screen — wraps the existing desktop `<ModuleDashboard />`
 * in a mobile-friendly container with `px-4 pt-4 pb-24` (the bottom padding
 * clears the fixed bottom tabs). Title "Aujourd'hui" appears at the top.
 *
 * The dashboard's `onNavigate(tab)` is forwarded to the mobile shell which
 * maps the desktop TabId to the appropriate mobile screen + sub-tab.
 */
export function HomeScreen({ onNavigate, onOpenEmergency, onAskAssistant }: HomeScreenProps) {
  return (
    <div className="mobile-scroll px-4 pb-24 pt-4">
      <div className="mb-3 flex items-center gap-2">
        <Sun className="h-5 w-5 text-gold" aria-hidden />
        <h1 className="font-display text-2xl font-bold tracking-tight">
          Aujourd'hui
        </h1>
      </div>

      <ModuleDashboard
        onNavigate={onNavigate}
        onOpenEmergency={onOpenEmergency}
        onAskAssistant={onAskAssistant}
      />
    </div>
  )
}
