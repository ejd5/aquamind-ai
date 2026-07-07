import { getRequestConfig } from 'next-intl/server'

/**
 * AQWELIA — i18n configuration.
 *
 * Supported locales for the UI. French is the default (the product is
 * French-first). New locales can be added here as long as a matching
 * JSON file exists in `./locales/<locale>.json`.
 */
export const locales = ['fr', 'en', 'es', 'de', 'it', 'pt', 'nl'] as const
export type Locale = (typeof locales)[number]
export const defaultLocale: Locale = 'fr'

/**
 * Validate / coerce an arbitrary locale string into a supported Locale.
 * Falls back to `defaultLocale` if the value is missing or unsupported.
 */
export function normalizeLocale(value: string | null | undefined): Locale {
  if (!value) return defaultLocale
  // Exact match (e.g. "fr", "en")
  if (locales.includes(value as Locale)) return value as Locale
  // Match on the language part only (e.g. "fr-FR" → "fr", "en-US" → "en")
  const lang = value.toLowerCase().split(/[-_]/)[0]
  if (locales.includes(lang as Locale)) return lang as Locale
  return defaultLocale
}

/**
 * next-intl v4 request configuration.
 *
 * Note: in next-intl v4 the `locale` parameter is only set when a caller
 * explicitly provides one (e.g. `getTranslations({ locale: 'en' })`). The
 * segment-based locale arrives via `requestLocale` (a Promise). Because
 * AQWELIA does NOT use a `[locale]` URL segment, `requestLocale` resolves
 * to `undefined` — the default locale (fr) is used as the baseline and
 * client-side overrides are handled via the `country` profile field.
 */
export default getRequestConfig(async ({ locale, requestLocale }) => {
  const segment = await requestLocale
  const actualLocale = (locale as string | undefined) || segment || defaultLocale
  const validLocale = normalizeLocale(actualLocale)

  return {
    locale: validLocale,
    messages: (await import(`./locales/${validLocale}.json`)).default,
  }
})
