/**
 * AQWELIA — Analytics barrel (re-exports client + server helpers).
 *
 * Why two modules?
 *   - `analytics-client.ts` is browser-safe (uses posthog-js, no node deps).
 *     Imported by 'use client' components and the PostHogProvider.
 *   - `analytics-server.ts` is server-only (uses posthog-node which needs
 *     node:fs / node:crypto). Imported only from API route handlers.
 *
 * Keeping them in separate files prevents Turbopack from bundling
 * `posthog-node` into the browser chunk (which would break the app — see
 * worklog P5-GROWTH).
 *
 * This barrel re-exports both:
 *   - `trackEvent` (client) — no-op on the server.
 *   - `trackEventServer` (server) — no-op in the browser.
 *   - `__setPostHogClient`, `isPostHogClientEnabled` (client).
 *
 * **NOTE**: When importing from an API route handler, prefer importing
 * `trackEventServer` from `@/lib/analytics-server` directly. Importing
 * from this barrel pulls in the client module too, which is fine (it's
 * browser-safe) but adds a tiny bit of dead code.
 */
export {
  trackEvent,
  __setPostHogClient,
  isPostHogClientEnabled,
} from './analytics-client'
export { trackEventServer } from './analytics-server'
