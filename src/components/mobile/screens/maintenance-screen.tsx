'use client'

import { Wrench, Bell, CloudSun } from 'lucide-react'
import { ModuleMaintenance } from '../../aquamind/module-maintenance'
import { ModuleReminders } from '../../aquamind/module-reminders'
import { ModuleWeather } from '../../aquamind/module-weather'
import type { TabId } from '../../aquamind/app-shell'
import type { MaintenanceSubTab } from '../types'

interface MaintenanceScreenProps {
  /** Currently active sub-tab (controlled by the shell). */
  subTab: MaintenanceSubTab
  /** Called when the user picks a different sub-tab. */
  onSubTabChange: (subTab: MaintenanceSubTab) => void
  /** Forwarded from the desktop modules that emit desktop TabId intents. */
  onNavigate: (tab: TabId) => void
}

interface SubTabDef {
  id: MaintenanceSubTab
  label: string
  icon: typeof Wrench
}

const SUB_TABS: readonly SubTabDef[] = [
  { id: 'actions', label: 'Actions', icon: Wrench },
  { id: 'rappels', label: 'Rappels', icon: Bell },
  { id: 'meteo', label: 'Météo', icon: CloudSun },
] as const

/**
 * Mobile "Entretien" screen — three pill-style sub-tabs that switch between
 * `<ModuleMaintenance />`, `<ModuleReminders />`, and `<ModuleWeather />`.
 *
 * The sub-tab is controlled by the parent shell so that deep links from
 * other screens can switch the sub-tab from outside, and the user's last
 * choice is preserved across bottom-tab switches.
 */
export function MaintenanceScreen({ subTab, onSubTabChange, onNavigate }: MaintenanceScreenProps) {
  return (
    <div className="mobile-scroll px-4 pb-24 pt-4">
      <div className="mb-3 flex items-center gap-2">
        <Wrench className="h-5 w-5 text-primary" aria-hidden />
        <h1 className="font-display text-2xl font-bold tracking-tight">
          Entretien
        </h1>
      </div>

      {/* Pill sub-tabs — horizontally scrollable if needed */}
      <div
        className="mb-4 flex gap-2 overflow-x-auto pb-1"
        role="tablist"
        aria-label="Sous-onglets Entretien"
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

      {subTab === 'actions' && <ModuleMaintenance />}
      {subTab === 'rappels' && <ModuleReminders onNavigate={onNavigate} />}
      {subTab === 'meteo' && <ModuleWeather onNavigate={onNavigate} />}
    </div>
  )
}
