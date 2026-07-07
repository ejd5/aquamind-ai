import { FRANCE } from './FR'
import { USA } from './US'
import { UK } from './GB'
import { GERMANY } from './DE'
import { SPAIN } from './ES'
import { ITALY } from './IT'
import { NETHERLANDS } from './NL'
import { PORTUGAL } from './PT'
import { CANADA } from './CA'
import { AUSTRALIA } from './AU'

/**
 * Country-specific configuration for AQWELIA.
 *
 * Each entry encodes the pool/spa water-quality norms applicable in that
 * country (pH, sanitizer, TAC, CYA, temperature), the local partners
 * (merchants + affiliate ids), and the legal regime (privacy law, consent,
 * data retention, minimum age).
 *
 * The country code follows ISO 3166-1 alpha-2 (uppercase).
 */
export interface CountryConfig {
  /** ISO 3166-1 alpha-2 (uppercase). */
  code: string
  /** Display name in the country's own language. */
  name: string
  /** Default UI locale for this country (matches a key in src/i18n/locales). */
  locale: string
  /** ISO 4217 currency code. */
  currency: string
  currencySymbol: string
  /** Measurement system used for volume, temperature, distance. */
  units: 'metric' | 'imperial'
  poolNorms: {
    /** Recommended pH range (inclusive). */
    phRange: [number, number]
    /** Free chlorine range in mg/L (ppm). */
    chlorineRange: [number, number]
    /** Bromine range in mg/L (ppm) when bromine is used. */
    bromineRange: [number, number]
    /** Total Alkalinity (TAC) range in mg/L. */
    tacRange: [number, number]
    /** Cyanuric acid (CYA / stabilizer) range in mg/L. */
    cyaRange: [number, number]
    /** Maximum recommended water temperature (°C) for a pool. */
    maxWaterTemp: number
  }
  spaNorms: {
    phRange: [number, number]
    bromineRange: [number, number]
    /** Maximum spa water temperature (°C). */
    maxTemp: number
    /** Mandatory full drain interval, in days. */
    mandatoryDrain: number
  }
  /**
   * Local partners (merchants, distributors). Affiliate id is sent at
   * checkout / outbound click to attribute referrals.
   */
  partners: Array<{ id: string; name: string; url: string; affiliate: string }>
  legal: {
    /** Short identifier of the applicable privacy law. */
    privacyLaw: string
    /** Whether explicit consent is required before storing non-essential data. */
    consentRequired: boolean
    /** Maximum data retention period (days) for non-essential user data. */
    dataRetentionDays: number
    /** Minimum user age to create an account. */
    minAge: number
  }
}

/**
 * All supported country configurations, keyed by ISO 3166-1 alpha-2.
 */
export const COUNTRIES: Record<string, CountryConfig> = {
  FR: FRANCE,
  US: USA,
  GB: UK,
  DE: GERMANY,
  ES: SPAIN,
  IT: ITALY,
  NL: NETHERLANDS,
  PT: PORTUGAL,
  CA: CANADA,
  AU: AUSTRALIA,
}

/**
 * Resolve a country code (any case, possibly invalid) to a CountryConfig.
 * Falls back to France when the code is missing or unknown — AQWELIA is a
 * French product and France has the strictest norms (safest default).
 */
export function getCountryConfig(code: string | null | undefined): CountryConfig {
  if (!code) return FRANCE
  const upper = code.toUpperCase()
  return COUNTRIES[upper] ?? FRANCE
}

/**
 * List of countries selectable in the UI (onboarding, settings).
 * The `name` is shown in the country's own language, the flag is an emoji.
 */
export function getCountryList(): Array<{ code: string; name: string; flag: string }> {
  return [
    { code: 'FR', name: 'France', flag: '🇫🇷' },
    { code: 'US', name: 'United States', flag: '🇺🇸' },
    { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
    { code: 'DE', name: 'Deutschland', flag: '🇩🇪' },
    { code: 'ES', name: 'España', flag: '🇪🇸' },
    { code: 'IT', name: 'Italia', flag: '🇮🇹' },
    { code: 'NL', name: 'Nederland', flag: '🇳🇱' },
    { code: 'PT', name: 'Portugal', flag: '🇵🇹' },
    { code: 'CA', name: 'Canada', flag: '🇨🇦' },
    { code: 'AU', name: 'Australia', flag: '🇦🇺' },
  ]
}
