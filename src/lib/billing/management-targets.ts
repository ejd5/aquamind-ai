/**
 * AQWELIA Wave A2 (Round 6) — pure subscription management target resolution.
 *
 * Decides which provider management surface(s) to offer from the SERVER
 * projection's sources (GET /api/subscription.sources). It never selects a
 * manager based on the current platform, and it never treats a sandbox source
 * as a Production-manageable source.
 *
 * Contract:
 *   - no valid source            → [] (message « aucun abonnement actif »);
 *   - only Stripe/web            → [stripe];
 *   - only RevenueCat iOS        → [apple];
 *   - only RevenueCat Android    → [google];
 *   - several administrable sources → returns ALL targets (the caller presents
 *     a clear choice — never an arbitrary single provider);
 *   - a sandbox source is never returned as an administrable target unless the
 *     caller explicitly passes allowSandbox (staging/dev test environments).
 */

export type SubscriptionManagementProvider = 'stripe' | 'apple' | 'google'

export interface SubscriptionSourceLike {
  provider?: string | null
  store?: string | null
  environment?: string | null
}

const STORE_TO_PROVIDER: Record<string, 'apple' | 'google'> = {
  ios: 'apple',
  android: 'google',
}

/**
 * Resolves the administrable management targets from server sources.
 * Deterministic order: stripe, then apple, then google.
 */
export function resolveSubscriptionManagementTargets(
  sources: SubscriptionSourceLike[],
  opts?: { allowSandbox?: boolean },
): SubscriptionManagementProvider[] {
  const targets = new Set<SubscriptionManagementProvider>()
  for (const source of sources) {
    const provider = source.provider
    if (!provider) continue
    // A sandbox source is never administrable as Production.
    if (source.environment === 'sandbox' && !opts?.allowSandbox) continue

    if (provider === 'stripe') {
      targets.add('stripe')
      continue
    }
    if (provider === 'revenuecat') {
      const mapped = STORE_TO_PROVIDER[source.store ?? ''] 
      if (mapped) targets.add(mapped)
      continue
    }
  }
  // Deterministic: stripe, apple, google.
  return (['stripe', 'apple', 'google'] as const).filter((t) => targets.has(t))
}
