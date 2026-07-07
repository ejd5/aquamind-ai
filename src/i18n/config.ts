export const locales = ['fr', 'en', 'es', 'de', 'it', 'pt', 'nl'] as const
export type Locale = (typeof locales)[number]
export const defaultLocale: Locale = 'fr'

export function normalizeLocale(locale: string | undefined | null): Locale {
  if (!locale) return defaultLocale
  const short = locale.split('-')[0].toLowerCase()
  return locales.includes(short as Locale) ? short as Locale : defaultLocale
}
