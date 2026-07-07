/**
 * Entry point used by next-intl to resolve the request configuration.
 *
 * next-intl v4 looks for `i18n/request.{ts,js,tsx}` (in the project root or
 * under `src/`). We delegate to `config.ts` so the configuration module can
 * also be imported directly (e.g. to access `locales`, `defaultLocale`,
 * `normalizeLocale`).
 */
export { default } from './config'
export * from './config'
