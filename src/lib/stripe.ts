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
export const STRIPE_PRICES = {
  premium_monthly: process.env.STRIPE_PRICE_PREMIUM_MONTHLY || '',
  premium_yearly: process.env.STRIPE_PRICE_PREMIUM_YEARLY || '',
  expert_monthly: process.env.STRIPE_PRICE_EXPERT_MONTHLY || '',
  expert_yearly: process.env.STRIPE_PRICE_EXPERT_YEARLY || '',
} as const

export type StripeProductId = keyof typeof STRIPE_PRICES

export function isValidProductId(id: string): id is StripeProductId {
  return id in STRIPE_PRICES
}

// Maps a Stripe product id (e.g. "expert_yearly") to the AQWELIA plan name
// stored in the `Subscription.plan` column ("premium" | "expert").
export function getPlanFromProductId(productId: string): 'premium' | 'expert' {
  if (productId.includes('expert')) return 'expert'
  return 'premium'
}
