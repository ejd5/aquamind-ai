import { getCountryConfig, type CountryConfig } from './index'

export interface IPInfo {
  countryCode: string
  country: string
  region: string
  city: string
  timezone: string
}

/**
 * Detect the user's country from their public IP address.
 *
 * Uses ipapi.co (free, 30k requests/day, no API key required). The request
 * is aborted after 5s so a slow network cannot block the UI.
 *
 * Returns `null` on any failure (network, parse, missing country_code) —
 * callers should fall back to another detection strategy.
 *
 * Note: on the server side this needs the visitor IP to be forwarded. The
 * simplest approach is to call this from the client (the browser, or
 * Capacitor WebView) where ipapi.co sees the real user IP directly.
 */
export async function detectCountryFromIP(): Promise<IPInfo | null> {
  try {
    const res = await fetch('https://ipapi.co/json/', {
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return null
    const data = (await res.json()) as {
      country_code?: string
      country_name?: string
      region?: string
      city?: string
      timezone?: string
    }
    if (!data.country_code) return null
    return {
      countryCode: data.country_code,
      country: data.country_name ?? '',
      region: data.region ?? '',
      city: data.city ?? '',
      timezone: data.timezone ?? '',
    }
  } catch {
    return null
  }
}

export type CountryDetectionSource = 'profile' | 'ip' | 'browser' | 'default'

export interface DetectedCountry {
  config: CountryConfig
  source: CountryDetectionSource
  /** Optional IP-derived metadata (only set when source === 'ip'). */
  ipInfo?: IPInfo
}

/**
 * Resolve the best country config for the current visitor using a cascade:
 *
 * 1. **Profile** — explicit country code from the user profile (highest priority).
 * 2. **IP** — geolocation via ipapi.co (most reliable on first visit).
 * 3. **Browser** — `navigator.language` regional part (e.g. `en-US` → `US`).
 * 4. **Default** — France (AQWELIA's home market, safest fallback).
 *
 * The cascade guarantees a non-null CountryConfig.
 */
export async function detectCountryConfig(
  explicitCountry?: string,
): Promise<DetectedCountry> {
  // 1. Explicit (user profile, cookie, etc.)
  if (explicitCountry) {
    const config = getCountryConfig(explicitCountry)
    return { config, source: 'profile' }
  }

  // 2. IP-based (only meaningful in a browser / mobile WebView)
  const ipInfo = await detectCountryFromIP()
  if (ipInfo && ipInfo.countryCode) {
    const config = getCountryConfig(ipInfo.countryCode)
    return { config, source: 'ip', ipInfo }
  }

  // 3. Browser locale
  if (typeof navigator !== 'undefined') {
    const locale = navigator.language || navigator.languages?.[0] || ''
    // e.g. "fr-FR" → "FR", "en-US" → "US", "pt-BR" → "BR" (BR not supported → FR)
    const countryFromLocale = locale.split('-')[1]?.toUpperCase()
    if (countryFromLocale) {
      const config = getCountryConfig(countryFromLocale)
      // getCountryConfig falls back to FR for unknown codes — make sure we
      // only claim "browser" source when the code was actually recognized.
      if (config.code === countryFromLocale) {
        return { config, source: 'browser' }
      }
    }
  }

  // 4. Default
  return { config: getCountryConfig('FR'), source: 'default' }
}
