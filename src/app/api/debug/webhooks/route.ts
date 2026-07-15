import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// TEMP DEBUG endpoint — shows recent BillingEvents and user's Subscription.
// Remove before merging to main.
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const userId = session.user.id

  const [billingEvents, subscription] = await Promise.all([
    db.billingEvent.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        eventId: true,
        source: true,
        eventType: true,
        result: true,
        ignoredReason: true,
        attemptCount: true,
        createdAt: true,
        processedAt: true,
        userId: true,
      },
    }),
    db.subscription.findFirst({
      where: { userId },
      orderBy: { startedAt: 'desc' },
    }),
  ])

  return NextResponse.json({
    user: {
      id: userId,
      email: session.user.email,
    },
    subscription: subscription
      ? {
          id: subscription.id,
          plan: subscription.plan,
          status: subscription.status,
          active: subscription.active,
          stripeSubscriptionId: subscription.stripeSubscriptionId,
          stripeCustomerId: subscription.stripeCustomerId,
          providerSubscriptionId: subscription.providerSubscriptionId,
          startedAt: subscription.startedAt,
          expiresAt: subscription.expiresAt,
          lastProviderEventId: subscription.lastProviderEventId,
          lastProviderEventAt: subscription.lastProviderEventAt,
        }
      : null,
    billingEvents: billingEvents.map((e) => ({
      eventId: e.eventId,
      source: e.source,
      eventType: e.eventType,
      result: e.result,
      ignoredReason: e.ignoredReason,
      attemptCount: e.attemptCount,
      createdAt: e.createdAt,
      processedAt: e.processedAt,
      userId: e.userId,
    })),
    debugNote: 'This endpoint shows recent webhook events and subscription state from the DB. Remove before merge.',
  })
}
