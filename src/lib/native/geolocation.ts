/**
 * Geolocation — Capacitor Geolocation wrapper.
 *
 * SSR-safe: on web/server, falls back to the browser `navigator.geolocation`
 * API (server: returns null). Graceful degradation: every call wrapped in
 * try/catch so a permission denial or timeout never crashes a screen.
 *
 * Used by:
 *   - `src/components/aquamind/module-weather.tsx` (auto-locate for forecast)
 *   - `src/components/aquamind/onboarding.tsx` (initial pool region guess)
 *
 * Usage:
 *   import { getCurrentPosition, requestGeoPermission } from '@/lib/native'
 *   const pos = await getCurrentPosition()
 *   if (pos) weather.fetch(pos.latitude, pos.longitude)
 */

import { Geolocation } from '@capacitor/geolocation'
import { isNative } from '@/lib/platform'

export interface GeoPosition {
  latitude: number
  longitude: number
  accuracy: number
  altitude: number | null
  timestamp: number
}

/**
 * Request foreground geolocation permission.
 * Native: `Geolocation.requestPermissions()`.
 * Web:    `navigator.permissions.query({ name: 'geolocation' })` (best-effort).
 * Server: returns `'denied'`.
 */
export async function requestGeoPermission(): Promise<'granted' | 'denied' | 'prompt'> {
  if (!isNative()) {
    if (typeof navigator === 'undefined' || !navigator.permissions) return 'denied'
    try {
      const result = await navigator.permissions.query({
        name: 'geolocation' as PermissionName,
      })
      return result.state as 'granted' | 'denied' | 'prompt'
    } catch {
      return 'prompt'
    }
  }
  try {
    const status = await Geolocation.requestPermissions()
    return status.location === 'granted' ? 'granted' : 'denied'
  } catch {
    return 'denied'
  }
}

/**
 * Get the current device position.
 * Native: `Geolocation.getCurrentPosition()` (high accuracy enabled).
 * Web:    `navigator.geolocation.getCurrentPosition` wrapped as a Promise.
 * Server: returns `null`.
 *
 * Returns `null` on permission denial, timeout, or any failure — callers
 * should treat `null` as "use manual region entry" (the Weather module
 * already supports this fallback).
 */
export async function getCurrentPosition(
  opts?: { timeoutMs?: number; highAccuracy?: boolean },
): Promise<GeoPosition | null> {
  const timeout = opts?.timeoutMs ?? 10_000
  const enableHighAccuracy = opts?.highAccuracy ?? true

  if (!isNative()) {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return null
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            altitude: pos.coords.altitude,
            timestamp: pos.timestamp,
          })
        },
        () => resolve(null),
        { enableHighAccuracy, timeout, maximumAge: 60_000 },
      )
    })
  }

  try {
    const pos = await Geolocation.getCurrentPosition({
      enableHighAccuracy,
      timeout,
    })
    return {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
      altitude: pos.coords.altitude ?? null,
      timestamp: pos.timestamp,
    }
  } catch {
    return null
  }
}
