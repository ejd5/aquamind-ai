/**
 * Keyboard handling — Capacitor Keyboard wrapper.
 *
 * SSR-safe: `setupKeyboard()` returns a no-op cleanup on web/server.
 * Sets CSS custom property `--keyboard-height` on `<body>` so layouts
 * can adapt to the open keyboard (e.g. lift the active input above it).
 *
 * Usage:
 *   import { useEffect } from 'react'
 *   import { setupKeyboard, hideKeyboard } from '@/lib/native'
 *
 *   useEffect(() => setupKeyboard(), [])
 *   <button onClick={() => hideKeyboard()}>Done</button>
 */

import { Keyboard, KeyboardStyle, KeyboardResize } from '@capacitor/keyboard'
import { isNative } from '@/lib/platform'

/**
 * Set up keyboard listeners and styling.
 * Returns a cleanup function that removes listeners.
 * No-op on web/server.
 */
export function setupKeyboard(): () => void {
  if (!isNative()) return () => {}

  const cleanups: Array<() => void> = []

  try {
    Keyboard.setStyle({ style: KeyboardStyle.Light }).catch(() => {})
    Keyboard.setResizeMode({ mode: KeyboardResize.Body }).catch(() => {})
  } catch {
    /* graceful degradation */
  }

  const showListener = Keyboard.addListener('keyboardWillShow', (info) => {
    if (typeof document === 'undefined') return
    document.body.style.setProperty('--keyboard-height', `${info.keyboardHeight}px`)
    document.body.classList.add('keyboard-open')
  })
  const hideListener = Keyboard.addListener('keyboardWillHide', () => {
    if (typeof document === 'undefined') return
    document.body.style.removeProperty('--keyboard-height')
    document.body.classList.remove('keyboard-open')
  })

  cleanups.push(() => {
    showListener.then((l) => l.remove()).catch(() => {})
  })
  cleanups.push(() => {
    hideListener.then((l) => l.remove()).catch(() => {})
  })

  return () => {
    cleanups.forEach((fn) => fn())
  }
}

/**
 * Hide the on-screen keyboard (e.g. when the user taps "Done").
 * No-op on web/server.
 */
export async function hideKeyboard(): Promise<void> {
  if (!isNative()) return
  try {
    await Keyboard.hide()
  } catch {
    /* graceful degradation */
  }
}
