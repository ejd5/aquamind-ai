/**
 * AQWELIA Wave A2 (Round 1) — RevenueCat identity facade.
 *
 * Thin compatibility layer over the single lifecycle manager
 * (revenuecat-manager.ts). This module deliberately does NOT import the
 * RevenueCat SDK and never calls Purchases.configure — there is exactly one
 * initializer in the codebase.
 */

export {
  revenueCatManager as revenueCatIdentityBridge,
  createRevenueCatManager as createIdentityBridge,
  syncRevenueCatIdentity,
  identityQueueDrained,
  RevenueCatIdentityNotReadyError,
} from './revenuecat-manager'

export type {
  RevenueCatManager as IdentityBridge,
  RevenueCatManagerState as RevenueCatBridgeState,
  RevenueCatManagerSnapshot as RevenueCatBridgeSnapshot,
} from './revenuecat-manager'
