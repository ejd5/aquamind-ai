/**
 * Server-side product analytics. Disabled by default and enabled only when
 * POSTHOG_SERVER_ENABLED=true. Identified events are sent only for users who
 * have explicitly granted analytics consent.
 */
import { db } from '@/lib/db'

let posthogNode: any | null = null
let posthogNodeInitAttempted = false

async function getPostHogNode(): Promise<any | null> {
  if (process.env.POSTHOG_SERVER_ENABLED !== 'true') return null
  if (posthogNodeInitAttempted) return posthogNode
  posthogNodeInitAttempted = true
  const key = process.env.POSTHOG_KEY
  if (!key) return null
  try {
    const mod = await import('posthog-node')
    const PostHog = (mod as any).default ?? (mod as any).PostHog
    if (!PostHog) return null
    posthogNode = new PostHog(key, {
      host: process.env.POSTHOG_HOST || 'https://eu.posthog.com',
      flushAt: 1,
      disableGeoip: true,
    })
    return posthogNode
  } catch (error) {
    console.warn('[analytics] posthog-node init failed:', error)
    return null
  }
}

async function userAllowsAnalytics(distinctId?: string): Promise<boolean> {
  if (!distinctId || distinctId === 'anonymous') return false
  try {
    const user = await db.user.findUnique({ where: { id: distinctId }, select: { consentAnalytics: true } })
    return user?.consentAnalytics === true
  } catch {
    return false
  }
}

export async function trackEventServer(
  eventName: string,
  properties: Record<string, unknown> = {},
  distinctId?: string
): Promise<void> {
  try {
    if (!(await userAllowsAnalytics(distinctId))) return
    const client = await getPostHogNode()
    if (!client) return
    client.capture({
      distinctId,
      event: eventName,
      properties: {
        ...properties,
        env: process.env.NODE_ENV === 'production' ? 'prod' : 'dev',
        platform: 'server',
      },
    })
    if (typeof client.flush === 'function') Promise.resolve(client.flush()).catch(() => {})
  } catch (error) {
    console.warn('[analytics] trackEventServer failed:', error)
  }
}
