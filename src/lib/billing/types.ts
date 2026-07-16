import type { PlanId, BillingPlatform, ProviderDuration, PlanDefinition, SubscriptionStatus } from './plans'
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

export interface PurchaseResult {
  success: boolean
  entitlement?: Entitlement
  error?: string
  userCancelled?: boolean
}

export interface BillingClient {
  getProducts(): Promise<Product[]>
  getEntitlements(): Promise<Entitlement[]>
  purchase(productId: string): Promise<PurchaseResult>
  restorePurchases(): Promise<Entitlement[]>
  getActivePlan(): Promise<PlanId>
  manageSubscription(): Promise<void>
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
  /** Full plan definition object (from getPlan()). NOT a PlanId string. */
  plan: PlanDefinition
  /** Database subscription row, or null if no subscription exists. */
  subscription: {
    id: string
    userId: string
    /** PlanId string stored in the DB column (e.g. "spa365"). */
    plan: PlanId
    status: SubscriptionStatus
    active: boolean
    duration?: string | null
    store?: string | null
    startedAt: string
    expiresAt?: string | null
    cancelAt?: string | null
    trialEndsAt?: string | null
    currentPeriodStart?: string | null
    currentPeriodEnd?: string | null
    stripeCustomerId?: string | null
    stripeSubscriptionId?: string | null
    providerSubscriptionId?: string | null
    lastProviderEventId?: string | null
    lastProviderEventAt?: string | null
  } | null
  allPlans: PlanDefinition[]
}
