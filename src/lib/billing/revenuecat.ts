/**
 * AQWELIA Wave A2 (Round 1) — RevenueCat BillingClient.
 *
 * All SDK operations (offerings, customer info, purchase, restore) are owned by
 * the single lifecycle manager (revenuecat-manager.ts). This module is only a
 * thin BillingClient adapter plus the web-side subscription management surface.
 * There is NO second Purchases.configure here.
 */

import { isNative, getPlatform } from '@/lib/platform'
import type { BillingClient, Product, Entitlement, PurchaseResult, PlanId } from './types'
import { revenueCatManager } from './revenuecat-manager'
import { confirmServerAccessConverged } from './revenuecat-identity-guard'

export const revenueCatClient: BillingClient = {
  async getProducts(): Promise<Product[]> {
    return revenueCatManager.getProducts()
  },

  async getEntitlements(): Promise<Entitlement[]> {
    return revenueCatManager.getEntitlements()
  },

  async purchase(productId: string): Promise<PurchaseResult> {
    const result = await revenueCatManager.purchase(productId)
    if (result.success && result.entitlement) {
      // Wave A2: after a purchase the client refreshes CustomerInfo (already
      // done inside the manager) but only treats the server access as converged
      // after GET /api/subscription agrees.
      const confirmedUserId = revenueCatManager.snapshot().sdkConfirmedUserId
      if (confirmedUserId) {
        result.serverConverged = await confirmServerAccessConverged(confirmedUserId)
      }
    }
    return result
  },

  async restorePurchases(): Promise<Entitlement[]> {
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
}
