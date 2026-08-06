import { api } from '@/lib/api-client'
import type { BillingClient, Product, Entitlement, PurchaseResult, PlanId, RestoreResult, SubscriptionApiResponse, BillingPlatform } from './types'
import { PLANS, DURATION_TO_PROVIDER, WEB_DURATIONS, PAID_PLAN_IDS, getPlanFromWebProductId } from './plans'
import { pickDisplayEntitlement, hasActiveEntitlement } from './entitlement-resolution'

// Paid plan ids that grant an entitlement.
const PAID_ENTITLEMENT_IDS: ReadonlySet<string> = new Set(PAID_PLAN_IDS)

// The public catalogue exposes every validated duration. Checkout accepts the
// exact product ID selected by the pricing UI.
export const stripeWebClient: BillingClient = {
  async getProducts(): Promise<Product[]> {
    // Expose exactly the 12 validated paid products: 3 plans × 4 web durations.
    // Free, week, and any zero-price product are never exposed.
    const products: Product[] = []
    for (const plan of PLANS) {
      if (plan.id === 'decouverte') continue
      if (!plan.active) continue
      if (!PAID_ENTITLEMENT_IDS.has(plan.id)) continue
      for (const duration of WEB_DURATIONS) {
        const price = plan.price[duration]
        if (typeof price !== 'number' || price <= 0) continue
        products.push({
          id: `${plan.id}_${DURATION_TO_PROVIDER[duration]}`,
          plan: plan.id,
          duration: DURATION_TO_PROVIDER[duration],
          price,
          priceString: `${price.toFixed(2).replace('.', ',')} €`,
          currency: 'EUR',
          trialAvailable: false,
        })
      }
    }
    return products
  },

  /**
   * Wave A2 (Round 2): returns ONE entitlement per granted plan (union), never
   * a single selected row. Reads the access.grantedPlans projection which is
   * identical to the server feature gates.
   */
  async getEntitlements(): Promise<Entitlement[]> {
    try {
      const sub = await api.get<SubscriptionApiResponse>('/api/subscription')
      const access = sub?.access
      if (!access?.hasValidAccess) return []
      const store: BillingPlatform = (sub?.subscription?.store as BillingPlatform) || 'web'
      const expiresAt = sub?.subscription?.expiresAt
      const entitlements: Entitlement[] = []
      for (const planId of access.grantedPlans) {
        if (!PAID_ENTITLEMENT_IDS.has(planId)) {
          // SECURITY: an unknown or Free plan id must NEVER grant a paid
          // entitlement. Log the anomaly for server-side investigation.
          if (typeof console !== 'undefined' && planId !== 'decouverte') {
            console.warn('[billing] active subscription with unknown plan id — no entitlement granted:', planId)
          }
          continue
        }
        entitlements.push({
          id: planId as 'oasis' | 'wellness' | 'spa365',
          plan: planId,
          isActive: true,
          willRenew: true,
          expiresAt: expiresAt ? new Date(expiresAt) : undefined,
          store,
        })
      }
      return entitlements
    } catch {
      return []
    }
  },

  async purchase(productId: string): Promise<PurchaseResult> {
    try {
      const result = await api.post<{ url: string }>('/api/stripe/checkout', { productId })
      if (result?.url) {
        window.location.href = result.url
        // Checkout redirect: convergence is deferred to the webhook.
        const planInfo = getPlanFromWebProductId(productId)
        return { success: true, state: 'pending', serverConverged: false, purchasedPlan: planInfo?.plan }
      }
      return { success: false, state: 'failed', error: 'No checkout URL' }
    } catch (err) {
      return { success: false, state: 'failed', error: err instanceof Error ? err.message : 'Checkout failed' }
    }
  },

  async restorePurchases(): Promise<RestoreResult> {
    try {
      const entitlements = await this.getEntitlements()
      const restored = hasActiveEntitlement(entitlements)
      return {
        entitlements,
        restored,
        serverConverged: restored,
        state: restored ? 'converged' : 'none',
      }
    } catch {
      return { entitlements: [], restored: false, serverConverged: false, state: 'none' }
    }
  },

  async getActivePlan(): Promise<PlanId> {
    const entitlements = await this.getEntitlements()
    return pickDisplayEntitlement(entitlements)?.plan ?? 'decouverte'
  },

  async manageSubscription(): Promise<void> {
    const result = await api.post<{ url: string }>('/api/stripe/portal', {})
    if (result?.url) window.location.href = result.url
  },
}
