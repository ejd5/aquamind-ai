// AQWELIA Winter Guardian — Winter pool monitoring engine.
//
// Pure function: `getWinterStatus(profile, weather, lastTest)` returns a
// `WinterStatus` describing the active/passive wintering mode, current alerts
// (frost, water level, cover, rainfall, filtration), a progressive checklist,
// and recommended next actions (including spring preparation).
//
// i18n strategy: every user-facing string is exposed as a translation key
// under the `winterGuardian` namespace. The French fallbacks alongside the
// keys are kept ONLY because `src/lib/pool/*` files are exempt from the
// pre-commit hardcoded-strings check (see scripts/i18n/check-hardcoded-strings.py
// SKIP_PATTERNS). Consumers should always render via `t(alert.titleKey)`.
//
// Consumed by:
//   - GET /api/pool/winter-guardian  (server route, persists nothing)
//   - <WinterGuardianWidget />       (dashboard card)
//
// Stack: deterministic, no IO, no Date.now() side effects (the API passes a
// `now` Date if it wants deterministic testing; we default to current date).

import type { WeatherData } from './weather-engine'

export interface PoolProfileLite {
  /** waterBodyType on the PoolProfile: 'pool' | 'spa' | 'both'. */
  waterBodyType?: string | null
  /** Region string used for weather; presence indicates the pool is configured. */
  region?: string | null
  covered?: boolean | null
  /** Treatment type chlorine | salt | bromine | active_oxygen | uv | other. */
  treatmentType?: string | null
  filterType?: string | null
}

export interface LastTestLite {
  createdAt: Date | string
  ph?: number | null
  freeChlorine?: number | null
  bromine?: number | null
  temperature?: number | null
}

export type WinterMode = 'active' | 'passive' | 'not_started'

export type WinterAlertSeverity = 'info' | 'warning' | 'critical'

export interface WinterAlert {
  id: string
  type: 'frost' | 'water_level' | 'cover' | 'rain' | 'filtration'
  severity: WinterAlertSeverity
  /** French fallback (legacy). */
  title: string
  titleKey: string
  /** French fallback (legacy). */
  description: string
  descriptionKey: string
}

export interface WinterTask {
  id: string
  /** French fallback (legacy). */
  label: string
  labelKey: string
  /** Whether the task is currently actionable (e.g. not "check cover" if no cover profile). */
  applicable: boolean
  /** Suggested frequency: 'once' | 'monthly' | 'weekly'. */
  frequency: 'once' | 'monthly' | 'weekly'
}

export interface WinterStatus {
  mode: WinterMode
  modeLabel: string
  modeLabelKey: string
  modeDesc: string
  modeDescKey: string
  alerts: WinterAlert[]
  checklist: WinterTask[]
  nextActions: string[]
  nextActionKeys: string[]
  /** True if spring preparation should be shown (Feb 1 → May 15, Northern Hemisphere). */
  springPrepActive: boolean
  /** Estimated budget for spring start-up, in EUR (very rough heuristic). */
  springBudgetEstimate: number
  /** ISO month when spring prep should start (e.g. 'February'). */
  springPrepMonth: string
}

const SPRING_BUDGET_BASE = 60 // € — base for shock + anti-algae + startup products
const SPRING_BUDGET_PER_M3 = 1.5 // €/m³ — rough product cost scaling

function isWinterMonth(now: Date): boolean {
  // Northern Hemisphere wintering window: November → March.
  const m = now.getMonth() + 1 // 1-12
  return m >= 11 || m <= 3
}

function isSpringPrepWindow(now: Date): boolean {
  // Feb 1 → May 15: spring preparation window.
  const m = now.getMonth() + 1
  const d = now.getDate()
  if (m === 2 || m === 3 || m === 4) return true
  if (m === 5 && d <= 15) return true
  return false
}

