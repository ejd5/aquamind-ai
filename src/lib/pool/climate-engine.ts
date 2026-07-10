/**
 * AQWELIA Climate™ — climate adaptation engine.
 *
 * Determines the current "climate mode" for a pool based on weather + season +
 * pool profile. Each mode carries a translation key + a set of recommended
 * adjustments (filtration boost, preventive shock, winter active, frost
 * protection, CYA check, algae watch).
 *
 * i18n strategy: every mode + adjustment exposes a `*Key` translation key
 * under the `climate` namespace. French literals are kept as legacy fallback
 * (consistent with weather-engine.ts pattern).
 */

import type { WeatherData } from './weather-engine'

export type ClimateMode =
  | 'normal'
  | 'heatwave'
  | 'cold_snap'
  | 'storm_season'
  | 'winter'
  | 'tropical'

export type ClimateAdjustment =
  | 'filter_boost'
  | 'preventive_shock'
  | 'winter_active'
  | 'frost_protection'
  | 'cya_adjust'
  | 'algae_watch'

export interface ClimateAssessment {
  mode: ClimateMode
  /** Translation key: `climate.mode<Mode>` (e.g. `climate.modeHeatwave`). */
  modeLabelKey: string
  /** Translation key: `climate.mode<Mode>Desc` (e.g. `climate.modeHeatwaveDesc`). */
  modeDescKey: string
  /** French fallback for the mode label (legacy). */
  modeLabel: string
  /** French fallback for the mode description (legacy). */
  modeDesc: string
  /** Recommended filtration boost in hours/day (added to baseline). */
  filtrationBoostHours: number
  /** Adjustments recommended for this mode (translation keys under `climate`). */
  adjustments: ClimateAdjustment[]
  /** CSS hue for the badge (deg in the OKLCH color space). */
  badgeHue: number
}

const MODE_META: Record<
  ClimateMode,
  {
    labelKey: string
    descKey: string
    label: string
    desc: string
    hue: number
  }
> = {
  normal: {
    labelKey: 'modeNormal',
    descKey: 'modeNormalDesc',
    label: 'Normal',
    desc: 'Conditions saisonnières normales',
    hue: 195,
  },
  heatwave: {
    labelKey: 'modeHeatwave',
    descKey: 'modeHeatwaveDesc',
    label: 'Canicule',
    desc: 'Forte chaleur — filtration +2h, chlore choc préventif',
    hue: 25,
  },
  cold_snap: {
    labelKey: 'modeColdSnap',
    descKey: 'modeColdSnapDesc',
    label: 'Coupe-froid',
    desc: 'Froid soudain — hivernage actif, protection gel',
    hue: 220,
  },
  storm_season: {
    labelKey: 'modeStormSeason',
    descKey: 'modeStormSeasonDesc',
    label: 'Saison orageuse',
    desc: 'Orages fréquents — surveillance pH/chlore accrue',
    hue: 280,
  },
  winter: {
    labelKey: 'modeWinter',
    descKey: 'modeWinterDesc',
    label: 'Hiver',
    desc: 'Hivernage — filtration minimale, surveillance réduite',
    hue: 240,
  },
  tropical: {
    labelKey: 'modeTropical',
    descKey: 'modeTropicalDesc',
    label: 'Tropical',
    desc: 'Climat tropical — CYA adapté, algues plus agressives',
    hue: 145,
  },
}

export interface ClimateProfileInput {
  /** Pool region string (free-form: city name, country code, lat,lon). */
  region?: string | null
  /** Treatment type from PoolProfile. */
  treatmentType: string
  /** Salt system flag. */
  saltSystem: boolean
}

/**
 * Resolve the climate mode from weather + season + profile.
 *
 * Decision tree (first match wins):
 *   1. tomorrowMinC ≤ 2     → cold_snap (frost protection)
 *   2. tomorrowMaxC ≥ 35    → heatwave (preventive shock)
 *   3. tomorrowChanceStorm ≥ 60 → storm_season
 *   4. currentTempC ≤ 8 (winter) → winter
 *   5. region is tropical (Brésil, Antilles, Réunion…) → tropical
 *   6. else → normal
 */
