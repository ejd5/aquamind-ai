'use client'

/**
 * AQWELIA Wave A2 (Round 7) — target-based subscription management routing.
 *
 * The management target DETERMINES the handler — never the current platform.
 * This is client-safe (no Prisma/db/server-only) and used by the billing
 * facade's manageSubscriptionForTarget() directly.
 *
 * Contract:
 *   - target 'stripe' : POST /api/stripe/portal; require a valid URL; navigate.
 *   - target 'apple'  : official Apple subscription management URL, opened via
 *                       Browser.open in Capacitor or window.open on web — NEVER
 *                       a silent redirect to aqwelia.app/account.
 *   - target 'google' : official Google Play subscription management URL, opened
 *                       via Browser.open in Capacitor or window.open on web —
 *                       NEVER a silent redirect to aqwelia.app/account.
 */

export const APPLE_SUBSCRIPTION_URL = 'https://apps.apple.com/account/subscriptions'
export const GOOGLE_SUBSCRIPTION_URL = 'https://play.google.com/store/account/subscriptions'

export type SubscriptionManagementTarget = 'stripe' | 'apple' | 'google'

/**
 * Opens the management surface for the given target. Works identically on web
 * and native (Capacitor). Never falls back to the app account page.
 */
export async function manageSubscriptionTarget(
  target: SubscriptionManagementTarget,
  deps: {
    isNative: () => boolean
    openBrowser?: (url: string) => Promise<void>
    openWindow?: (url: string) => void
    postStripePortal?: () => Promise<{ url?: string } | null>
  },
): Promise<void> {
  if (target === 'stripe') {
    const result = deps.postStripePortal
      ? await deps.postStripePortal()
      : await postStripePortal()
    const url = result?.url
    if (!url) throw new Error('Stripe portal URL missing')
    if (deps.isNative()) {
      if (deps.openBrowser) {
        await deps.openBrowser(url)
      } else {
        await openCapacitorBrowser(url)
      }
    } else if (deps.openWindow) {
      deps.openWindow(url)
    } else {
      window.location.href = url
    }
    return
  }

  const url = target === 'apple' ? APPLE_SUBSCRIPTION_URL : GOOGLE_SUBSCRIPTION_URL
  if (deps.isNative()) {
    if (deps.openBrowser) {
      await deps.openBrowser(url)
    } else {
      await openCapacitorBrowser(url)
    }
    return
  }
  // Web: open the SAME official store URL — never aqwelia.app/account.
  if (deps.openWindow) {
    deps.openWindow(url)
  } else {
    window.open(url, '_blank')
  }
}

async function postStripePortal(): Promise<{ url?: string } | null> {
  const { api } = await import('@/lib/api-client')
  return api.post<{ url: string }>('/api/stripe/portal', {})
}

async function openCapacitorBrowser(url: string): Promise<void> {
  const { Browser } = await import('@capacitor/browser')
  await Browser.open({ url })
}
