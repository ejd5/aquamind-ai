import { api } from '@/lib/api-client'
import type { BillingClient, Product, Entitlement, PurchaseResult, PlanId } from './types'

export const stripeWebClient: BillingClient = {
  async getProducts(): Promise<Product[]> {
    return [
      { id: 'stripe_premium_monthly', plan: 'premium', duration: 'monthly', price: 12.99, priceString: '12,99 €', currency: 'EUR' },
      { id: 'stripe_premium_yearly', plan: 'premium', duration: 'yearly', price: 99, priceString: '99,00 €', currency: 'EUR', trialAvailable: true },
      { id: 'stripe_expert_monthly', plan: 'expert', duration: 'monthly', price: 24.99, priceString: '24,99 €', currency: 'EUR' },
      { id: 'stripe_expert_yearly', plan: 'expert', duration: 'yearly', price: 199, priceString: '199,00 €', currency: 'EUR', trialAvailable: true },
    ]
  },

  async getEntitlements(): Promise<Entitlement[]> {
    try {
      const sub = await api.get<{ plan: PlanId; subscription?: { active: boolean; expiresAt?: string } }>('/api/subscription')
      if (!sub?.subscription?.active) return []
      return [
        {
          id: sub.plan === 'expert' ? 'expert' : 'premium',
          plan: sub.plan,
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
    const expert = entitlements.find((e) => e.plan === 'expert' && e.isActive)
    if (expert) return 'expert'
    const premium = entitlements.find((e) => e.plan === 'premium' && e.isActive)
    if (premium) return 'premium'
    return 'free'
  },

  async manageSubscription(): Promise<void> {
    try {
      const result = await api.post<{ url: string }>('/api/stripe/portal', {})
      if (result?.url) window.location.href = result.url
    } catch {
      window.open('https://aqwelia.app/account', '_blank')
    }
  },
}
