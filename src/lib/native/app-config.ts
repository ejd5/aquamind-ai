/**
 * AQWELIA — Native app configuration, deep links, lifecycle events.
 *
 * Centralizes the static app config (version, build, identifiers, store URLs)
 * and provides higher-level wrappers around the deep-link and lifecycle
 * primitives exposed by `./links.ts` and `./lifecycle.ts`.
 *
 * SSR-safe: every function guards against `typeof window === 'undefined'`
 * (via `isNative()`) and returns no-ops / safe defaults on web/server.
 *
 * Usage:
 *   import {
 *     APP_CONFIG,
 *     setupAppDeepLinks,
 *     onAppLifecycleEvent,
 *     parseDeepLink,
 *     getVersionString,
 *   } from '@/lib/native/app-config'
 *
 *   useEffect(() => setupAppDeepLinks((link) => {
 *     if (link.path === '/pool/123') router.push(`/pool/123`)
 *   }), [])
 *
 *   useEffect(() => onAppLifecycleEvent((e) => {
 *     if (e.type === 'background') flushAnalytics()
 *   }), [])
 */

import { setupDeepLinks, onAppStateChange, type AppLifecycleState } from '@/lib/native'

// ---------------------------------------------------------------------------
// 1. Static app configuration
// ---------------------------------------------------------------------------

/**
 * Static, build-time-known app metadata.
 *
 * - `version` and `buildNumber` MUST be kept in sync with:
 *     • iOS:    Xcode → General → Version (CFBundleShortVersionString) + Build (CFBundleVersion)
 *     • Android: app/build.gradle → versionName + versionCode
 *
 *   At submit time, the native values are the source of truth. The values here
 *   are used by the JS layer for diagnostic display ("Settings → À propos")
 *   and for analytics events.
 */
export const APP_CONFIG = {
  /** Reverse-DNS app identifier (matches `capacitor.config.ts` `appId`). */
  appId: 'com.aqwelia.app',

  /** Display name (matches `capacitor.config.ts` `appName`). */
  appName: 'AQWELIA',

  /** Marketing version (semver-style "MAJOR.MINOR.PATCH"). */
  version: '1.0.0',

  /** Build number — incremented for every TestFlight / internal build. */
  buildNumber: 1,

  /** Deep-link URL scheme (must be declared in iOS Info.plist + Android intent-filter). */
  deepLinkScheme: 'aqwelia',

  /** Deep-link host (used in `aqwelia://app/...`). Optional — `aqwelia://` alone works too. */
  deepLinkHost: 'app',

  /** App website (landing page). */
  websiteUrl: 'https://aqwelia.app',

  /** Support email (also used as `EMAIL_FROM` sender in transactional emails). */
  supportEmail: 'contact@aqwelia.app',

  /** In-app routes for legal pages (already deployed with the web app). */
  routes: {
    privacyPolicy: '/legal/privacy',
    support: '/legal/support',
    terms: '/legal/cgu',
  } as const,

  /**
   * Store URLs — filled in once the App Store / Play Store records are live.
   * Until then, the values point to the search results so users can find the
   * listing when it ships.
   */
  stores: {
    ios: 'https://apps.apple.com/app/aqwelia/id6712345678',
    android: 'https://play.google.com/store/apps/details?id=com.aqwelia.app',
  } as const,
} as const

export type AppConfig = typeof APP_CONFIG

/**
 * Human-readable version string for the Settings screen ("À propos").
 * Example: "1.0.0 (build 1)"
 */
export function getVersionString(): string {
  return `${APP_CONFIG.version} (build ${APP_CONFIG.buildNumber})`
}

// ---------------------------------------------------------------------------
// 2. Deep-link parsing + handler
// ---------------------------------------------------------------------------

/**
 * Parsed deep-link URL. Mirrors the structure of `URL` but flattens the
 * pieces that AQWELIA actually cares about (scheme, host, path, query).
 */
export interface ParsedDeepLink {
  /** The raw URL as received from the OS (e.g. `aqwelia://app/pool/abc123?ref=email`). */
  url: string
  /** URL scheme — always `aqwelia` for our app. */
  scheme: string
  /** URL host (e.g. `app`). `null` if the URL has no host (e.g. `aqwelia:///pool/123`). */
  host: string | null
  /** URL pathname, always starting with `/` (e.g. `/pool/abc123`). */
  path: string
  /** Parsed query string parameters (empty object if none). */
  queryParams: Record<string, string>
}

/**
 * Parse a deep-link URL into a structured `ParsedDeepLink`.
 *
 * Returns `null` if the URL cannot be parsed (defensive — never throws).
 * The scheme is NOT validated: any URL is parsed; the caller decides whether
 * to accept it based on `scheme === 'aqwelia'`.
 *
 * @example
 *   parseDeepLink('aqwelia://app/pool/abc123?ref=email')
 *   // → { url: 'aqwelia://app/pool/abc123?ref=email',
 *   //     scheme: 'aqwelia', host: 'app', path: '/pool/abc123',
 *   //     queryParams: { ref: 'email' } }
 */
export function parseDeepLink(url: string): ParsedDeepLink | null {
  try {
    const u = new URL(url)
    const queryParams: Record<string, string> = {}
    u.searchParams.forEach((value, key) => {
      queryParams[key] = value
    })
    return {
      url,
      scheme: u.protocol.replace(':', ''),
      host: u.host || null,
      path: u.pathname || '/',
      queryParams,
    }
  } catch {
    return null
  }
}

