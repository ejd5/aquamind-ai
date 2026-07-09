/**
 * Local notifications — Capacitor `@capacitor/local-notifications` wrapper.
 *
 * SSR-safe: every function short-circuits on the server (`typeof window ===
 * 'undefined'`) and on web browsers (no Capacitor native shell). The
 * Capacitor plugin is loaded via dynamic `import()` so the module never
 * crashes during SSR or on browsers that have not installed the plugin.
 *
 * Graceful degradation: every call is wrapped in try/catch so a plugin
 * failure can never crash a user-facing flow (the reminder is still stored
 * server-side; only the device-side notification is best-effort).
 *
 * Usage:
 *   import {
 *     requestPermissions,
 *     scheduleLocalNotification,
 *     cancelAllNotifications,
 *   } from '@/lib/native'
 *
 *   await requestPermissions()
 *   await scheduleLocalNotification({
 *     title: 'Test your water',
 *     body: 'It has been 3 days since your last measurement.',
 *     scheduleAt: new Date(Date.now() + 60 * 60 * 1000),
 *   })
 */

import { isNative } from '@/lib/platform'

/**
 * Public payload accepted by `scheduleLocalNotification`.
 *
 * Mirrors the subset of `LocalNotificationSchema` from
 * `@capacitor/local-notifications` that we care about for AQWELIA
 * reminders (title, body, optional id, optional schedule).
 */
export interface LocalNotificationPayload {
  /** Notification title (required). */
  title: string
  /** Notification body (required). */
  body: string
  /**
   * Optional stable identifier. If omitted, Capacitor generates one.
   * Pass an explicit id when you later want to cancel this exact
   * notification via `cancelLocalNotification(id)`.
   */
  id?: number
  /**
   * When to fire the notification. Pass a `Date` for an absolute schedule
   * (recommended), or a number of milliseconds from now for a quick
   * relative schedule.
   *
   * If omitted, the notification fires immediately (no scheduling).
   */
  scheduleAt?: Date | number
  /**
   * Optional small icon resource name (Android only — see
   * `capacitor.config.ts` → `plugins.LocalNotifications.smallIcon`).
   */
  smallIcon?: string
  /** Optional accent color for the icon (Android only). */
  iconColor?: string
  /** Optional sound file name (without extension) in the native bundle. */
  sound?: string
}

/**
 * Lazy-loaded reference to the Capacitor LocalNotifications plugin.
 * Resolved on first call to any function below; cached afterwards.
 *
 * Resolves to `null` when:
 *  - running on the server (no `window`)
 *  - running on a web browser (not inside a Capacitor native shell)
 *  - the dynamic import fails (plugin not installed, build error, …)
 */
let _pluginPromise: Promise<typeof import('@capacitor/local-notifications')['LocalNotifications'] | null> | null = null

async function loadPlugin(): Promise<typeof import('@capacitor/local-notifications')['LocalNotifications'] | null> {
  if (typeof window === 'undefined') return null
  if (!isNative()) return null
  if (_pluginPromise) return _pluginPromise
  _pluginPromise = (async () => {
    try {
      const mod = await import('@capacitor/local-notifications')
      return mod.LocalNotifications
    } catch {
      // Plugin not available — degrade silently. The reminder is still
      // stored server-side; the user just won't get a device notification.
      return null
    }
  })()
  return _pluginPromise
}

/**
 * Request permission to display local notifications.
 *
 * Native: prompts the user (iOS) / reads the system setting (Android).
 * Web/Server: returns `'denied'` (we do not use the Web Notifications API
 * — AQWELIA is mobile-first and relies on the native plugin).
 *
 * Returns one of `'granted' | 'denied' | 'prompt'`.
 */
export async function requestPermissions(): Promise<'granted' | 'denied' | 'prompt'> {
  const plugin = await loadPlugin()
  if (!plugin) return 'denied'
  try {
    const status = await plugin.requestPermissions()
    return (status.display as 'granted' | 'denied' | 'prompt') ?? 'denied'
  } catch {
    return 'denied'
  }
}

