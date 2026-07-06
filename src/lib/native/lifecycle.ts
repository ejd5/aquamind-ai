/**
 * App lifecycle — Capacitor App wrapper.
 *
 * SSR-safe: web/server falls back to `document.visibilitychange`.
 * Normalises the messy native/web lifecycle signals into a single
 * `'active' | 'inactive' | 'background'` state.
 *
 * Usage:
 *   import { onAppStateChange, getCurrentAppState } from '@/lib/native'
 *   useEffect(() => onAppStateChange((s) => {
 *     if (s === 'background') flushAnalytics()
 *   }), [])
 */

import { App } from '@capacitor/app'
import { isNative } from '@/lib/platform'

export type AppLifecycleState = 'active' | 'inactive' | 'background'

/**
 * Subscribe to app lifecycle changes.
 *
 * Native: `App.addListener('appStateChange')` → fires `active`/`background`.
 * Web:    `document.visibilitychange` → `background` when hidden, `active` when visible.
 * Server: no-op (returns an empty cleanup).
 */
export function onAppStateChange(
  callback: (state: AppLifecycleState) => void,
): () => void {
  if (!isNative()) {
    if (typeof document === 'undefined') return () => {}
    const handler = () => {
      const state: AppLifecycleState = document.hidden
        ? 'background'
        : 'active'
      callback(state)
    }
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }

  const listener = App.addListener('appStateChange', ({ isActive }) => {
    callback(isActive ? 'active' : 'background')
  })

  return () => {
    listener.then((l) => l.remove()).catch(() => {})
  }
}

/**
 * Get the current app lifecycle state, queried once.
 * Native: `App.getState()`.
 * Web:    `document.hidden`.
 * Server: 'active' (no DOM).
 */
export async function getCurrentAppState(): Promise<AppLifecycleState> {
  if (!isNative()) {
    if (typeof document === 'undefined') return 'active'
    return document.hidden ? 'background' : 'active'
  }
  try {
    const info = await App.getState()
    return info.isActive ? 'active' : 'background'
  } catch {
    return 'active'
  }
}
