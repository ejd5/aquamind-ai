/**
 * AQWELIA — Préférences utilisateur (langue + pays + unités + normes).
 *
 * Module AUTONOME (aucune dépendance externe vers @/lib/i18n ou @/lib/countries
 * qui n'existent pas encore — types et données inline ici).
 *
 * Principe clé : langue, pays et unités sont TROIS sélecteurs indépendants.
 *   - Un Mexicain aux USA → espagnol + normes US + unités impériales
 *   - Un Français en Allemagne → français + normes DE + unités métriques
 *   - L'utilisateur peut surcharger N'IMPORTE QUEL paramètre indépendamment
 *
 * Persistance : localStorage (clé `aqwelia-preferences`), SSR-safe.
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

/* ─────────────────────────────────────────────────────────────────────── */
/*  Types                                                                  */
/* ─────────────────────────────────────────────────────────────────────── */

export type Locale = 'fr' | 'en' | 'es' | 'de' | 'it' | 'pt' | 'nl'

export type TemperatureUnit = 'C' | 'F'
export type VolumeUnit = 'm3' | 'gal'
export type WeightUnit = 'kg' | 'lbs'
export type LengthUnit = 'cm' | 'in'
export type UnitSystem = 'metric' | 'imperial'
export type DateFormat = 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD'
export type TimeFormat = '24h' | '12h'

export interface CountryNorms {
  phMin: number
  phMax: number
  chlorineMin: number // mg/L
  chlorineMax: number // mg/L
  bromineMin: number // mg/L
  bromineMax: number // mg/L
  tacMin: number // mg/L
  tacMax: number // mg/L
  cyaMin: number // mg/L
  cyaMax: number // mg/L
  tempMaxPoolC: number // °C
  tempMaxSpaC: number // °C
  spaDrainageMonths: number
}

export interface CountryConfig {
  code: string
  name: string // Nom en français
  flag: string // Emoji
  units: 'metric' | 'imperial'
  currency: 'EUR' | 'USD' | 'GBP' | 'CHF'
  marketplace: 'EU' | 'US' | 'UK' | 'CH'
  norms: CountryNorms
}

export interface Preferences {
  // Langue (indépendante du pays)
  language: Locale

  // Pays (détermine normes, marketplace, devise)
  country: string // Code ISO : FR, US, GB, etc.

  // Unités (indépendantes — peut surcharger les valeurs par défaut du pays)
  unitSystem: UnitSystem
  temperature: TemperatureUnit
  volume: VolumeUnit
  weight: WeightUnit
  length: LengthUnit

  // Préférences d'affichage
  dateFormat: DateFormat
  timeFormat: TimeFormat
}

interface PreferencesStore extends Preferences {
  setLanguage: (lang: Locale) => void
  setCountry: (country: string) => void
  setUnitSystem: (system: UnitSystem) => void
  setTemperature: (unit: TemperatureUnit) => void
  setVolume: (unit: VolumeUnit) => void
  setWeight: (unit: WeightUnit) => void
  setLength: (unit: LengthUnit) => void
  setDateFormat: (format: DateFormat) => void
  setTimeFormat: (format: TimeFormat) => void
  resetToCountryDefaults: () => void
  getCountryConfig: () => CountryConfig
}

/* ─────────────────────────────────────────────────────────────────────── */
/*  Données pays (10 marchés AQWELIA)                                      */
/* ─────────────────────────────────────────────────────────────────────── */

