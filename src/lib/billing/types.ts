import type { PlanId, BillingPlatform, ProviderDuration, PlanDefinition, SubscriptionStatus, PlanLimits } from './plans'
export type { PlanId, BillingPlatform } from './plans'

export interface Product {
  id: string
  plan: PlanId
  duration: ProviderDuration
  price: number
  priceString: string
  currency: string
  trialAvailable?: boolean
}

export interface Entitlement {
  id: 'oasis' | 'wellness' | 'spa365'
  plan: PlanId
  isActive: boolean
  willRenew: boolean
  expiresAt?: Date
  purchasedAt?: Date
  store: BillingPlatform
  originalPurchaseDate?: Date
}

/**
 * Wave A2 (Round 5/6) — PurchaseResult contract (strict invariants).
 *
 * state is the canonical, single-source status:
 *   - 'converged' : SDK confirmed the EXPECTED plan AND the expected RevenueCat
 *                   source is present server-side (serverConverged=true).
 *   - 'pending'   : the provider CONFIRMED the purchase (native: expected plan
 *                   active in CustomerInfo; web: webhook-driven) but it is not
 *                   yet projected server-side. NOT an activation.
 *   - 'redirected'/'checkout_started' : Stripe ONLY — a Checkout URL was created
 *                   and the user is being redirected. This is NEVER a confirmed
 *                   purchase: success=true here ONLY means "redirect initiated".
 *   - 'cancelled' : the user cancelled the purchase (userCancelled=true).
 *   - 'failed'    : the purchase did not succeed (success=false).
 *
 * NATIVE invariants:
 *   - success===true        ⇔  SDK confirmed an ACTIVE entitlement whose plan
 *                              === the purchased plan (expectedPlan).
 *   - serverConverged===true ⇒  expected RevenueCat source present server-side.
 *   - success===true + serverConverged===false  ⇔  state==='pending' — the UI
 *                              must NEVER treat this as a definitive activation.
 *
 * WEB / CHECKOUT invariants:
 *   - state==='redirected'  ⇔  a Checkout URL was created; the purchase is NOT
 *                              confirmed yet. No caller may interpret this as a
 *                              successful purchase.
 *   - web convergence is webhook-driven: after the redirect the user's server
 *     projection (GET /api/subscription) is the authority.
 */
export interface PurchaseResult {
  success: boolean
  entitlement?: Entitlement
  error?: string
  userCancelled?: boolean
  /** Wave A2: true when the expected RevenueCat source is present server-side. */
  serverConverged?: boolean
  /** Wave A2 (Round 5/6): explicit state. */
  state: 'converged' | 'pending' | 'redirected' | 'cancelled' | 'failed'
  /** The plan the purchase was made for (canonical product id → plan). */
  purchasedPlan?: PlanId
}

/**
 * Wave A2 (Round 2) — restore result. A restore never presents the local
 * CustomerInfo as definitively active; it reports an explicit convergence state:
 *   - converged : server projection reflects at least one active subscription
 *   - pending   : restored locally but the webhook has not arrived yet
 *   - none      : nothing to restore
 */
export interface RestoreResult {
  entitlements: Entitlement[]
  restored: boolean
  serverConverged: boolean
  state: 'converged' | 'pending' | 'none'
}

export interface BillingClient {
  getProducts(): Promise<Product[]>
  getEntitlements(): Promise<Entitlement[]>
  purchase(productId: string): Promise<PurchaseResult>
  restorePurchases(): Promise<RestoreResult>
  getActivePlan(): Promise<PlanId>
  manageSubscription(): Promise<void>
  /** Wave A2 (Round 6): manage a specific provider target (stripe | apple | google). */
  manageSubscriptionForTarget(target: 'stripe' | 'apple' | 'google'): Promise<void>
}


/**
 * Exact response shape of GET /api/subscription.
 *
 * IMPORTANT: `plan` is the full PlanDefinition OBJECT (returned by
 * getPlan()), while `subscription.plan` is the PlanId STRING stored in
 * the database. These are different types and must never be compared
 * with ===. Use `subscription.plan` (the string) for entitlement
 * matching, never `plan` (the object).
 *
 * This type is shared between the server route and the billing client
 * to prevent the object-vs-string comparison bug fixed in P0-I from
 * ever recurring.
 */
export interface SubscriptionApiResponse {
  /** Full plan definition object (from getPlan()) — DISPLAY ONLY. */
  plan: PlanDefinition
  /** Display subscription row, or null if no subscription exists. */
  subscription: {
    id: string
    userId: string
    /** PlanId string of the DISPLAY plan (e.g. "spa365"). */
    plan: PlanId
    status: SubscriptionStatus
    active: boolean
    duration?: string | null
    store?: string | null
    provider?: string | null
    environment?: string | null
    startedAt: string
    expiresAt?: string | null
    cancelAt?: string | null
    trialEndsAt?: string | null
    currentPeriodStart?: string | null
    currentPeriodEnd?: string | null
    lastProviderEventAt?: string | null
  } | null
  /** Wave A2 (Round 2): true capability union — consistent with the gates. */
  access: {
    hasValidAccess: boolean
    grantedPlans: PlanId[]
    grantedFeatures: string[]
    effectiveLimits: PlanLimits
  }
  /** Valid entitlement sources, provider/environment/store preserved. */
  sources: {
    id: string
    plan: PlanId
    status: SubscriptionStatus
    provider: string
    environment: string
    store: string | null
    expiresAt: string | null
    startedAt: string
  }[]
  allPlans: PlanDefinition[]
}
