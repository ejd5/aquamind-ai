'use client'

import { useTranslations } from 'next-intl'

import { Droplets, Camera, BookOpen, FlaskConical } from 'lucide-react'
import { ModuleWaterTest } from '../../aquamind/module-water-test'
import { ModuleDiagnostic } from '../../aquamind/module-diagnostic'
import { ModuleHealthLog } from '../../aquamind/module-health-log'
import type { TabId } from '../../aquamind/app-shell'
import type { AnalysesSubTab } from '../types'

interface AnalysesScreenProps {
  /** Currently active sub-tab (controlled by the shell). */
  subTab: AnalysesSubTab
  /** Called when the user picks a different sub-tab. */
  onSubTabChange: (subTab: AnalysesSubTab) => void
  /** Forwarded from the desktop modules that emit desktop TabId intents. */
  onNavigate: (tab: TabId) => void
}

interface SubTabDef {
  id: AnalysesSubTab
  label: string
  icon: typeof Droplets
}

const SUB_TABS: readonly SubTabDef[] = [
  { id: 'mesures', label: 'Mesures', icon: FlaskConical },
  { id: 'photo', label: 'Photo', icon: Camera },
  { id: 'carnet', label: 'Carnet', icon: BookOpen },
] as const

/**
 * Mobile "Analyses" screen — three pill-style sub-tabs that switch between
 * `<ModuleWaterTest />`, `<ModuleDiagnostic />`, and `<ModuleHealthLog />`.
 *
 * The sub-tab is controlled by the parent shell so that deep links from
 * other screens (e.g. dashboard "voir analyses photo") can switch the
 * sub-tab from outside, and the user's last choice is preserved across
 * bottom-tab switches.
 *
 * Sub-tabs are horizontally scrollable (in case of overflow on very narrow
 * devices) and use the AQWELIA pill style (active = gold gradient border).
 */
export function AnalysesScreen({ subTab, onSubTabChange, onNavigate }: AnalysesScreenProps) {
  return (
    <div className="mobile-scroll px-4 pb-24 pt-4">
      <div className="mb-3 flex items-center gap-2">
        <Droplets className="h-5 w-5 text-primary" aria-hidden />
        <h1 className="font-display text-2xl font-bold tracking-tight">
          Analyses
        </h1>
      </div>

      {/* Pill sub-tabs — horizontally scrollable if needed */}
      <div
        className="mb-4 flex gap-2 overflow-x-auto pb-1"
        role="tablist"
        aria-label="Sous-onglets Analyses"
      >
        {SUB_TABS.map((t) => {
          const Icon = t.icon
          const active = subTab === t.id
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onSubTabChange(t.id)}
              className={`flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-colors active:opacity-70 ${
                active
                  ? 'border-gold/60 bg-gold/10 text-gold'
                  : 'border-border/50 bg-card/40 text-muted-foreground'
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden />
              {t.label}
            </button>
          )
        })}
      </div>

      {subTab === 'mesures' && <ModuleWaterTest onNavigate={onNavigate} />}
      {subTab === 'photo' && <ModuleDiagnostic />}
      {subTab === 'carnet' && <ModuleHealthLog />}
    </div>
  )
}
