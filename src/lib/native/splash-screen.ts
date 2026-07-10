/**
 * Splash screen — Capacitor SplashScreen wrapper.
 *
 * SSR-safe: all calls no-op on web/server (no splash screen exists).
 *
 * On native, the splash screen is shown automatically at app launch by
 * the OS / Capacitor (configured in `capacitor.config.ts` →
 * `plugins.SplashScreen`). This module exposes explicit controls so the
 * React app can:
 *   - Hide the splash screen once first paint + critical data are ready
 *     (prevents a flash of empty UI when the WebView is still hydrating).
 *   - Show a manual splash screen for short foreground transitions
 *     (e.g. "Re-syncing data after offline period").
 *
 * Usage:
 *   import { hideSplash, showSplash } from '@/lib/native'
 *   useEffect(() => {
 *     // After React hydration + profile fetch complete
 *     hideSplash()
 *   }, [profileLoaded])
 */

import { SplashScreen } from '@capacitor/splash-screen'
import { isNative } from '@/lib/platform'

/**
 * Hide the launch splash screen.
 * Safe to call multiple times — second call is a no-op.
 *
 * Native: `SplashScreen.hide()` (fades out over ~200ms).
 * Web:    no-op.
 */
export async function hideSplash(): Promise<void> {
  if (!isNative()) return
  try {
    await SplashScreen.hide()
  } catch {
    /* graceful degradation — splash auto-hides after launchShowDuration */
  }
}

/**
 * Show the splash screen manually (e.g. during a re-sync).
 *
 * Native: `SplashScreen.show()` (uses the same background color + image
 *         configured in `capacitor.config.ts`).
 * Web:    no-op.
 *
 * @param options.autoHideMs Hide automatically after N ms (default: don't auto-hide).
 * @param options.fadeDuration Fade-in duration in ms (default: 200).
 */
export async function showSplash(
  options?: { autoHideMs?: number; fadeDuration?: number },
): Promise<void> {
  if (!isNative()) return
  try {
    await SplashScreen.show({
      autoHide: typeof options?.autoHideMs === 'number',
      showDuration: options?.autoHideMs ?? 0,
      fadeOutDuration: options?.fadeDuration ?? 200,
    })
  } catch {
    /* graceful degradation */
  }
}

/**
 * Wait for the splash screen's auto-hide event.
 *
 * Note: `@capacitor/splash-screen` v8 does NOT expose a `dismissed`
 * listener (the launch splash auto-hides after `launchShowDuration` ms
 * configured in `capacitor.config.ts`). This helper is therefore a
 * no-op kept for API symmetry with other native modules — callers can
 * still poll `getCurrentAppState()` from `./lifecycle` if they need to
 * detect when the WebView becomes visible.
 */
export function onSplashDismissed(_callback: () => void): () => void {
  // No native listener available in @capacitor/splash-screen v8.
  return () => {}
}
