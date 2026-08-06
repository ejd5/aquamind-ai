/**
 * AQWELIA Wave A2 — RevenueCat BillingClient.
 *
 * All SDK operations (offerings, customer info, purchase, restore) are owned by
 * the single lifecycle manager (revenuecat-manager.ts). This module is only a
 * thin BillingClient adapter plus the web-side subscription management surface.
 * There is NO second Purchases.configure here.
 *
 * Wave A2 (Round 2): purchase and restore already return explicit server
 * convergence (serverConverged / state) computed inside the manager with a
 * bounded GET /api/subscription poll.
 */

import { isNative, getPlatform } from '@/lib/platform'
import type { BillingClient, Product, Entitlement, PurchaseResult, PlanId, RestoreResult } from './types'
import { revenueCatManager } from './revenuecat-manager'

export const revenueCatClient: BillingClient = {
  async getProducts(): Promise<Product[]> {
    return revenueCatManager.getProducts()
  },

  async getEntitlements(): Promise<Entitlement[]> {
    return revenueCatManager.getEntitlements()
  },

  async purchase(productId: string): Promise<PurchaseResult> {
    return revenueCatManager.purchase(productId)
  },

  async restorePurchases(): Promise<RestoreResult> {
    return revenueCatManager.restorePurchases()
  },

  async getActivePlan(): Promise<PlanId> {
    return revenueCatManager.getActivePlan()
  },

  async manageSubscription(): Promise<void> {
    if (isNative()) {
      const { Browser } = await import('@capacitor/browser')
      const platform = getPlatform()
      const url =
        platform === 'ios'
          ? 'https://apps.apple.com/account/subscriptions'
          : 'https://play.google.com/store/account/subscriptions'
      await Browser.open({ url })
    } else {
      window.open('https://aqwelia.app/account', '_blank')
    }
  },

  async manageSubscriptionForTarget(target: 'stripe' | 'apple' | 'google'): Promise<void> {
    if (target === 'stripe') {
      const { api } = await import('@/lib/api-client')
      const result = await api.post<{ url: string }>('/api/stripe/portal', {})
      if (result?.url) window.location.href = result.url
      return
    }
    // Apple / Google management requires a native context (native only).
    if (!isNative()) {
      window.open('https://aqwelia.app/account', '_blank')
      return
    }
    const { Browser } = await import('@capacitor/browser')
    const url = target === 'apple'
      ? 'https://apps.apple.com/account/subscriptions'
      : 'https://play.google.com/store/account/subscriptions'
    await Browser.open({ url })
  },
}
