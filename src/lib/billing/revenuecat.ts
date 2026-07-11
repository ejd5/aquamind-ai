import { Purchases, LOG_LEVEL } from '@revenuecat/purchases-capacitor'
import { isNative, getPlatform } from '@/lib/platform'
import type { BillingClient, Product, Entitlement, PurchaseResult, PlanId } from './types'

const RC_API_KEYS = {
  ios: process.env.NEXT_PUBLIC_REVENUECAT_IOS_KEY || '',
  android: process.env.NEXT_PUBLIC_REVENUECAT_ANDROID_KEY || '',
}

let _initialized = false

async function ensureInitialized() {
  if (_initialized || !isNative()) return
  const platform = getPlatform()
  const apiKey = platform === 'ios' ? RC_API_KEYS.ios : RC_API_KEYS.android
  if (!apiKey) throw new Error('RevenueCat API key not configured')

  await Purchases.configure({ apiKey })
  await Purchases.setLogLevel({ level: LOG_LEVEL.INFO })
  _initialized = true
}

function mapPackageToProduct(pkg: any): Product | null {
  try {
    const id = pkg?.product?.identifier || ''
    let plan: PlanId = 'decouverte'
    let duration: 'weekly' | 'monthly' | 'seasonal' | 'yearly' = 'monthly'

    // RevenueCat product id convention: aqwelia_<plan>_<duration>
    //   plan: oasis | wellness
    //   duration: weekly | monthly | seasonal | yearly
    if (id.includes('wellness')) plan = 'wellness'
    else if (id.includes('oasis')) plan = 'oasis'
    else return null

    if (id.includes('yearly')) duration = 'yearly'
    else if (id.includes('seasonal')) duration = 'seasonal'
    else if (id.includes('weekly')) duration = 'weekly'

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
      if (id !== 'oasis' && id !== 'wellness') continue
      const d = data as any
      entitlements.push({
        id: id as 'oasis' | 'wellness',
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
    if (!isNative()) return 'decouverte'
    const entitlements = await this.getEntitlements()
    const wellness = entitlements.find((e) => e.plan === 'wellness' && e.isActive)
    if (wellness) return 'wellness'
    const oasis = entitlements.find((e) => e.plan === 'oasis' && e.isActive)
    if (oasis) return 'oasis'
    return 'decouverte'
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
