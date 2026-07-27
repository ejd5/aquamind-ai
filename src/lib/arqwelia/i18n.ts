/**
 * ARQWELIA i18n (Round 2, Option B) — limit ARQWELIA routes to FR + EN.
 *
 * Users whose UI locale is es/de/it/pt/nl get an explicit **EN** fallback for
 * ARQWELIA routes — no fake multilingual. Call `forceArqLocale()` from server
 * components (layouts/pages), then `setRequestLocale(forced)` so child server
 * `getTranslations(...)`` calls read the forced bundle, and re-scope the
 * NextIntlClientProvider for client components.
 *
 * See docs/ARQWELIA_LOT1.md "i18n (Option B)".
 */
import { getLocale, setRequestLocale } from 'next-intl/server'
import { normalizeLocale, type Locale } from '@/i18n/config'

export const ARQ_SUPPORTED: Locale[] = ['fr', 'en']
export const ARQ_FALLBACK: Locale = 'en'

export async function forceArqLocale(): Promise<Locale> {
  const detected = normalizeLocale(await getLocale())
  const forced = ARQ_SUPPORTED.includes(detected) ? detected : ARQ_FALLBACK
  setRequestLocale(forced)
  return forced
}