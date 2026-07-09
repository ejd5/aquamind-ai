/**
 * AQWELIA — next-intl routing config (P6-DESIGN, prep only)
 *
 * ⚠️  NOT YET ACTIVE — the current middleware in `src/middleware.ts` still uses
 *     the non-routed next-intl pattern (cookie + Accept-Language detection,
 *     no `/fr/` / `/en/` URL prefix). This file is provided as the canonical
 *     `defineRouting` definition that the future migration will plug into.
 *
 * Why is this separated?
 *   1. Centralize the locale list + default so it is NOT duplicated between
 *      `src/i18n/config.ts` (legacy, used by middleware + i18n-api) and a
 *      future `createMiddleware(routing)` call.
 *   2. Let early adopters (admin scripts, sitemap generators, etc.) import
 *      `pathnames`, `locales`, `defaultLocale` from one typed source.
 *   3. Provide `localePrefix: 'as-needed'` strategy so the default locale
 *      (`fr`) does NOT get a `/fr/` prefix once routing is activated — this
 *      preserves the existing URL contract (e.g. `/` instead of `/fr/`) and
 *      avoids an SEO redirect storm on migration day.
 *
 * Activation guide: docs/I18N_ROUTING.md
 *
 * Stack: next-intl v4.7.0 (defineRouting available since v3.22, exported
 *        from the `next-intl/routing` submodule — NOT the package root)
 */
import { defineRouting } from 'next-intl/routing'
import { locales, defaultLocale, type Locale } from './config'

/**
 * The routing definition. Imported by:
 *   - (future) `src/middleware.ts` → `createMiddleware(routing)`
 *   - (future) `src/i18n/navigation.ts` → `createNavigation(routing)`
 *   - (future) `src/app/[locale]/layout.tsx` → `setRequestLocale`
 *
 * For now it is referenced only by documentation and tooling.
 */
export const routing = defineRouting({
  /** All supported locales — same list as `src/i18n/config.ts`. */
  locales,

  /** Default locale (when no prefix is detected). Same as `config.ts`. */
  defaultLocale,

  /**
   * `as-needed` — the default locale (`fr`) is served at `/` (no `/fr/` prefix).
   * All other locales get a prefix: `/en/...`, `/es/...`, `/de/...`, etc.
   *
   * This preserves backwards compatibility with the existing URL contract:
   * the French homepage stays at `https://aqwelia.app/` (not `/fr/`), so the
   * migration is invisible to users + Google's indexed URLs.
   *
   * Alternative strategies (NOT used here):
   *   - `'always'`     → every locale gets a prefix, including `/fr/`. Most
   *                       explicit, but breaks existing URLs (requires 301s).
   *   - `'as-needed'`  → (chosen) default locale unprefixed.
   *   - `'never'`      → no prefix ever; locale resolved from cookie only.
   *                       Equivalent to the current non-routed setup.
   */
  localePrefix: 'as-needed',

  /**
   * Pathname mapping. Empty for now because all routes use the same path
   * across locales (e.g. `/contact` is `/contact` in every language).
   *
   * Add entries here when a translated slug is needed, e.g.:
   *   pathnames: {
   *     '/contact': { en: '/contact-us', fr: '/contact', es: '/contacto' },
   *   }
   */
  // pathnames: {},

  /**
   * Locale detection order (only relevant once `createMiddleware(routing)`
   * replaces the custom `detectLocale()` in `src/middleware.ts`).
   *
   * Default behavior matches the current custom middleware:
   *   1. URL prefix (`/en/...`) — only when routing is activated
   *   2. `NEXT_LOCALE` cookie — already set by current middleware
   *   3. `Accept-Language` header — already parsed by current middleware
   *   4. `defaultLocale` (`fr`)
   */
  localeDetection: true,
})

/** Re-export for convenience (single import surface). */
export type { Locale }
export { defaultLocale, locales }
