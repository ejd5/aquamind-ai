import { api } from '@/lib/api-client'
import type { BillingClient, Product, Entitlement, PurchaseResult, PlanId } from './types'
import { PLANS, DURATION_TO_PROVIDER, type Duration } from './plans'

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
    return PLANS.filter(plan => plan.id !== 'decouverte' && plan.active).flatMap(plan =>
      (Object.entries(plan.price) as [Duration, number][]).map(([duration, price]) => ({
        id: `${plan.id}_${DURATION_TO_PROVIDER[duration]}`,
        plan: plan.id,
        duration: DURATION_TO_PROVIDER[duration],
        price,
        priceString: `${price.toFixed(2).replace('.', ',')} €`,
        currency: 'EUR',
        trialAvailable: duration === 'year',
      }))
    )
  },

  async getEntitlements(): Promise<Entitlement[]> {
    try {
      const sub = await api.get<{ plan: PlanId; subscription?: { active: boolean; expiresAt?: string } }>('/api/subscription')
      if (!sub?.subscription?.active) return []
      return [
        {
          id: sub.plan === 'spa365' ? 'spa365' : sub.plan === 'wellness' ? 'wellness' : 'oasis',
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