/**
 * Returns the Winter Guardian status for the given pool profile, weather, and
 * last water test.
 *
 * Algorithm:
 *   1. Determine `mode`:
 *      - 'active'    if weather.currentTempC ≤ 4°C OR weather.tomorrowMinC ≤ 0°C
 *                    (frost risk → filtration must run intermittently)
 *      - 'passive'   if it's winter (Nov-Mar) but no frost risk AND profile.covered
 *      - 'not_started' otherwise (no profile, or summer)
 *   2. Generate alerts based on:
 *      - Frost: temp ≤ 0°C or tomorrowMin ≤ 0°C
 *      - Rainfall: precipMm ≥ 10mm OR tomorrowChanceRain ≥ 70%
 *      - Filtration: if winter + active mode → reminder to run filtration
 *      - Water level: always info (we don't have a sensor)
 *      - Cover: if profile.covered is false and winter → suggest installing
 *   3. Build a 5-item checklist (filtration, water level, cover, equipment,
 *      monthly photos).
 *   4. Build nextActions (string keys) — spring prep when in window.
 */
export function getWinterStatus(
  profile: PoolProfileLite | null,
  weather: WeatherData | null,
  lastTest: LastTestLite | null,
  now: Date = new Date(),
): WinterStatus {
  // ── Mode determination ────────────────────────────────────────────────
  const winterMonth = isWinterMonth(now)
  const frostRiskNow = weather != null && weather.currentTempC <= 0
  const frostRiskTomorrow = weather != null && weather.tomorrowMinC <= 0
  const coldButAboveFrost = weather != null && weather.currentTempC <= 4

  let mode: WinterMode
  if (!profile) {
    mode = 'not_started'
  } else if (frostRiskNow || frostRiskTomorrow || (winterMonth && coldButAboveFrost)) {
    mode = 'active'
  } else if (winterMonth && profile.covered) {
    mode = 'passive'
  } else if (winterMonth) {
    // Winter but no cover — still recommend passive setup
    mode = 'passive'
  } else {
    mode = 'not_started'
  }

  const MODE_INFO: Record<WinterMode, { label: string; labelKey: string; desc: string; descKey: string }> = {
    active: {
      label: 'Hivernage actif',
      labelKey: 'winterGuardian.modeActive',
      desc: 'Filtration en marche, surveillance renforcée',
      descKey: 'winterGuardian.modeActiveDesc',
    },
    passive: {
      label: 'Hivernage passif',
      labelKey: 'winterGuardian.modePassive',
      desc: 'Couverture, eau stagnante, surveillance légère',
      descKey: 'winterGuardian.modePassiveDesc',
    },
    not_started: {
      label: 'Non démarré',
      labelKey: 'winterGuardian.modeNotStarted',
      desc: 'Activez Winter Guardian pour suivre votre hivernage',
      descKey: 'winterGuardian.modeNotStartedDesc',
    },
  }

  // ── Alerts ────────────────────────────────────────────────────────────
  const alerts: WinterAlert[] = []

  if (weather) {
    if (frostRiskNow || frostRiskTomorrow) {
      alerts.push({
        id: 'frost',
        type: 'frost',
        severity: 'critical',
        title: 'Alerte gel',
        titleKey: 'winterGuardian.alertFrost',
        description:
          'Température négative prévue. Surveillez la filtration et les canalisations.',
        descriptionKey: 'winterGuardian.alertFrostDesc',
      })
    }

    // Rainfall — heavy rain expected
    if (weather.precipMm >= 10 || weather.tomorrowChanceRain >= 70) {
      alerts.push({
        id: 'rain',
        type: 'rain',
        severity: 'warning',
        title: 'Précipitations',
        titleKey: 'winterGuardian.alertRain',
        description:
          'Forte pluie prévue. Surveillez le niveau d\'eau et la dilution des produits.',
        descriptionKey: 'winterGuardian.alertRainDesc',
      })
    }
  }

  // Filtration reminder in active mode
  if (mode === 'active') {
    alerts.push({
      id: 'filtration',
      type: 'filtration',
      severity: 'warning',
      title: 'Filtration',
      titleKey: 'winterGuardian.alertFiltration',
      description:
        'La filtration doit tourner par intermittence pour éviter le gel.',
      descriptionKey: 'winterGuardian.alertFiltrationDesc',
    })
  }

  // Water level — always info (no sensor)
  if (mode !== 'not_started') {
    alerts.push({
      id: 'water_level',
      type: 'water_level',
      severity: 'info',
      title: 'Niveau d\'eau',
      titleKey: 'winterGuardian.alertWaterLevel',
      description:
        'Vérifiez le niveau d\'eau : évitez débordements et assèchement.',
      descriptionKey: 'winterGuardian.alertWaterLevelDesc',
    })
  }

  // Cover — if winter and not covered, suggest installing
  if (winterMonth && profile && !profile.covered) {
    alerts.push({
      id: 'cover',
      type: 'cover',
      severity: 'warning',
      title: 'Couverture',
      titleKey: 'winterGuardian.alertCover',
      description:
        'Vérifiez que la couverture d\'hivernage est bien fixée.',
      descriptionKey: 'winterGuardian.alertCoverDesc',
    })
  }

  // ── Checklist ─────────────────────────────────────────────────────────
  const checklist: WinterTask[] = [
    {
      id: 'filtration',
      label: 'Vérifier la filtration',
      labelKey: 'winterGuardian.taskFiltration',
      applicable: mode === 'active',
      frequency: 'weekly',
    },
    {
      id: 'water_level',
      label: 'Vérifier le niveau d\'eau',
      labelKey: 'winterGuardian.taskWaterLevel',
      applicable: mode !== 'not_started',
      frequency: 'weekly',
    },
    {
      id: 'cover',
      label: 'Vérifier la couverture',
      labelKey: 'winterGuardian.taskCover',
      applicable: mode === 'passive' || (winterMonth && !!profile?.covered),
      frequency: 'monthly',
    },
    {
      id: 'equipment',
      label: 'Vérifier les équipements',
      labelKey: 'winterGuardian.taskEquipment',
      applicable: mode !== 'not_started',
      frequency: 'monthly',
    },
    {
      id: 'monthly_photos',
      label: 'Photos mensuelles',
      labelKey: 'winterGuardian.taskMonthlyPhotos',
      applicable: mode !== 'not_started',
      frequency: 'monthly',
    },
  ]

  // ── Next actions ──────────────────────────────────────────────────────
  const nextActions: string[] = []
  const nextActionKeys: string[] = []

  if (mode === 'not_started' && profile) {
    // Profile exists but winter not started → recommend preparing winterization
    nextActions.push('Préparer l\'hivernage')
    nextActionKeys.push('winterGuardian.prepareSpring')
  }

  if (isSpringPrepWindow(now)) {
    nextActions.push('Préparer le printemps')
    nextActionKeys.push('winterGuardian.prepareSpring')
  }

  // Always include spring prep as a standing action if winter is active/passive
  if (mode !== 'not_started' && !isSpringPrepWindow(now)) {
    nextActions.push('Préparer le printemps')
    nextActionKeys.push('winterGuardian.prepareSpring')
  }

  // ── Spring prep estimate ─────────────────────────────────────────────
  const springPrepActive = isSpringPrepWindow(now)
  // Rough budget estimate — we don't have the volume here, so use base only.
  // The API can refine this with the actual PoolProfile.volume.
  const springBudgetEstimate = SPRING_BUDGET_BASE + SPRING_BUDGET_PER_M3 * 50 // assume 50m³ default

  return {
    mode,
    modeLabel: MODE_INFO[mode].label,
    modeLabelKey: MODE_INFO[mode].labelKey,
    modeDesc: MODE_INFO[mode].desc,
    modeDescKey: MODE_INFO[mode].descKey,
    alerts,
    checklist,
    nextActions,
    nextActionKeys,
    springPrepActive,
    springBudgetEstimate,
    springPrepMonth: 'February',
  }
}

/**
 * Refine the spring budget estimate using the actual pool volume.
 * Used by the API route when the PoolProfile is available.
 */
export function refineSpringBudget(volume: number | null | undefined): number {
  const v = typeof volume === 'number' && volume > 0 ? volume : 50
  return SPRING_BUDGET_BASE + SPRING_BUDGET_PER_M3 * v
}