export const COUNTRY_LIST: CountryConfig[] = [
  {
    code: 'FR',
    name: 'France',
    flag: '🇫🇷',
    units: 'metric',
    currency: 'EUR',
    marketplace: 'EU',
    norms: {
      phMin: 7.0, phMax: 7.4,
      chlorineMin: 0.4, chlorineMax: 1.4,
      bromineMin: 2, bromineMax: 4,
      tacMin: 80, tacMax: 120,
      cyaMin: 30, cyaMax: 50,
      tempMaxPoolC: 28, tempMaxSpaC: 38,
      spaDrainageMonths: 3,
    },
  },
  {
    code: 'BE',
    name: 'Belgique',
    flag: '🇧🇪',
    units: 'metric',
    currency: 'EUR',
    marketplace: 'EU',
    norms: {
      phMin: 7.0, phMax: 7.4,
      chlorineMin: 0.5, chlorineMax: 1.5,
      bromineMin: 2, bromineMax: 4,
      tacMin: 80, tacMax: 120,
      cyaMin: 30, cyaMax: 50,
      tempMaxPoolC: 28, tempMaxSpaC: 38,
      spaDrainageMonths: 3,
    },
  },
  {
    code: 'CH',
    name: 'Suisse',
    flag: '🇨🇭',
    units: 'metric',
    currency: 'CHF',
    marketplace: 'CH',
    norms: {
      phMin: 7.0, phMax: 7.4,
      chlorineMin: 0.2, chlorineMax: 1.2, // Suisse plus stricte (SLMG)
      bromineMin: 2, bromineMax: 4,
      tacMin: 80, tacMax: 120,
      cyaMin: 30, cyaMax: 50,
      tempMaxPoolC: 28, tempMaxSpaC: 38,
      spaDrainageMonths: 3,
    },
  },
  {
    code: 'ES',
    name: 'Espagne',
    flag: '🇪🇸',
    units: 'metric',
    currency: 'EUR',
    marketplace: 'EU',
    norms: {
      phMin: 7.2, phMax: 7.6,
      chlorineMin: 0.5, chlorineMax: 2.0,
      bromineMin: 2, bromineMax: 4,
      tacMin: 80, tacMax: 120,
      cyaMin: 30, cyaMax: 50,
      tempMaxPoolC: 30, tempMaxSpaC: 38,
      spaDrainageMonths: 3,
    },
  },
  {
    code: 'DE',
    name: 'Allemagne',
    flag: '🇩🇪',
    units: 'metric',
    currency: 'EUR',
    marketplace: 'EU',
    norms: {
      phMin: 7.0, phMax: 7.4,
      chlorineMin: 0.3, chlorineMax: 1.2, // DIN 19643
      bromineMin: 2, bromineMax: 4,
      tacMin: 80, tacMax: 120,
      cyaMin: 30, cyaMax: 50,
      tempMaxPoolC: 28, tempMaxSpaC: 38,
      spaDrainageMonths: 3,
    },
  },
  {
    code: 'IT',
    name: 'Italie',
    flag: '🇮🇹',
    units: 'metric',
    currency: 'EUR',
    marketplace: 'EU',
    norms: {
      phMin: 7.0, phMax: 7.4,
      chlorineMin: 0.5, chlorineMax: 1.5,
      bromineMin: 2, bromineMax: 4,
      tacMin: 80, tacMax: 120,
      cyaMin: 30, cyaMax: 50,
      tempMaxPoolC: 28, tempMaxSpaC: 38,
      spaDrainageMonths: 3,
    },
  },
  {
    code: 'PT',
    name: 'Portugal',
    flag: '🇵🇹',
    units: 'metric',
    currency: 'EUR',
    marketplace: 'EU',
    norms: {
      phMin: 7.0, phMax: 7.6,
      chlorineMin: 0.5, chlorineMax: 1.5,
      bromineMin: 2, bromineMax: 4,
      tacMin: 80, tacMax: 120,
      cyaMin: 30, cyaMax: 50,
      tempMaxPoolC: 30, tempMaxSpaC: 38,
      spaDrainageMonths: 3,
    },
  },
  {
    code: 'NL',
    name: 'Pays-Bas',
    flag: '🇳🇱',
    units: 'metric',
    currency: 'EUR',
    marketplace: 'EU',
    norms: {
      phMin: 7.0, phMax: 7.4,
      chlorineMin: 0.5, chlorineMax: 1.5,
      bromineMin: 2, bromineMax: 4,
      tacMin: 80, tacMax: 120,
      cyaMin: 30, cyaMax: 50,
      tempMaxPoolC: 28, tempMaxSpaC: 38,
      spaDrainageMonths: 3,
    },
  },
  {
    code: 'GB',
    name: 'Royaume-Uni',
    flag: '🇬🇧',
    units: 'metric',
    currency: 'GBP',
    marketplace: 'UK',
    norms: {
      phMin: 7.0, phMax: 7.6,
      chlorineMin: 1.0, chlorineMax: 3.0, // PWTAG
      bromineMin: 3, bromineMax: 5,
      tacMin: 80, tacMax: 120,
      cyaMin: 30, cyaMax: 100, // UK tolère plus de CYA
      tempMaxPoolC: 28, tempMaxSpaC: 38,
      spaDrainageMonths: 3,
    },
  },
  {
    code: 'US',
    name: 'États-Unis',
    flag: '🇺🇸',
    units: 'imperial',
    currency: 'USD',
    marketplace: 'US',
    norms: {
      phMin: 7.2, phMax: 7.8, // CDC / APSP
      chlorineMin: 1.0, chlorineMax: 3.0,
      bromineMin: 2, bromineMax: 4,
      tacMin: 80, tacMax: 120,
      cyaMin: 30, cyaMax: 100,
      tempMaxPoolC: 29, tempMaxSpaC: 40,
      spaDrainageMonths: 3,
    },
  },
]

