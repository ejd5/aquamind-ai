import { api } from '@/lib/api-client'
import type { BillingClient, Product, Entitlement, PurchaseResult, PlanId } from './types'
import { PLANS, DURATION_TO_PROVIDER } from './plans'

// The public catalogue exposes every validated duration. Checkout accepts the
// exact product ID selected by the pricing UI.
export const stripeWebClient: BillingClient = {
  async getProducts(): Promise<Product[]> {
    return PLANS.filter(plan => plan.id !== 'decouverte' && plan.active).map(plan =>
      ({
        id: `${plan.id}_monthly`,
        plan: plan.id,
        duration: DURATION_TO_PROVIDER.month,
        price: plan.price.month,
        priceString: `${plan.price.month.toFixed(2).replace('.', ',')} €`,
        currency: 'EUR',
        trialAvailable: false,
      })
    )
  },

  async getEntitlements(): Promise<Entitlement[]> {
    try {
      // /api/subscription returns:
      //   plan: PlanDefinition (full object with id, name, price, ...)
      //   subscription.plan: PlanId (string, e.g. "spa365")
      // We must use subscription.plan (the string) for entitlement matching,
      // NOT plan (the object) — otherwise `plan === 'spa365'` is always false.
      const sub = await api.get<{ plan: PlanId; subscription?: { active: boolean; plan?: PlanId; expiresAt?: string } }>('/api/subscription')
      if (!sub?.subscription?.active) return []
      const planId: PlanId = sub.subscription?.plan || (typeof sub.plan === 'string' ? sub.plan : 'decouverte')
      // Entitlement.id only accepts paid plan IDs (not 'decouverte')
      const entitlementId = (['oasis', 'wellness', 'spa365'].includes(planId) ? planId : 'oasis') as 'oasis' | 'wellness' | 'spa365'
      return [
        {
          id: entitlementId,
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
    // Let the error propagate so callers can show a proper toast
    const result = await api.post<{ url: string }>('/api/stripe/portal', {})
    if (result?.url) window.location.href = result.url
  },
}
