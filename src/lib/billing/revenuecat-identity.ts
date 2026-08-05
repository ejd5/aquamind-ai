/**
 * AQWELIA Wave A2 — RevenueCat canonical user identity bridge (native only).
 *
 * Guarantees that a purchase or restore on mobile can only ever be associated
 * with the AUTHENTICATED AQWELIA user:
 *   - observe the NextAuth session;
 *   - after authentication, initialize the SDK and call
 *     Purchases.logIn({ appUserID: session.user.id });
 *   - on sign-out, call Purchases.logOut() FIRST (before NextAuth signOut) and
 *     clear the expected identity;
 *   - serialize transitions so a fast A → logout → B never leaves a concurrent
 *     logIn/logOut race;
 *   - expose a testable state machine (idle | ready | transitioning | error);
 *   - NEVER run purchase / getCustomerInfo / restore until the expected
 *     identity is confirmed.
 *
 * The SDK is mocked in tests; on web this module is a no-op (native only).
 */

import { Purchases, LOG_LEVEL } from '@revenuecat/purchases-capacitor'
import { isNative, getPlatform } from '@/lib/platform'

export type RevenueCatBridgeState = 'idle' | 'ready' | 'transitioning' | 'error'

export interface RevenueCatBridgeSnapshot {
  state: RevenueCatBridgeState
  expectedUserId: string | null
  confirmedUserId: string | null
  error: string | null
}

const RC_API_KEYS = {
  ios: process.env.NEXT_PUBLIC_REVENUECAT_IOS_KEY || '',
  android: process.env.NEXT_PUBLIC_REVENUECAT_ANDROID_KEY || '',
}

/** Serializes bridge transitions: only one logIn/logOut runs at a time. */
class IdentityBridge {
  private state: RevenueCatBridgeState = 'idle'
  private expectedUserId: string | null = null
  private confirmedUserId: string | null = null
  private error: string | null = null
  private initialized = false
  private queue: Promise<void> = Promise.resolve()

  snapshot(): RevenueCatBridgeSnapshot {
    return {
      state: this.state,
      expectedUserId: this.expectedUserId,
      confirmedUserId: this.confirmedUserId,
      error: this.error,
    }
  }

  /** Enqueues an operation, guaranteeing no two transitions overlap. */
  private enqueue<T>(op: () => Promise<T>): Promise<T> {
    const run = this.queue.then(op)
    // Keep the queue alive regardless of failures so a later op always runs.
    this.queue = run.then(
      () => undefined,
      () => undefined,
    )
    return run
  }

  async ensureInitialized(): Promise<void> {
    if (!isNative()) return
    if (this.initialized) return
    const platform = getPlatform()
    const apiKey = platform === 'ios' ? RC_API_KEYS.ios : RC_API_KEYS.android
    if (!apiKey) throw new Error('RevenueCat API key not configured')
    await Purchases.configure({ apiKey })
    await Purchases.setLogLevel({ level: LOG_LEVEL.INFO })
    this.initialized = true
  }

  /**
   * Establishes the expected identity after authentication.
   * Idempotent when already confirmed for the same user.
   */
  async setIdentity(userId: string): Promise<RevenueCatBridgeSnapshot> {
    if (!isNative() || !userId) {
      this.expectedUserId = userId || null
      return this.snapshot()
    }
    return this.enqueue(async () => {
      if (this.expectedUserId === userId && this.confirmedUserId === userId && this.state !== 'error') {
        return this.snapshot()
      }
      this.state = 'transitioning'
      this.error = null
      this.expectedUserId = userId
      try {
        await this.ensureInitialized()
        await Purchases.logIn({ appUserID: userId })
        this.confirmedUserId = userId
        this.state = 'ready'
      } catch (err) {
        this.error = err instanceof Error ? err.message : String(err)
        this.state = 'error'
        // Fail-closed: the confirmed identity stays as-is, never the previous one.
        if (this.confirmedUserId !== userId) this.confirmedUserId = null
      }
      return this.snapshot()
    })
  }

  /**
   * Clears the identity on sign-out. Always runs BEFORE the NextAuth signOut.
   * Fail-closed: on error the expected identity is still cleared so a previous
   * user's identity can never be reused.
   */
  async clearIdentity(): Promise<RevenueCatBridgeSnapshot> {
    if (!isNative()) {
      this.expectedUserId = null
      this.confirmedUserId = null
      this.state = 'idle'
      return this.snapshot()
    }
    return this.enqueue(async () => {
      this.state = 'transitioning'
      this.expectedUserId = null
      try {
        if (this.initialized) {
          await Purchases.logOut()
        }
        this.confirmedUserId = null
        this.state = 'idle'
      } catch (err) {
        this.error = err instanceof Error ? err.message : String(err)
        this.state = 'error'
        this.confirmedUserId = null
        this.expectedUserId = null
      }
      return this.snapshot()
    })
  }

  /**
   * True only when the SDK is ready and the confirmed identity matches the
   * current authenticated user.
   */
  isIdentityConfirmed(userId: string): boolean {
    return this.state === 'ready' && this.confirmedUserId === userId && this.expectedUserId === userId
  }

  /** True when no identity is confirmed (nothing may run). */
  isIdentityClear(): boolean {
    return this.confirmedUserId === null && this.expectedUserId === null
  }
}

/** Shared singleton used by the app. */
export const revenueCatIdentityBridge = new IdentityBridge()

/**
 * Blocks until the identity transition queue is drained. Used by purchase /
 * restore so they never run concurrently with a logIn/logOut.
 */
export async function identityQueueDrained(): Promise<void> {
  await revenueCatIdentityBridge['queue']
}

/**
 * Convenience: establishes the identity for the current session user.
 */
export async function syncRevenueCatIdentity(userId: string | null | undefined): Promise<RevenueCatBridgeSnapshot> {
  if (!userId) return revenueCatIdentityBridge.clearIdentity()
  return revenueCatIdentityBridge.setIdentity(userId)
}

/** Unit-test seam: fresh bridge instances for deterministic tests. */
export function createIdentityBridge(): IdentityBridge {
  return new IdentityBridge()
}