/**
 * Check whether a parsed deep link is an AQWELIA link (scheme `aqwelia`).
 */
export function isAqweliaDeepLink(link: ParsedDeepLink | null): link is ParsedDeepLink {
  return link !== null && link.scheme === APP_CONFIG.deepLinkScheme
}

/**
 * Set up the AQWELIA deep-link handler.
 *
 * Wraps `setupDeepLinks` from `./links.ts` with URL parsing + scheme
 * validation. Only `aqwelia://` URLs reach the caller — external URLs
 * (https://, mailto:, etc.) are silently ignored (let the OS handle them).
 *
 * The handler is invoked:
 *   1. On cold-start: once, with the URL that launched the app (if any).
 *   2. On warm-start: every time the OS hands us a new `aqwelia://` URL.
 *
 * @returns A cleanup function that removes the listener.
 *
 * @example
 *   useEffect(() => setupAppDeepLinks((link) => {
 *     if (link.path.startsWith('/pool/')) {
 *       const poolId = link.path.split('/')[2]
 *       router.push(`/pool/${poolId}`)
 *     }
 *   }), [])
 */
export function setupAppDeepLinks(
  handler: (link: ParsedDeepLink) => void,
): () => void {
  // `setupDeepLinks` already returns a no-op on web/server.
  return setupDeepLinks((rawUrl) => {
    const parsed = parseDeepLink(rawUrl)
    if (!isAqweliaDeepLink(parsed)) return
    handler(parsed)
  })
}

/**
 * Build an AQWELIA deep-link URL from a path + optional query params.
 *
 * Useful for generating links to put in emails, push notifications, or
 * share-sheet payloads that should reopen the app on a specific screen.
 *
 * @example
 *   buildAppDeepLink('/pool/abc123', { ref: 'email' })
 *   // → 'aqwelia://app/pool/abc123?ref=email'
 */
export function buildAppDeepLink(
  path: string,
  queryParams?: Record<string, string>,
): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const base = `${APP_CONFIG.deepLinkScheme}://${APP_CONFIG.deepLinkHost}${normalizedPath}`
  if (!queryParams || Object.keys(queryParams).length === 0) return base
  const search = new URLSearchParams(queryParams).toString()
  return `${base}?${search}`
}

// ---------------------------------------------------------------------------
// 3. App lifecycle events
// ---------------------------------------------------------------------------

/**
 * Discrete lifecycle event — a higher-level abstraction over the
 * `'active' | 'inactive' | 'background'` state exposed by `./lifecycle.ts`.
 *
 * - `foreground`  — app became visible (background → active transition)
 * - `background`  — app went to background (active → background transition)
 * - `active`      — app is interactive (also fires on cold-start)
 * - `inactive`    — app is visible but not interactive (iOS multi-tasking view,
 *                   incoming call banner, control center)
 */
export type AppLifecycleEventType = 'foreground' | 'background' | 'active' | 'inactive'

export interface AppLifecycleEvent {
  type: AppLifecycleEventType
  /** Epoch milliseconds when the event fired. */
  timestamp: number
  /** The underlying lifecycle state (raw, from Capacitor). */
  state: AppLifecycleState
}

/**
 * Subscribe to discrete app lifecycle events.
 *
 * Wraps `onAppStateChange` from `./lifecycle.ts` with state-transition logic:
 *   - `active` (raw) → emits `foreground` if previous was `background`, then `active`
 *   - `background` (raw) → emits `background`
 *
 * This is more convenient than the raw `onAppStateChange` for analytics and
 * session-tracking use cases (e.g. "log a session_end event when the app
 * goes to background").
 *
 * @returns A cleanup function that removes the listener.
 *
 * @example
 *   useEffect(() => onAppLifecycleEvent((e) => {
 *     if (e.type === 'background') analytics.track('session_end')
 *     if (e.type === 'foreground') analytics.track('session_start')
 *   }), [])
 */
export function onAppLifecycleEvent(
  callback: (event: AppLifecycleEvent) => void,
): () => void {
  let previous: AppLifecycleState | null = null

  const emit = (type: AppLifecycleEventType, state: AppLifecycleState) => {
    callback({ type, timestamp: Date.now(), state })
  }

  return onAppStateChange((state) => {
    // Detect foreground transition (background → active)
    if (state === 'active' && previous === 'background') {
      emit('foreground', state)
    }
    // Detect background transition
    if (state === 'background') {
      emit('background', state)
    }
    // Always emit the raw state as well
    if (state === 'active') {
      emit('active', state)
    } else if (state === 'inactive') {
      emit('inactive', state)
    }
    previous = state
  })
}

// ---------------------------------------------------------------------------
// 4. App state utilities
// ---------------------------------------------------------------------------

/**
 * Returns `true` if the app is currently in the foreground (active or inactive).
 * Returns `false` if backgrounded, or on web/server.
 *
 * Useful for gating analytics pings, deferring expensive work, etc.
 */
export async function isAppInForeground(): Promise<boolean> {
  const { getCurrentAppState } = await import('@/lib/native/lifecycle')
  const state = await getCurrentAppState()
  return state === 'active' || state === 'inactive'
}

// ---------------------------------------------------------------------------
// 5. Re-exports for convenience
// ---------------------------------------------------------------------------

// Re-export the underlying primitives so callers can import everything from
// a single module if they prefer:
export { setupDeepLinks, onAppStateChange, getCurrentAppState } from '@/lib/native'
export type { DeepLinkHandler, AppLifecycleState } from '@/lib/native'
