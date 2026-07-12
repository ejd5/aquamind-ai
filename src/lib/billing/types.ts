import type { PlanId, BillingPlatform, ProviderDuration } from './plans'
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
