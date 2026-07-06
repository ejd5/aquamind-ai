/**
 * Local preferences — Capacitor Preferences wrapper.
 *
 * For NON-SENSITIVE key/value strings only (theme, last-tab, onboarding flag).
 * Sensitive data (tokens, user IDs) must use NextAuth / httpOnly cookies.
 *
 * SSR-safe: web/server falls back to `localStorage` (server: no-op / null).
 *
 * Usage:
 *   import { setPref, getPref, removePref } from '@/lib/native'
 *   await setPref('theme', 'dark')
 *   const theme = await getPref('theme')  // 'dark' | null
 */

import { Preferences } from '@capacitor/preferences'
import { isNative } from '@/lib/platform'

/**
 * Store a string value under `key`.
 * Native: `Preferences.set` (UserDefaults on iOS, SharedPreferences on Android).
 * Web:    `localStorage.setItem`.
 * Server: no-op.
 */
export async function setPref(key: string, value: string): Promise<void> {
  if (isNative()) {
    try {
      await Preferences.set({ key, value })
    } catch {
      /* graceful degradation */
    }
    return
  }
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(key, value)
    } catch {
      /* graceful degradation (quota, private mode, etc.) */
    }
  }
}

/**
 * Read a string value by `key`.
 * Returns `null` if the key doesn't exist or on server.
 */
export async function getPref(key: string): Promise<string | null> {
  if (isNative()) {
    try {
      const result = await Preferences.get({ key })
      return result.value
    } catch {
      return null
    }
  }
  if (typeof localStorage !== 'undefined') {
    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  }
  return null
}

/**
 * Remove the value stored under `key`.
 * No-op if the key doesn't exist or on server.
 */
export async function removePref(key: string): Promise<void> {
  if (isNative()) {
    try {
      await Preferences.remove({ key })
    } catch {
      /* graceful degradation */
    }
    return
  }
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.removeItem(key)
    } catch {
      /* graceful degradation */
    }
  }
}

/**
 * Clear ALL stored preferences.
 * ⚠️ Use with caution — this wipes the entire Preferences/localStorage namespace.
 */
export async function clearPrefs(): Promise<void> {
  if (isNative()) {
    try {
      await Preferences.clear()
    } catch {
      /* graceful degradation */
    }
    return
  }
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.clear()
    } catch {
      /* graceful degradation */
    }
  }
}
