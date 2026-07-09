export type PlanId = 'decouverte' | 'oasis' | 'wellness'
export type BillingPlatform = 'web' | 'ios' | 'android'

export interface Product {
  id: string
  plan: PlanId
  duration: 'weekly' | 'monthly' | 'seasonal' | 'yearly'
  price: number
  priceString: string
  currency: string
  trialAvailable?: boolean
}

export interface Entitlement {
  id: 'oasis' | 'wellness'
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
