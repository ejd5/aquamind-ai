import { api } from '@/lib/api-client'
import type { BillingClient, Product, Entitlement, PurchaseResult, PlanId } from './types'
import { PLANS, DURATION_TO_PROVIDER, WEB_DURATIONS, PAID_PLAN_IDS } from './plans'

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

  async getEntitlements(): Promise<Entitlement[]> {
    try {
      const sub = await api.get<{ plan: PlanId; subscription?: { active: boolean; plan?: PlanId; expiresAt?: string } }>('/api/subscription')
      if (!sub?.subscription?.active) return []
      const planId: PlanId = sub.subscription?.plan || (typeof sub.plan === 'string' ? sub.plan : 'decouverte')
      // SECURITY: an unknown or Free plan id must NEVER grant a paid
      // entitlement. The previous implementation fell back to 'oasis',
      // which would silently grant Pool access to any user with a
      // corrupted or unknown plan. We now return no entitlement and
      // log the anomaly for server-side investigation.
      if (!PAID_ENTITLEMENT_IDS.has(planId)) {
        if (typeof console !== 'undefined' && planId !== 'decouverte') {
          console.warn('[billing] active subscription with unknown plan id — no entitlement granted:', planId)
        }
        return []
      }
      return [
        {
          id: planId as 'oasis' | 'wellness' | 'spa365',
          plan: planId,
          isActive: true,
          willRenew: true,
          expiresAt: sub.subscription.expiresAt ? new Date(sub.subscription.expiresAt) : undefined,
          store: 'web',
        },
      ]
    } catch {
      return []
    }
  },

  async purchase(productId: string): Promise<PurchaseResult> {
    try {
      const result = await api.post<{ url: string }>('/api/stripe/checkout', { productId })
      if (result?.url) {
        window.location.href = result.url
        return { success: true }
      }
      return { success: false, error: 'No checkout URL' }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Checkout failed' }
    }
  },

  async restorePurchases(): Promise<Entitlement[]> {
    return this.getEntitlements()
  },

  async getActivePlan(): Promise<PlanId> {
    const entitlements = await this.getEntitlements()
    const wellness = entitlements.find((e) => e.plan === 'wellness' && e.isActive)
    if (wellness) return 'wellness'
    const spa365 = entitlements.find((e) => e.plan === 'spa365' && e.isActive)
    if (spa365) return 'spa365'
    const oasis = entitlements.find((e) => e.plan === 'oasis' && e.isActive)
    if (oasis) return 'oasis'
    return 'decouverte'
  },

  async manageSubscription(): Promise<void> {
    const result = await api.post<{ url: string }>('/api/stripe/portal', {})
    if (result?.url) window.location.href = result.url
  },
}
