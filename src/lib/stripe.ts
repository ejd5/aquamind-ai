/**
 * AQWELIA — Stripe client (server-side only)
 *
 * Web subscriptions: Stripe Checkout + Customer Portal + Webhooks.
 * Mobile (iOS/Android) subscriptions are handled by RevenueCat (Lot 3-E).
 *
 * This module NEVER exposes the secret key to the client. It is imported only
 * by API routes that run on the Node.js runtime.
 */
import Stripe from 'stripe'
import { PLANS, DURATION_TO_PROVIDER, type Duration, type PlanId } from '@/lib/billing/plans'

// Singleton Stripe client — created lazily on first use
let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (_stripe) return _stripe
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY not configured')
  // `as any` because the installed SDK pins LatestApiVersion to a specific
  // date-string ("2026-06-24.dahlia"). Passing a different pinned version is
  // allowed at runtime but TS would reject it. We deliberately cast to avoid
  // build breakage when the SDK is upgraded.
  _stripe = new Stripe(key, {
    apiVersion: '2025-06-30.basil' as any,
    typescript: true,
  })
  return _stripe
}

// Product / Price mapping (Stripe Price IDs).
// Each value MUST be created in the Stripe Dashboard and wired to the env var.
// Keys are stable identifiers used by the client and the webhook metadata.
//
// Commercial names: oasis = Pool, spa365 = Spa, wellness = Complete.
// The launch catalogue exposes monthly prices only.
export type StripeProductId = `${Exclude<PlanId, 'decouverte'>}_${ReturnType<typeof providerDuration>}`

function providerDuration(duration: Duration) { return DURATION_TO_PROVIDER[duration] }

export const STRIPE_PRICES = Object.fromEntries(
  PLANS.filter(plan => plan.id !== 'decouverte').flatMap(plan =>
    (Object.entries(plan.stripePrices) as [Duration, string][]).map(([duration, priceId]) => [
      `${plan.id}_${providerDuration(duration)}`,
      priceId || '',
    ])
  )
) as Record<StripeProductId, string>

export function isValidProductId(id: string): id is StripeProductId {
  return id in STRIPE_PRICES
}

// Maps a Stripe product id (e.g. "wellness_yearly") to the AQWELIA plan name
// stored in the `Subscription.plan` column.
// Uses the centralized getPlanFromProductId from billing/plans.ts.
export { getPlanFromProductId, getPlanFromWebProductId } from '@/lib/billing/plans'
