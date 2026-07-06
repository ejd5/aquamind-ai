import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const webhookSecret = process.env.REVENUECAT_WEBHOOK_SECRET

  if (!webhookSecret) {
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
  }

  if (authHeader !== `Bearer ${webhookSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const event = await req.json()
    const userId = event?.app_user_id
    if (!userId) {
      return NextResponse.json({ received: true })
    }

    const productId = event?.product_id || ''
    let plan: 'free' | 'premium' | 'expert' = 'free'
    if (productId.includes('expert')) plan = 'expert'
    else if (productId.includes('premium')) plan = 'premium'

    const eventType = event?.event_type
    const isActive = !['CANCELLATION', 'EXPIRATION', 'BILLING_ISSUE'].includes(eventType)

    await db.subscription.updateMany({
      where: { userId, active: true },
      data: { active: false },
    })

    if (isActive && plan !== 'free') {
      const expiresAt = event?.expiration_at ? new Date(event.expiration_at * 1000) : null
      await db.subscription.create({
        data: {
          userId,
          plan,
          duration: productId.includes('yearly') ? 'halfyear' : 'month',
          startedAt: event?.purchased_at ? new Date(event.purchased_at * 1000) : new Date(),
          expiresAt,
          active: true,
        },
      })
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('RevenueCat webhook error:', err)
    return NextResponse.json({ error: 'Webhook failed' }, { status: 500 })
  }
}
