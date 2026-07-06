/**
 * AQWELIA — Mobile types
 *
 * Mobile uses a 5-tab navigation model (Home / Analyses / Assistant /
 * Maintenance / Profile) which is intentionally simpler than the desktop
 * 11-tab model. Mobile screens reuse existing desktop modules from
 * `../aquamind/` and adapt them to a mobile-friendly container.
 *
 * The desktop `TabId` (from `../aquamind/app-shell`) is still used as the
 * "intent" type: when a module wants to navigate to another module, it
 * emits a desktop TabId and the mobile shell maps it to a mobile screen +
 * optional sub-tab.
 */

import type { TabId, PoolProfileLite } from '../aquamind/app-shell'

/** 5 main mobile screens (bottom tabs). */
export type MobileScreen = 'home' | 'analyses' | 'assistant' | 'maintenance' | 'profile'

/** Sub-tabs inside the "Analyses" screen. */
export type AnalysesSubTab = 'mesures' | 'photo' | 'carnet'

/** Sub-tabs inside the "Maintenance" screen. */
export type MaintenanceSubTab = 'actions' | 'rappels' | 'meteo'

/** Mobile navigation request — screen + optional sub-tab. */
export interface MobileNavigation {
  screen: MobileScreen
  analysesSubTab?: AnalysesSubTab
  maintenanceSubTab?: MaintenanceSubTab
}

/** Re-export shared types for convenience. */
export type { TabId, PoolProfileLite }

/**
 * Map a desktop TabId (emitted by existing modules) to a mobile navigation
 * intent. Tabs without a direct mobile home fall back to the closest screen.
 *
 * Example:
 *   - 'water' → { screen: 'analyses', analysesSubTab: 'mesures' }
 *   - 'paywall' → { screen: 'profile' }
 *   - 'today' → { screen: 'home' }
 */
export function mapDesktopTabToMobile(tab: TabId): MobileNavigation {
  switch (tab) {
    case 'today':
      return { screen: 'home' }
    case 'water':
      return { screen: 'analyses', analysesSubTab: 'mesures' }
    case 'diagnostic':
      return { screen: 'analyses', analysesSubTab: 'photo' }
    case 'log':
      return { screen: 'analyses', analysesSubTab: 'carnet' }
    case 'plan':
      // No dedicated mobile screen for action plan — keep user on mesures
      // where the plan is generated after a water test.
      return { screen: 'analyses', analysesSubTab: 'mesures' }
    case 'assistant':
      return { screen: 'assistant' }
    case 'maintenance':
      return { screen: 'maintenance', maintenanceSubTab: 'actions' }
    case 'weather':
      return { screen: 'maintenance', maintenanceSubTab: 'meteo' }
    case 'reminders':
      return { screen: 'maintenance', maintenanceSubTab: 'rappels' }
    case 'guides':
      // No dedicated mobile guides screen — fall back to home.
      return { screen: 'home' }
    case 'paywall':
      return { screen: 'profile' }
    default:
      return { screen: 'home' }
  }
}
