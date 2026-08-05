/**
 * AQWELIA Wave A2 (Round 1) — preflight classification of legacy subscriptions.
 *
 * Classifies every existing Subscription row into:
 *   - 'stripe'   : stripeSubscriptionId set AND providerSubscriptionId null or
 *                  equal to the Stripe id;
 *   - 'revenuecat': providerSubscriptionId set AND stripeSubscriptionId null;
 *   - 'ambiguous' : both set with different values, OR neither set.
 *
 * An ambiguous row BLOCKS the deploy (exit code 1) instead of being silently
 * reclassified as revenuecat by the migration backfill. Run this against the
 * source database BEFORE applying the wave_a2 migration.
 *
 * Usage:
 *   DATABASE_URL=... node scripts/preflight-subscription-provider.mjs
 */
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()
let exitCode = 0

try {
  const rows = await db.subscription.findMany({
    select: { id: true, stripeSubscriptionId: true, providerSubscriptionId: true },
  })

  const classified = { stripe: [], revenuecat: [], ambiguous: [] }
  for (const row of rows) {
    const stripe = row.stripeSubscriptionId
    const provider = row.providerSubscriptionId
    if (stripe && provider && stripe !== provider) {
      classified.ambiguous.push(row)
    } else if (!stripe && !provider) {
      classified.ambiguous.push(row)
    } else if (stripe) {
      classified.stripe.push(row)
    } else {
      classified.revenuecat.push(row)
    }
  }

  console.log(`Preflight: ${rows.length} subscription row(s)`)
  console.log(`  stripe      : ${classified.stripe.length}`)
  console.log(`  revenuecat  : ${classified.revenuecat.length}`)
  console.log(`  ambiguous   : ${classified.ambiguous.length}`)

  if (classified.ambiguous.length > 0) {
    console.error(
      'AMBIGUOUS subscriptions block the deploy (cannot safely classify provider):',
      classified.ambiguous.map((r) => r.id).join(', '),
    )
    exitCode = 1
  } else {
    console.log('Preflight OK — all subscriptions are unambiguously classified.')
  }
} finally {
  await db.$disconnect()
}

process.exit(exitCode)
