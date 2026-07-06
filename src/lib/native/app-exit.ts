/**
 * Exit app (Android) — Capacitor App wrapper.
 *
 * SSR-safe: no-op on web/server/iOS (iOS apps cannot programmatically exit).
 * Used as a last-resort escape hatch by `back-button.ts` when there is no
 * webview history to go back to.
 *
 * Usage:
 *   import { exitApp } from '@/lib/native'
 *   <button onClick={() => exitApp()}>Quitter l’app</button>
 */

import { App } from '@capacitor/app'
import { isNative, isAndroid } from '@/lib/platform'

/**
 * Exit the app immediately. Android only.
 * No-op on iOS/web/server.
 */
export async function exitApp(): Promise<void> {
  if (isNative() && isAndroid()) {
    try {
      App.exitApp()
    } catch {
      /* graceful degradation */
    }
  }
}