const COUNTRY_MAP: Record<string, CountryConfig> = Object.fromEntries(
  COUNTRY_LIST.map((c) => [c.code, c]),
)

export function getCountryConfig(code: string): CountryConfig {
  return COUNTRY_MAP[code] ?? COUNTRY_LIST[0] // fallback France
}

/* ─────────────────────────────────────────────────────────────────────── */
/*  Langues (7)                                                            */
/* ─────────────────────────────────────────────────────────────────────── */

export const LANGUAGES: Array<{ code: Locale; name: string; nativeName: string; flag: string }> = [
  { code: 'fr', name: 'Français', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'en', name: 'Anglais', nativeName: 'English', flag: '🇬🇧' },
  { code: 'es', name: 'Espagnol', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'de', name: 'Allemand', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', name: 'Italien', nativeName: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', name: 'Portugais', nativeName: 'Português', flag: '🇵🇹' },
  { code: 'nl', name: 'Néerlandais', nativeName: 'Nederlands', flag: '🇳🇱' },
]

export const SUPPORTED_LOCALES: Locale[] = LANGUAGES.map((l) => l.code)

/* ─────────────────────────────────────────────────────────────────────── */
/*  Détection pays (appelée côté client au premier load)                   */
/* ─────────────────────────────────────────────────────────────────────── */

export interface CountryDetectionResult {
  config: CountryConfig
  source: 'timezone' | 'locale' | 'default'
}

/**
 * Détecte le pays de l'utilisateur côté client.
 * Stratégie (par ordre de fiabilité) :
 *   1. Timezone IANA → mapping (ex: Europe/Paris → FR)
 *   2. navigator.language (ex: "es-MX" → MX, mais MX n'est pas supporté → fallback ES)
 *   3. Fallback France (marché principal AQWELIA)
 *
 * Pas d'appel réseau — fonction synchrone côté client.
 */
