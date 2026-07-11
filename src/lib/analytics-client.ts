/**
 * AQWELIA — Client-side analytics (PostHog browser SDK).
 *
 * IMPORTANT: This module MUST stay client-only. Do NOT import `posthog-node`
 * here — bundling it into the browser breaks the entire app (posthog-node
 * uses node:fs and other node-only modules). Server-side tracking lives in
 * `analytics-server.ts`.
 *
 * Exports:
 *   - `trackEvent(eventName, properties?)`  — call from 'use client' comps.
 *   - `__setPostHogClient(client | null)`   — called by PostHogProvider.
 *   - `isPostHogClientEnabled()`            — checks NEXT_PUBLIC_POSTHOG_KEY.
 *
 * Event-name conventions (snake_case) — shared with the server module:
 *   - user_signed_up, user_signed_in
 *   - water_test_submitted, photo_diagnostic_run, chat_message_sent
 *   - subscription_started, subscription_cancelled, paywall_shown
 *
 * Properties always include `env` ('dev' | 'prod') and `platform`
 * ('web' | 'ios' | 'android') so dashboards can filter.
 */

type PostHogClient = {
  capture: (event: string, properties?: Record<string, unknown>) => void
}

let posthogClient: PostHogClient | null = null
let clientInitAttempted = false

/**
 * Called by PostHogProvider once the posthog-js client is ready.
 * Subsequent `trackEvent` calls will then be forwarded to PostHog.
 */
export function __setPostHogClient(c: PostHogClient | null): void {
  posthogClient = c
  clientInitAttempted = true
}

/**
 * Client-side event tracking. Safe no-op when:
 *   - running on the server (no window)
 *   - PostHog env vars are missing (dev without keys)
 *   - the PostHogProvider has not mounted (e.g. an error boundary)
 */
export function trackEvent(
  eventName: string,
  properties?: Record<string, unknown>
): void {
  if (typeof window === 'undefined') return
  if (!posthogClient) {
    // Not yet initialised — silently drop. The provider will call
    // __setPostHogClient on mount; events before that are lost, which
    // is acceptable for analytics (we don't want to queue them).
    return
  }
  try {
    posthogClient.capture(eventName, {
      ...properties,
      env: process.env.NODE_ENV === 'production' ? 'prod' : 'dev',
      platform: detectPlatform(),
    })
  } catch (err) {
    // Analytics must NEVER break user flow.
    if (typeof console !== 'undefined' && console.warn) {
      console.warn('[analytics] trackEvent failed:', err)
    }
  }
}

/** Best-effort platform detection for client events. */
function detectPlatform(): 'ios' | 'android' | 'web' {
  if (typeof navigator === 'undefined') return 'web'
  const ua = navigator.userAgent || ''
  // Capacitor injects `Capacitor` on the window object
  if (typeof (window as any).Capacitor !== 'undefined') {
    const platform = (window as any).Capacitor?.getPlatform?.()
    if (platform === 'ios') return 'ios'
    if (platform === 'android') return 'android'
  }
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios'
  if (/Android/i.test(ua)) return 'android'
  return 'web'
}

/**
 * True when the public PostHog key is configured. Used by the
 * PostHogProvider to decide whether to mount the provider at all.
 */
export function isPostHogClientEnabled(): boolean {
  return Boolean(
    typeof process !== 'undefined' &&
      process.env.NEXT_PUBLIC_POSTHOG_KEY &&
      process.env.NEXT_PUBLIC_POSTHOG_HOST
  )
}

// Silence unused-var lint — `clientInitAttempted` is set but never read; it's
// a sanity flag for future debugging and could be used to log warnings.
void clientInitAttempted
