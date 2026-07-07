'use client'

import { useTranslations } from 'next-intl'

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

/**
 * Mobile "Entretien" screen — three pill-style sub-tabs that switch between
 * `<ModuleMaintenance />`, `<ModuleReminders />`, and `<ModuleWeather />`.
 *
 * The sub-tab is controlled by the parent shell so that deep links from
 * other screens can switch the sub-tab from outside, and the user's last
 * choice is preserved across bottom-tab switches.
 */
export function MaintenanceScreen({ subTab, onSubTabChange, onNavigate }: MaintenanceScreenProps) {
  const tNav = useTranslations('nav')
  const tScr = useTranslations('mobile.screens')

  const SUB_TABS: readonly SubTabDef[] = [
    { id: 'actions', label: tScr('maintenanceSubtabActions'), icon: Wrench },
    { id: 'rappels', label: tNav('shortReminders'), icon: Bell },
    { id: 'meteo', label: tNav('shortWeather'), icon: CloudSun },
  ] as const

  return (
    <div className="mobile-scroll px-4 pb-24 pt-4">
      <div className="mb-3 flex items-center gap-2">
        <Wrench className="h-5 w-5 text-primary" aria-hidden />
        <h1 className="font-display text-2xl font-bold tracking-tight">
          {tNav('maintenance')}
        </h1>
      </div>

      {/* Pill sub-tabs — horizontally scrollable if needed */}
      <div
        className="mb-4 flex gap-2 overflow-x-auto pb-1"
        role="tablist"
        aria-label={tScr('maintenanceAriaSubtabs')}
      >
        {SUB_TABS.map((tab) => {
          const Icon = tab.icon
          const active = subTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onSubTabChange(tab.id)}
              className={`flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-colors active:opacity-70 ${
                active
                  ? 'border-gold/60 bg-gold/10 text-gold'
                  : 'border-border/50 bg-card/40 text-muted-foreground'
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden />
              {tab.label}
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