export function getClimateMode(
  weather: WeatherData,
  season: string,
  profile: ClimateProfileInput,
): ClimateAssessment {
  let mode: ClimateMode = 'normal'

  if (weather.tomorrowMinC <= 2) {
    mode = 'cold_snap'
  } else if (weather.tomorrowMaxC >= 35) {
    mode = 'heatwave'
  } else if (weather.tomorrowChanceStorm >= 60) {
    mode = 'storm_season'
  } else if (weather.currentTempC <= 8) {
    mode = 'winter'
  } else if (isTropicalRegion(profile.region)) {
    mode = 'tropical'
  }

  const meta = MODE_META[mode]
  const adjustments: ClimateAdjustment[] = []
  let filtrationBoostHours = 0

  switch (mode) {
    case 'heatwave':
      adjustments.push('filter_boost', 'preventive_shock', 'algae_watch')
      filtrationBoostHours = 2
      break
    case 'cold_snap':
      adjustments.push('winter_active', 'frost_protection')
      filtrationBoostHours = -2 // reduce filtration in cold (still keep some flow)
      break
    case 'storm_season':
      adjustments.push('algae_watch')
      filtrationBoostHours = 1
      break
    case 'winter':
      adjustments.push('winter_active')
      filtrationBoostHours = -2
      break
    case 'tropical':
      adjustments.push('cya_adjust', 'algae_watch')
      filtrationBoostHours = 1
      break
    case 'normal':
    default:
      // No specific adjustments needed.
      break
  }

  return {
    mode,
    modeLabelKey: meta.labelKey,
    modeDescKey: meta.descKey,
    modeLabel: meta.label,
    modeDesc: meta.desc,
    filtrationBoostHours,
    adjustments,
    badgeHue: meta.hue,
  }
}

// ───────────────────────────────────────────────────────────────────────────
// Tropical region detection (very rough — based on region string keywords).
// Real detection would use lat/long. This is good enough for v1.
// ───────────────────────────────────────────────────────────────────────────
const TROPICAL_KEYWORDS = [
  // French overseas departments & territories
  'guadeloupe', 'martinique', 'guyane', 'réunion', 'reunion', 'mayotte',
  'nouvelle-calédonie', 'nouvelle calédonie', 'polynésie', 'polynesie', 'tahiti',
  'saint-pierre', 'saint pierre', 'miquelon', 'wallis', 'futuna',
  // Brazil (Brésil) — biggest non-EU market for tropical pool care
  'brésil', 'brazil', 'brasil', 'rio', 'sao paulo', 'salvador', 'recife', 'fortaleza',
  // Caribbean & central America
  'antilles', 'caraïbes', 'caraibes', 'cub', 'dominicaine', 'jamaïque',
  'mexique', 'cuba', 'panama', 'costa rica',
  // South-East Asia
  'thailande', 'thailand', 'vietnam', 'indonésie', 'indonesie', 'philippines',
  // India / Indian ocean
  'inde', 'india', 'sri lanka', 'maldives',
  // Africa
  'sénégal', 'senegal', 'côte d\'ivoire', 'ivoire', 'cameroun', 'gabon', 'congo',
  'kenya', 'tanzanie', 'madagascar',
]

function isTropicalRegion(region?: string | null): boolean {
  if (!region) return false
  const r = region.toLowerCase().trim()
  return TROPICAL_KEYWORDS.some((kw) => r.includes(kw))
}

/**
 * Resolve the current season from a date (Northern hemisphere default,
 * flipped for tropical southern-hemisphere regions like Brazil).
 */
export function getSeason(date: Date = new Date(), isSouthernHemisphere = false): string {
  const m = date.getMonth() + 1 // 1-12
  let season: string
  if (m >= 3 && m <= 5) season = 'spring'
  else if (m >= 6 && m <= 8) season = 'summer'
  else if (m >= 9 && m <= 11) season = 'autumn'
  else season = 'winter'
  if (isSouthernHemisphere) {
    // Flip summer/winter, spring/autumn
    if (season === 'summer') season = 'winter'
    else if (season === 'winter') season = 'summer'
    else if (season === 'spring') season = 'autumn'
    else if (season === 'autumn') season = 'spring'
  }
  return season
}
