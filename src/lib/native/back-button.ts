/**
 * Android back button — Capacitor App wrapper.
 *
 * SSR-safe: no-op on web/server/iOS (back button is Android-only).
 * Returns a cleanup function that removes the listener.
 *
 * Handler contract:
 *   - Return `true`  → app handled the back press (do nothing else).
 *   - Return `false` or `void` → let the webview go back if possible;
 *     if no webview history (`!canGoBack`), exit the app.
 *
 * Usage:
 *   import { useEffect } from 'react'
 *   import { setupBackButton } from '@/lib/native'
 *
 *   useEffect(() => setupBackButton(() => {
 *     if (drawerOpen) { closeDrawer(); return true }
 *     return false  // default webview back
 *   }), [])
 */

import { App } from '@capacitor/app'
import { isNative, isAndroid } from '@/lib/platform'

export type BackButtonHandler = () => boolean | void

/**
 * Register a handler for the Android hardware back button.
 * No-op on iOS/web/server. Returns a cleanup function.
 */
export function setupBackButton(handler: BackButtonHandler): () => void {
  if (!isNative() || !isAndroid()) return () => {}

  const listener = App.addListener('backButton', ({ canGoBack }) => {
    const result = handler()
    // If handler did not handle it (returned false/void) and webview has
    // no history to go back to, exit the app.
    if (result !== true && !canGoBack) {
      App.exitApp()
    }
  })

  return () => {
    listener.then((l) => l.remove()).catch(() => {})
  }
}
