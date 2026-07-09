/**
 * Status bar styling — Capacitor StatusBar wrapper.
 *
 * SSR-safe: all calls no-op on web/server (no status bar exists).
 * Uses the Aqwelia oceanic brand color `#003B4A` as the persistent
 * status bar background to match the header gradient.
 *
 * NOTE on Capacitor's `Style` enum (confusingly named):
 *   - `Style.Dark`  = dark content (dark text)   → use on LIGHT backgrounds
 *   - `Style.Light` = light content (light text) → use on DARK  backgrounds
 *
 * So "dark status bar" (dark AQWELIA brand bg + light text) requires
 * `Style.Light`, and "light status bar" (light bg + dark text) requires
 * `Style.Dark`. Both functions below fix this historically-inverted
 * mapping and always set the brand background color on iOS + Android.
 *
 * Usage:
 *   import { setStatusBarDark, setStatusBarLight } from '@/lib/native'
 *   useEffect(() => { setStatusBarDark() }, [])
 */

import { StatusBar, Style } from '@capacitor/status-bar'
import { isNative } from '@/lib/platform'

const AQWELIA_BG = '#003B4A'

/**
 * Dark status bar — Aqwelia brand dark background (#003B4A) with light text.
 * This is the default appearance used by the mobile shell on launch.
 * Sets the background on both iOS and Android.
 */
export async function setStatusBarDark(): Promise<void> {
  if (!isNative()) return
  try {
    // Light content (light text) — required for dark brand background.
    await StatusBar.setStyle({ style: Style.Light })
    await StatusBar.setBackgroundColor({ color: AQWELIA_BG })
    // Ensure the status bar is visible above the WebView (not overlay).
    await StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {})
  } catch {
    /* graceful degradation */
  }
}

/**
 * Light status bar — light background with dark text.
 * Used by surfaces that are predominantly light (e.g. the onboarding screen
 * when rendered over a white background instead of the brand gradient).
 */
export async function setStatusBarLight(): Promise<void> {
  if (!isNative()) return
  try {
    // Dark content (dark text) — required for light backgrounds.
    await StatusBar.setStyle({ style: Style.Dark })
    await StatusBar.setBackgroundColor({ color: '#FFFFFF' })
    await StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {})
  } catch {
    /* graceful degradation */
  }
}

/** Show the status bar (it may have been hidden by a splash screen). */
export async function showStatusBar(): Promise<void> {
  if (!isNative()) return
  try {
    await StatusBar.show()
  } catch {
    /* graceful degradation */
  }
}

/** Hide the status bar (for fullscreen experiences). */
export async function hideStatusBar(): Promise<void> {
  if (!isNative()) return
  try {
    await StatusBar.hide()
  } catch {
    /* graceful degradation */
  }
}
