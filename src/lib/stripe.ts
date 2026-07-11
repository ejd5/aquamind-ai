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
//
// Plan mapping (B2C — P1-TARIFS):
//   oasis_*     → AQWELIA Oasis (1 piscine, analyses illimitées, mode pro)
//   wellness_*  → AQWELIA Wellness (Oasis + spa + traitements spa)
//
// Durations:
//   weekly   → Pass urgence 7j
//   monthly  → 1 mois
//   seasonal → 6 mois (saison)
//   yearly   → 12 mois
export const STRIPE_PRICES = {
  oasis_weekly: process.env.STRIPE_PRICE_OASIS_WEEKLY || '',
  oasis_monthly: process.env.STRIPE_PRICE_OASIS_MONTHLY || '',
  oasis_seasonal: process.env.STRIPE_PRICE_OASIS_SEASONAL || '',
  oasis_yearly: process.env.STRIPE_PRICE_OASIS_YEARLY || '',
  wellness_weekly: process.env.STRIPE_PRICE_WELLNESS_WEEKLY || '',
  wellness_monthly: process.env.STRIPE_PRICE_WELLNESS_MONTHLY || '',
  wellness_seasonal: process.env.STRIPE_PRICE_WELLNESS_SEASONAL || '',
  wellness_yearly: process.env.STRIPE_PRICE_WELLNESS_YEARLY || '',
  spa365_weekly: process.env.STRIPE_PRICE_SPA365_WEEKLY || '',
  spa365_monthly: process.env.STRIPE_PRICE_SPA365_MONTHLY || '',
  spa365_seasonal: process.env.STRIPE_PRICE_SPA365_SEASONAL || '',
  spa365_yearly: process.env.STRIPE_PRICE_SPA365_YEARLY || '',
} as const

export type StripeProductId = keyof typeof STRIPE_PRICES

export function isValidProductId(id: string): id is StripeProductId {
  return id in STRIPE_PRICES
}

// Maps a Stripe product id (e.g. "wellness_yearly") to the AQWELIA plan name
// stored in the `Subscription.plan` column.
// Uses the centralized getPlanFromProductId from billing/plans.ts.
export { getPlanFromProductId } from '@/lib/billing/plans'
