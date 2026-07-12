/**
 * AQWELIA — Freemium logic (backward-compatibility re-exports).
 *
 * The single source of truth for plans, limits, and feature gates is now
 * src/lib/billing/plans.ts. This file re-exports everything so existing
 * imports (`from '@/lib/pool/freemium'`) continue to work without changes.
 *
 * DO NOT add new plan definitions or feature gate logic here — use
 * src/lib/billing/plans.ts instead.
 */

export {
  type PlanId,
  type PlanDefinition,
  type PlanLimits,
  type FeatureGate,
  type CanAccessResult,
  type SubscriptionStatus,
  type Duration,
  type BillingPlatform,
  PLANS,
  DEFAULT_PLAN,
  DURATIONS,
  DURATION_TO_PROVIDER,
  PROVIDER_TO_DURATION,
  getPlan,
  getPlanOrThrow,
  getActivePlans,
  getPaidPlans,
  statusGrantsAccess,
  canAccess,
  getPlanFromStripePriceId,
  getPlanFromProductId,
} from '@/lib/billing/plans'

// Legacy type alias (old code used `Plan` instead of `PlanDefinition`)
export type Plan = import('@/lib/billing/plans').PlanDefinition