export function detectCountryConfig(): CountryDetectionResult {
  if (typeof navigator === 'undefined') {
    return { config: COUNTRY_LIST[0], source: 'default' }
  }

  // 1. Timezone
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone ?? ''
    const tzMap: Record<string, string> = {
      'Europe/Paris': 'FR',
      'Europe/Brussels': 'BE',
      'Europe/Zurich': 'CH',
      'Europe/Madrid': 'ES',
      'Europe/Berlin': 'DE',
      'Europe/Rome': 'IT',
      'Europe/Lisbon': 'PT',
      'Europe/Amsterdam': 'NL',
      'Europe/London': 'GB',
      'America/New_York': 'US',
      'America/Chicago': 'US',
      'America/Denver': 'US',
      'America/Los_Angeles': 'US',
      'America/Anchorage': 'US',
      'Pacific/Honolulu': 'US',
    }
    const code = tzMap[tz]
    if (code && COUNTRY_MAP[code]) {
      return { config: COUNTRY_MAP[code], source: 'timezone' }
    }
  } catch {
    // Intl non supporté — on continue
  }

  // 2. Locale navigateur
  const lang = navigator.language ?? 'fr'
  const region = lang.split('-')[1]?.toUpperCase()
  if (region && COUNTRY_MAP[region]) {
    return { config: COUNTRY_MAP[region], source: 'locale' }
  }

  // 3. Fallback
  return { config: COUNTRY_LIST[0], source: 'default' }
}

/* ─────────────────────────────────────────────────────────────────────── */
/*  Valeurs par défaut selon le pays                                       */
/* ─────────────────────────────────────────────────────────────────────── */

function getCountryDefaults(country: string): Partial<Preferences> {
  const config = getCountryConfig(country)
  const isImperial = config.units === 'imperial'
  return {
    country,
    unitSystem: isImperial ? 'imperial' : 'metric',
    temperature: isImperial ? 'F' : 'C',
    volume: isImperial ? 'gal' : 'm3',
    weight: isImperial ? 'lbs' : 'kg',
    length: isImperial ? 'in' : 'cm',
    dateFormat: country === 'US' ? 'MM/DD/YYYY' : 'DD/MM/YYYY',
    timeFormat: isImperial ? '12h' : '24h',
  }
}

/* ─────────────────────────────────────────────────────────────────────── */
/*  Stockage SSR-safe                                                     */
/* ─────────────────────────────────────────────────────────────────────── */

const noopStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
} as const

function safeStorage() {
  if (typeof window !== 'undefined') {
    try {
      return window.localStorage
    } catch {
      return noopStorage as unknown as Storage
    }
  }
  return noopStorage as unknown as Storage
}

/* ─────────────────────────────────────────────────────────────────────── */
/*  Store Zustand persistant                                              */
/* ─────────────────────────────────────────────────────────────────────── */

export const usePreferences = create<PreferencesStore>()(
  persist(
    (set, get) => ({
      // Valeurs par défaut (France — marché principal AQWELIA)
      language: 'fr',
      country: 'FR',
      unitSystem: 'metric',
      temperature: 'C',
      volume: 'm3',
      weight: 'kg',
      length: 'cm',
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '24h',

      setLanguage: (lang) => set({ language: lang }),
      setCountry: (country) => {
        const defaults = getCountryDefaults(country)
        set({ country, ...defaults })
      },
      setUnitSystem: (system) => {
        const isImperial = system === 'imperial'
        set({
          unitSystem: system,
          temperature: isImperial ? 'F' : 'C',
          volume: isImperial ? 'gal' : 'm3',
          weight: isImperial ? 'lbs' : 'kg',
          length: isImperial ? 'in' : 'cm',
        })
      },
      setTemperature: (unit) => set({ temperature: unit }),
      setVolume: (unit) => set({ volume: unit }),
      setWeight: (unit) => set({ weight: unit }),
      setLength: (unit) => set({ length: unit }),
      setDateFormat: (format) => set({ dateFormat: format }),
      setTimeFormat: (format) => set({ timeFormat: format }),
      resetToCountryDefaults: () => {
        const defaults = getCountryDefaults(get().country)
        set(defaults)
      },
      getCountryConfig: () => getCountryConfig(get().country),
    }),
    {
      name: 'aqwelia-preferences',
      storage: createJSONStorage(() => safeStorage()),
    },
  ),
)

/* ─────────────────────────────────────────────────────────────────────── */
/*  Helpers — display names (Intl.DisplayNames, no translation keys)       */
/* ─────────────────────────────────────────────────────────────────────── */

