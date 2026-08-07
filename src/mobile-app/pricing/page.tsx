'use client'

/**
 * AQWELIA Wave A3 — mobile B2C paywall (native).
 *
 * Renders the shared ModulePaywall which:
 *   - loads RevenueCat offerings and shows store prices (never fabricated from
 *     the web grid);
 *   - blocks purchase until the RevenueCat identity bridge is ready (SDK +
 *     server binding + server-provided environment);
 *   - differentiates user cancellation from errors;
 *   - shows a "validation en cours" state while the webhook has not converged;
 *   - reloads /api/subscription after convergence;
 *   - allows restore of purchases (server projection stays the only authority).
 */

import { ModulePaywall } from '@/components/aquamind/module-paywall'

export default function MobilePricingPage() {
  return (
    <main className="safe-area-top min-h-screen px-4 py-6 pb-12">
      <ModulePaywall />
    </main>
  )
}
