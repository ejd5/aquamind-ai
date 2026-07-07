/**
 * AQWELIA — Server-side i18n helpers for API route handlers.
 *
 * API routes run server-side and don't have access to the React
 * `useTranslations` hook. The middleware (src/middleware.ts) already detects
 * the user's locale (cookie → Accept-Language → default `fr`) and rewrites the
 * `accept-language` request header to the resolved 2-letter code, so route
 * handlers can read it directly.
 *
 * These helpers let API routes:
 *   1. `pickLocale(req)` — read the resolved locale from the request headers.
 *   2. `getApiMessages(locale)` — load the locale's JSON message bundle (cached
 *      per-locale at the module level so repeated calls are cheap).
 *   3. `translate(locale, key)` — look up a dotted key like
 *      `common.errors.accountDeleteError` in the locale bundle, returning the
 *      raw French fallback string if either the locale or the key is missing.
 *
 * Use these to localise DEFAULT VALUES written to the DB (e.g. the default
 * pool name "Ma piscine" → "My pool" → "Mi piscina"…) so that what gets
 * stored matches the user's UI language at creation time.
 *
 * NOTE: error MESSAGES returned in JSON responses are still hardcoded French
 * for now (see `// TODO: i18n` comments in the route files). Properly
 * translating them requires the client to map an `error` key to a translation
 * via `t()`; that refactor is deferred.
 */
import { normalizeLocale, type Locale } from '@/i18n/config'

const messageCache: Partial<Record<Locale, Record<string, unknown>>> = {}

/**
 * Read the resolved locale from the request's `accept-language` header.
 *
 * The middleware rewrites this header to a single 2-letter code (e.g. `fr`,
 * `en`, `es`) before the route handler runs, so we don't need to parse the
 * raw `Accept-Language` syntax here. We still call `normalizeLocale` for
 * safety against direct (non-middleware) calls.
 */
export function pickLocale(req: Request): Locale {
  return normalizeLocale(req.headers.get('accept-language'))
}

/**
 * Load (and cache) the message bundle for a locale.
 */
export async function getApiMessages(
  locale: Locale
): Promise<Record<string, unknown>> {
  if (!messageCache[locale]) {
    messageCache[locale] = (
      await import(`@/i18n/locales/${locale}.json`)
    ).default as Record<string, unknown>
  }
  return messageCache[locale] as Record<string, unknown>
}

/**
 * Resolve a dotted translation key (e.g. `common.errors.phRequired`) in the
 * given locale. Returns `fallback` if the key path doesn't exist.
 */
export async function translate(
  locale: Locale,
  key: string,
  fallback: string
): Promise<string> {
  const messages = await getApiMessages(locale)
  const segments = key.split('.')
  let node: unknown = messages
  for (const seg of segments) {
    if (node && typeof node === 'object' && seg in (node as Record<string, unknown>)) {
      node = (node as Record<string, unknown>)[seg]
    } else {
      return fallback
    }
  }
  return typeof node === 'string' ? node : fallback
}