/**
 * Returns the country name in the user's locale using Intl.DisplayNames.
 * Falls back to the French `name` from COUNTRY_LIST if Intl is unavailable
 * or the code is not a valid ISO 3166-1 alpha-2 code.
 *
 * Example: getCountryDisplayName('FR', 'en') → "France"
 *          getCountryDisplayName('FR', 'es') → "Francia"
 */
export function getCountryDisplayName(code: string, locale: Locale): string {
  if (typeof Intl === 'undefined' || !('DisplayNames' in Intl)) {
    // SSR or old runtime — fall back to French literal
    return getCountryConfig(code).name
  }
  try {
    const dn = new Intl.DisplayNames([locale], { type: 'region', fallback: 'code' })
    const out = dn.of(code)
    return out || getCountryConfig(code).name
  } catch {
    return getCountryConfig(code).name
  }
}

/**
 * Returns the language name in the user's locale using Intl.DisplayNames.
 * Falls back to the French `name` from LANGUAGES if Intl is unavailable.
 *
 * Example: getLanguageDisplayName('en', 'fr') → "Anglais"
 *          getLanguageDisplayName('fr', 'en') → "French"
 *          getLanguageDisplayName('es', 'de') → "Spanisch"
 */
export function getLanguageDisplayName(lang: Locale, locale: Locale): string {
  if (typeof Intl === 'undefined' || !('DisplayNames' in Intl)) {
    const found = LANGUAGES.find((l) => l.code === lang)
    return found?.name ?? lang
  }
  try {
    const dn = new Intl.DisplayNames([locale], { type: 'language', fallback: 'code' })
    const out = dn.of(lang)
    return out || (LANGUAGES.find((l) => l.code === lang)?.name ?? lang)
  } catch {
    const found = LANGUAGES.find((l) => l.code === lang)
    return found?.name ?? lang
  }
}

/* ─────────────────────────────────────────────────────────────────────── */
/*  Helpers — conversion d'unités                                         */
/* ─────────────────────────────────────────────────────────────────────── */

export function convertTemperature(value: number, from: TemperatureUnit, to: TemperatureUnit): number {
  if (from === to) return value
  if (from === 'C' && to === 'F') return (value * 9) / 5 + 32
  if (from === 'F' && to === 'C') return ((value - 32) * 5) / 9
  return value
}

export function convertVolume(value: number, from: VolumeUnit, to: VolumeUnit): number {
  if (from === to) return value
  if (from === 'm3' && to === 'gal') return value * 264.172
  if (from === 'gal' && to === 'm3') return value / 264.172
  return value
}

export function convertWeight(value: number, from: WeightUnit, to: WeightUnit): number {
  if (from === to) return value
  if (from === 'kg' && to === 'lbs') return value * 2.20462
  if (from === 'lbs' && to === 'kg') return value / 2.20462
  return value
}

export function convertLength(value: number, from: LengthUnit, to: LengthUnit): number {
  if (from === to) return value
  if (from === 'cm' && to === 'in') return value / 2.54
  if (from === 'in' && to === 'cm') return value * 2.54
  return value
}

/* ─────────────────────────────────────────────────────────────────────── */
/*  Helpers — formatage                                                   */
/* ─────────────────────────────────────────────────────────────────────── */

export function formatTemperature(value: number, unit: TemperatureUnit): string {
  const rounded = Math.round(value * 10) / 10
  return `${rounded}°${unit}`
}

export function formatVolume(value: number, unit: VolumeUnit): string {
  const rounded = Math.round(value * 100) / 100
  return `${rounded} ${unit === 'm3' ? 'm³' : 'gal'}`
}

export function formatWeight(value: number, unit: WeightUnit): string {
  const rounded = Math.round(value * 10) / 10
  return `${rounded} ${unit}`
}

export function formatLength(value: number, unit: LengthUnit): string {
  const rounded = Math.round(value * 10) / 10
  return `${rounded} ${unit}`
}
