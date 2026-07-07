/**
 * Network state — Capacitor Network wrapper.
 *
 * SSR-safe: web/server falls back to `navigator.onLine` (server: 'online').
 * Provides a single-subscriber-style API that fans out to multiple callbacks
 * while only registering ONE native listener.
 *
 * Usage:
 *   import { getNetworkState, onNetworkChange } from '@/lib/native'
 *   const state = await getNetworkState()
 *   useEffect(() => onNetworkChange((s) => setShowOfflineBanner(s === 'offline')), [])
 */

import { Network } from '@capacitor/network'
import { isNative } from '@/lib/platform'

export type NetworkState = 'online' | 'offline'

let _currentState: NetworkState = 'online'
let _listeners: Array<(state: NetworkState) => void> = []
let _nativeListenerCleanup: (() => void) | null = null

/**
 * Get current network state.
 * Native: queries `Network.getStatus()`.
 * Web:    `navigator.onLine`.
 * Server: assumes 'online' (no DOM).
 */
export async function getNetworkState(): Promise<NetworkState> {
  if (!isNative()) {
    if (typeof navigator === 'undefined') return 'online'
    return navigator.onLine ? 'online' : 'offline'
  }
  try {
    const status = await Network.getStatus()
    return status.connected ? 'online' : 'offline'
  } catch {
    return 'online'
  }
}

/**
 * Subscribe to network state changes.
 * Multiple subscribers share a single underlying native listener.
 * Returns an unsubscribe function.
 *
 * Web: listens to `window.online` / `window.offline` events.
 * Server: subscribes but never fires (no DOM).
 */
export function onNetworkChange(
  callback: (state: NetworkState) => void,
): () => void {
  _listeners.push(callback)

  // Web fallback
  if (!isNative()) {
    if (typeof window === 'undefined') {
      // SSR: nothing to listen to — return a no-op unsubscribe.
      return () => {
        _listeners = _listeners.filter((fn) => fn !== callback)
      }
    }
    const onlineHandler = () => {
      _currentState = 'online'
      _listeners.forEach((fn) => fn('online'))
    }
    const offlineHandler = () => {
      _currentState = 'offline'
      _listeners.forEach((fn) => fn('offline'))
    }
    window.addEventListener('online', onlineHandler)
    window.addEventListener('offline', offlineHandler)
    return () => {
      window.removeEventListener('online', onlineHandler)
      window.removeEventListener('offline', offlineHandler)
      _listeners = _listeners.filter((fn) => fn !== callback)
    }
  }

  // Native: only register ONE underlying listener, shared across subscribers.
  if (_listeners.length === 1 && !_nativeListenerCleanup) {
    const listenerPromise = Network.addListener('networkStatusChange', (status) => {
      const newState: NetworkState = status.connected ? 'online' : 'offline'
      if (newState !== _currentState) {
        _currentState = newState
        _listeners.forEach((fn) => fn(newState))
      }
    })
    _nativeListenerCleanup = () => {
      listenerPromise
        .then((l) => l.remove())
        .catch(() => {
          /* graceful degradation */
        })
    }
  }

  return () => {
    _listeners = _listeners.filter((fn) => fn !== callback)
    // When the last subscriber leaves, release the native listener.
    if (_listeners.length === 0 && _nativeListenerCleanup) {
      _nativeListenerCleanup()
      _nativeListenerCleanup = null
    }
  }
}