/**
 * Alias kept for backward-compat with the barrel export
 * `requestNotificationPermission` (singular). New code should prefer
 * `requestPermissions`.
 */
export const requestNotificationPermission = requestPermissions

/**
 * Schedule a single local notification.
 *
 * Native: forwards to `LocalNotifications.schedule({ notifications: [...] })`.
 * Web/Server: no-op (returns `{ notifications: [] }`).
 *
 * @example
 *   await scheduleLocalNotification({
 *     title: 'Aqwelia',
 *     body: 'Time to test your water',
 *     scheduleAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
 *   })
 *
 * Backward-compatible call signature: you can also pass positional
 * arguments `(title, body, scheduleAt)` as a convenience.
 */
export async function scheduleLocalNotification(
  payloadOrTitle: LocalNotificationPayload | string,
  maybeBody?: string,
  maybeScheduleAt?: Date | number,
): Promise<{ notifications: { id: number }[] }> {
  const plugin = await loadPlugin()
  if (!plugin) return { notifications: [] }

  // Normalise the two call signatures into a single ScheduleOptions shape.
  const payload: LocalNotificationPayload =
    typeof payloadOrTitle === 'string'
      ? {
          title: payloadOrTitle,
          body: maybeBody ?? '',
          scheduleAt: maybeScheduleAt,
        }
      : payloadOrTitle

  try {
    const schedule: Record<string, unknown> = {}
    if (payload.scheduleAt) {
      const at =
        payload.scheduleAt instanceof Date
          ? payload.scheduleAt
          : new Date(Date.now() + payload.scheduleAt)
      schedule.at = at
    }

    const result = await plugin.schedule({
      notifications: [
        {
          title: payload.title,
          body: payload.body,
          id: payload.id ?? Math.floor(Math.random() * 2_000_000_000),
          ...(payload.smallIcon ? { smallIcon: payload.smallIcon } : {}),
          ...(payload.iconColor ? { iconColor: payload.iconColor } : {}),
          ...(payload.sound ? { sound: payload.sound } : {}),
          ...(Object.keys(schedule).length > 0 ? { schedule } : {}),
        },
      ],
    })

    return {
      notifications: (result.notifications ?? []).map((n) => ({ id: n.id })),
    }
  } catch {
    return { notifications: [] }
  }
}

/**
 * Cancel a single scheduled notification by its id.
 *
 * Native: forwards to `LocalNotifications.cancel({ notifications: [{ id }] })`.
 * Web/Server: no-op.
 */
export async function cancelLocalNotification(id: number): Promise<void> {
  const plugin = await loadPlugin()
  if (!plugin) return
  try {
    await plugin.cancel({ notifications: [{ id }] })
  } catch {
    /* graceful degradation */
  }
}

/**
 * Cancel ALL pending local notifications.
 *
 * Native: fetches the pending list, then cancels every id in one call.
 * Web/Server: no-op.
 *
 * Use this when the user completes / dismisses all reminders (e.g. after
 * running a water test that resolves every pending action).
 */
export async function cancelAllNotifications(): Promise<void> {
  const plugin = await loadPlugin()
  if (!plugin) return
  try {
    const pending = await plugin.getPending()
    const ids = (pending.notifications ?? []).map((n) => n.id)
    if (ids.length === 0) return
    await plugin.cancel({ notifications: ids.map((id) => ({ id })) })
  } catch {
    /* graceful degradation */
  }
}

/**
 * List all currently-pending notifications (scheduled but not yet fired).
 *
 * Native: forwards to `LocalNotifications.getPending()`.
 * Web/Server: returns `{ notifications: [] }`.
 */
export async function getPendingNotifications(): Promise<{
  notifications: { id: number; title?: string; body?: string; scheduleAt?: Date }[]
}> {
  const plugin = await loadPlugin()
  if (!plugin) return { notifications: [] }
  try {
    const result = await plugin.getPending()
    return {
      notifications: (result.notifications ?? []).map((n) => ({
        id: n.id,
        title: n.title,
        body: n.body,
        scheduleAt: n.schedule?.at,
      })),
    }
  } catch {
    return { notifications: [] }
  }
}
