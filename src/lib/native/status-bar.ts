/**
 * Status bar styling — Capacitor StatusBar wrapper.
 *
 * SSR-safe: all calls no-op on web/server (no status bar exists).
 * Uses the Aqwelia oceanic brand color `#003B4A` as background.
 *
 * Usage:
 *   import { setStatusBarDark, setStatusBarLight } from '@/lib/native'
 *   useEffect(() => { setStatusBarDark() }, [])
 */

import { StatusBar, Style } from '@capacitor/status-bar'
import { isNative, isIOS } from '@/lib/platform'

const AQWELIA_BG = '#003B4A'

/**
 * Dark status bar (light text on dark background).
 * iOS: sets background color too. Android: default background.
 */
export async function setStatusBarDark(): Promise<void> {
  if (!isNative()) return
  try {
    await StatusBar.setStyle({ style: Style.Dark })
    if (isIOS()) {
      await StatusBar.setBackgroundColor({ color: AQWELIA_BG })
    }
  } catch {
    /* graceful degradation */
  }
}

/**
 * Light status bar (dark text on light background).
 * Keeps the Aqwelia oceanic background.
 */
export async function setStatusBarLight(): Promise<void> {
  if (!isNative()) return
  try {
    await StatusBar.setStyle({ style: Style.Light })
    await StatusBar.setBackgroundColor({ color: AQWELIA_BG })
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
