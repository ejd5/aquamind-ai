/**
 * Haptic feedback — Capacitor Haptics wrapper.
 *
 * SSR-safe: all calls no-op on web/server (isNative() === false).
 * Graceful degradation: every call wrapped in try/catch so a plugin
 * failure can never crash a user interaction.
 *
 * Usage:
 *   import { hapticLight, hapticSuccess } from '@/lib/native'
 *   <button onClick={() => hapticLight()}>Tap</button>
 *   await hapticSuccess()
 */

import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'
import { isNative } from '@/lib/platform'

/** Light tap — subtle, for small UI interactions (tab switch, list select). */
export async function hapticLight(): Promise<void> {
  if (!isNative()) return
  try {
    await Haptics.impact({ style: ImpactStyle.Light })
  } catch {
    /* graceful degradation */
  }
}

/** Medium tap — for primary button presses, confirmations. */
export async function hapticMedium(): Promise<void> {
  if (!isNative()) return
  try {
    await Haptics.impact({ style: ImpactStyle.Medium })
  } catch {
    /* graceful degradation */
  }
}

/** Heavy tap — for destructive or high-emphasis actions. */
export async function hapticHeavy(): Promise<void> {
  if (!isNative()) return
  try {
    await Haptics.impact({ style: ImpactStyle.Heavy })
  } catch {
    /* graceful degradation */
  }
}

/** Success notification — double-tap pattern, for completed actions. */
export async function hapticSuccess(): Promise<void> {
  if (!isNative()) return
  try {
    await Haptics.notification({ type: NotificationType.Success })
  } catch {
    /* graceful degradation */
  }
}

/** Error notification — strong buzz, for failures. */
export async function hapticError(): Promise<void> {
  if (!isNative()) return
  try {
    await Haptics.notification({ type: NotificationType.Error })
  } catch {
    /* graceful degradation */
  }
}

/** Warning notification — for cautionary events. */
export async function hapticWarning(): Promise<void> {
  if (!isNative()) return
  try {
    await Haptics.notification({ type: NotificationType.Warning })
  } catch {
    /* graceful degradation */
  }
}
