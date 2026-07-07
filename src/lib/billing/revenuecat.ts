import { Purchases, LOG_LEVEL } from '@revenuecat/purchases-capacitor'
import { isNative, getPlatform } from '@/lib/platform'
import type { BillingClient, Product, Entitlement, PurchaseResult, PlanId } from './types'

const RC_API_KEYS = {
  ios: process.env.NEXT_PUBLIC_REVENUECAT_IOS_KEY || '',
  android: process.env.NEXT_PUBLIC_REVENUECAT_ANDROID_KEY || '',
}

let _initialized = false
let _loggedInUserId: string | null = null

async function ensureInitialized() {
  if (_initialized || !isNative()) return
  const platform = getPlatform()
  const apiKey = platform === 'ios' ? RC_API_KEYS.ios : RC_API_KEYS.android
  if (!apiKey) throw new Error('RevenueCat API key not configured')

  await Purchases.configure({ apiKey })
  await Purchases.setLogLevel({ level: LOG_LEVEL.INFO })
  _initialized = true
}

/**
 * Link the current NextAuth user to RevenueCat.
 * Must be called after login so that purchases are attributed to the right user.
 * The webhook uses app_user_id (== userId) to sync entitlements to our DB.
 */
export async function loginRevenueCatUser(userId: string): Promise<void> {
  if (!isNative() || !userId) return
  await ensureInitialized()
  if (_loggedInUserId === userId) return  // already logged in
  try {
    await Purchases.logIn({ appUserID: userId })
    _loggedInUserId = userId
  } catch {
    // User may already exist in RC — try restore instead
    try {
      await Purchases.restorePurchases()
      _loggedInUserId = userId
    } catch {}
  }
}

/**
 * Unlink the current user from RevenueCat (on logout).
 */
export async function logoutRevenueCatUser(): Promise<void> {
  if (!isNative() || !_loggedInUserId) return
  try {
    await Purchases.logOut()
  } catch {}
  _loggedInUserId = null
}

function mapPackageToProduct(pkg: any): Product | null {
  try {
    const id = pkg?.product?.identifier || ''
    let plan: PlanId = 'free'
    let duration: 'monthly' | 'yearly' = 'monthly'

    if (id.includes('premium')) plan = 'premium'
    else if (id.includes('expert')) plan = 'expert'
    else return null

    if (id.includes('yearly')) duration = 'yearly'

    return {
      id,
      plan,
      duration,
      price: parseFloat(pkg?.product?.price || '0') || 0,
      priceString: pkg?.product?.priceString || '',
      currency: pkg?.product?.currencyCode || 'EUR',
    }
  } catch {
    return null
  }
}

function mapCustomerInfoToEntitlements(info: any): Entitlement[] {
  const entitlements: Entitlement[] = []
  const platform = getPlatform() as 'ios' | 'android'

  try {
    const all = info?.entitlements?.all || {}
    for (const [id, data] of Object.entries(all)) {
      if (id !== 'premium' && id !== 'expert') continue
      const d = data as any
      entitlements.push({
        id: id as 'premium' | 'expert',
        plan: id as PlanId,
        isActive: !!d?.isActive,
        willRenew: !!d?.willRenew,
        expiresAt: d?.expirationDate ? new Date(d.expirationDate) : undefined,
        purchasedAt: d?.latestPurchaseDate ? new Date(d.latestPurchaseDate) : undefined,
        store: platform,
        originalPurchaseDate: d?.originalPurchaseDate ? new Date(d.originalPurchaseDate) : undefined,
      })
    }
  } catch {}

  return entitlements
}

export const revenueCatClient: BillingClient = {
  async getProducts(): Promise<Product[]> {
    if (!isNative()) return []
    await ensureInitialized()
    try {
      const result = await Purchases.getOfferings()
      const products: Product[] = []
      const all = (result as any)?.all || {}
      for (const offering of Object.values(all)) {
        const packages = (offering as any)?.availablePackages || []
        for (const pkg of packages) {
          const product = mapPackageToProduct(pkg)
          if (product) products.push(product)
        }
      }
      return products
    } catch {
      return []
    }
  },

  async getEntitlements(): Promise<Entitlement[]> {
    if (!isNative()) return []
    await ensureInitialized()
    try {
      const info = await Purchases.getCustomerInfo()
      return mapCustomerInfoToEntitlements(info)
    } catch {
      return []
    }
  },

  async purchase(productId: string): Promise<PurchaseResult> {
    if (!isNative()) {
      return { success: false, error: 'Not on native' }
    }
    await ensureInitialized()
    try {
      const result = await Purchases.getOfferings()
      const all = (result as any)?.all || {}
      let targetPackage: any = null
      for (const offering of Object.values(all)) {
        const packages = (offering as any)?.availablePackages || []
        for (const pkg of packages) {
          if (pkg?.product?.identifier === productId) {
            targetPackage = pkg
            break
          }
        }
      }
      if (!targetPackage) {
        return { success: false, error: 'Product not found' }
      }
      const purchaseResult = await Purchases.purchasePackage({ aPackage: targetPackage })
      const entitlements = mapCustomerInfoToEntitlements(purchaseResult?.customerInfo)
      const active = entitlements.find((e) => e.isActive)
      return { success: !!active, entitlement: active }
    } catch (err: any) {
      if (err?.userCancelled) {
        return { success: false, userCancelled: true }
      }
      return { success: false, error: err?.message || 'Purchase failed' }
    }
  },

  async restorePurchases(): Promise<Entitlement[]> {
    if (!isNative()) return []
    await ensureInitialized()
    try {
      const info = await Purchases.restorePurchases()
      return mapCustomerInfoToEntitlements(info)
    } catch {
      return []
    }
  },

  async getActivePlan(): Promise<PlanId> {
    if (!isNative()) return 'free'
    const entitlements = await this.getEntitlements()
    const expert = entitlements.find((e) => e.plan === 'expert' && e.isActive)
    if (expert) return 'expert'
    const premium = entitlements.find((e) => e.plan === 'premium' && e.isActive)
    if (premium) return 'premium'
    return 'free'
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
