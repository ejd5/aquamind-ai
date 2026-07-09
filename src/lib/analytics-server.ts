/**
 * AQWELIA — Server-side analytics (PostHog Node SDK).
 *
 * IMPORTANT: This module MUST stay server-only. It uses `posthog-node`
 * (which requires `node:fs`, `node:crypto`, etc.) — bundling it into the
 * browser breaks the app. Only import this from API route handlers
 * (files matching src/app/api/<route>/route.ts).
 *
 * Exports:
 *   - trackEventServer(eventName, properties?, distinctId?) — fire-and-
 *     forget, never throws. No-ops when POSTHOG_KEY env var is missing.
 *
 * Event-name conventions (snake_case) — shared with the client module:
 *   - user_signed_up, user_signed_in
 *   - water_test_submitted, photo_diagnostic_run, chat_message_sent
 *   - subscription_started, subscription_cancelled
 *   - partner_application_submitted
 *
 * Properties always include `env` ('dev' | 'prod') and `platform: 'server'`.
 */

// posthog-node is server-only — load it lazily inside the function so the
// module can be imported from any server route without bundling concerns.
let posthogNode: any | null = null
let posthogNodeInitAttempted = false

async function getPostHogNode(): Promise<any | null> {
  if (posthogNodeInitAttempted) return posthogNode
  posthogNodeInitAttempted = true
  const key = process.env.POSTHOG_KEY
  if (!key) return null
  try {
    const mod = await import('posthog-node')
    const PostHog = (mod as any).default ?? (mod as any).PostHog
    if (!PostHog) return null
    posthogNode = new PostHog(key, {
      host: process.env.POSTHOG_HOST || 'https://us.posthog.com',
      flushAt: 1,
      // Don't block the event loop — flush in background.
      disableGeoip: false,
    })
    return posthogNode
  } catch (err) {
    console.warn('[analytics] posthog-node init failed:', err)
    return null
  }
}

/**
 * Server-side event tracking. Used by API route handlers.
 * Returns immediately — the underlying posthog-node client flushes
 * asynchronously and never throws into the request flow.
 *
 * `distinctId` should be the user id (if known) or an anonymous id.
 */
export async function trackEventServer(
  eventName: string,
  properties: Record<string, unknown> = {},
  distinctId?: string
): Promise<void> {
  try {
    const client = await getPostHogNode()
    if (!client) return // env var missing — no-op
    client.capture({
      distinctId: distinctId || 'anonymous',
      event: eventName,
      properties: {
        ...properties,
        env: process.env.NODE_ENV === 'production' ? 'prod' : 'dev',
        platform: 'server',
      },
    })
    // Best-effort flush — fire and forget. If the process dies before the
    // flush completes, the event is lost; that's acceptable for analytics.
    if (typeof (client as any).flush === 'function') {
      Promise.resolve((client as any).flush()).catch(() => {})
    }
  } catch (err) {
    // Never let analytics break an API route.
    console.warn('[analytics] trackEventServer failed:', err)
  }
}
