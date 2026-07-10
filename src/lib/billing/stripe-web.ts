import { api } from '@/lib/api-client'
import type { BillingClient, Product, Entitlement, PurchaseResult, PlanId } from './types'

// Web (Stripe) product catalogue.
// IDs mirror the Stripe Price IDs env-var names from src/lib/stripe.ts.
//   stripe_oasis_weekly     → Pass urgence 7j (3,99 €)
//   stripe_oasis_monthly    → Mensuel (9,99 €)
//   stripe_oasis_seasonal   → Saison 6 mois (39,99 €)
//   stripe_oasis_yearly     → Annuel (59,99 €)
//   stripe_wellness_weekly  → Pass urgence 7j (5,99 €)
//   stripe_wellness_monthly → Mensuel (14,99 €)
//   stripe_wellness_seasonal→ Saison 6 mois (54,99 €)
//   stripe_wellness_yearly  → Annuel (79,99 €)
export const stripeWebClient: BillingClient = {
  async getProducts(): Promise<Product[]> {
    return [
      // Oasis
      { id: 'stripe_oasis_weekly', plan: 'oasis', duration: 'weekly', price: 3.99, priceString: '3,99 €', currency: 'EUR' },
      { id: 'stripe_oasis_monthly', plan: 'oasis', duration: 'monthly', price: 9.99, priceString: '9,99 €', currency: 'EUR' },
      { id: 'stripe_oasis_seasonal', plan: 'oasis', duration: 'seasonal', price: 39.99, priceString: '39,99 €', currency: 'EUR' },
      { id: 'stripe_oasis_yearly', plan: 'oasis', duration: 'yearly', price: 59.99, priceString: '59,99 €', currency: 'EUR', trialAvailable: true },
      // Wellness
      { id: 'stripe_wellness_weekly', plan: 'wellness', duration: 'weekly', price: 5.99, priceString: '5,99 €', currency: 'EUR' },
      { id: 'stripe_wellness_monthly', plan: 'wellness', duration: 'monthly', price: 14.99, priceString: '14,99 €', currency: 'EUR' },
      { id: 'stripe_wellness_seasonal', plan: 'wellness', duration: 'seasonal', price: 54.99, priceString: '54,99 €', currency: 'EUR' },
      { id: 'stripe_wellness_yearly', plan: 'wellness', duration: 'yearly', price: 79.99, priceString: '79,99 €', currency: 'EUR', trialAvailable: true },
    ]
  },

  async getEntitlements(): Promise<Entitlement[]> {
    try {
      const sub = await api.get<{ plan: PlanId; subscription?: { active: boolean; expiresAt?: string } }>('/api/subscription')
      if (!sub?.subscription?.active) return []
      return [
        {
          id: sub.plan === 'wellness' ? 'wellness' : 'oasis',
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
    const wellness = entitlements.find((e) => e.plan === 'wellness' && e.isActive)
    if (wellness) return 'wellness'
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
