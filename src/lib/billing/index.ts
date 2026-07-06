import { isNative } from '@/lib/platform'
import { revenueCatClient } from './revenuecat'
import { stripeWebClient } from './stripe-web'
import type { BillingClient } from './types'

export function getBillingClient(): BillingClient {
  if (isNative()) {
    return revenueCatClient
  }
  return stripeWebClient
}

export const billing = {
  getProducts: () => getBillingClient().getProducts(),
  getEntitlements: () => getBillingClient().getEntitlements(),
  purchase: (productId: string) => getBillingClient().purchase(productId),
  restorePurchases: () => getBillingClient().restorePurchases(),
  getActivePlan: () => getBillingClient().getActivePlan(),
  manageSubscription: () => getBillingClient().manageSubscription(),
}

export type { PlanId, Product, Entitlement, PurchaseResult, BillingPlatform, BillingClient } from './types'
