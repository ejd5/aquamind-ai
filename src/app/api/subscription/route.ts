import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { PLANS, DEFAULT_PLAN, type PlanId } from '@/lib/pool/freemium'
import { pickLocale, translate } from '@/lib/i18n-api'
import { trackEventServer } from '@/lib/analytics-server'

// Subscription.plan values: 'decouverte' | 'oasis' | 'wellness'
// (formerly 'free' | 'premium' | 'expert' — see worklog P1-TARIFS)
// userId wiring is enforced via getServerSession + 401 (Task L1-E).

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const locale = pickLocale(req)
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: await translate(locale, 'common.errors.unauthorized', 'Non autorisé') }, { status: 401 })
  }
  const userId = session.user.id

  const sub = await db.subscription.findFirst({ where: { userId, active: true }, orderBy: { startedAt: 'desc' } })
  const planId: PlanId = (sub?.plan as PlanId) || DEFAULT_PLAN
  const plan = PLANS.find((p) => p.id === planId) || PLANS[0]
  return NextResponse.json({ plan, subscription: sub, allPlans: PLANS })
}

export async function POST(req: NextRequest) {
  const locale = pickLocale(req)
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: await translate(locale, 'common.errors.unauthorized', 'Non autorisé') }, { status: 401 })
  }
  const userId = session.user.id

  try {
    const { plan, duration } = await req.json()
    const validPlan = PLANS.find((p) => p.id === plan)
    if (!validPlan) {
      const msg = await translate(locale, 'common.errors.invalidPlan', 'Plan invalide')
      return NextResponse.json({ error: msg }, { status: 400 })
    }

    // Désactiver ancien abonnement (uniquement pour cet utilisateur)
    await db.subscription.updateMany({ where: { userId, active: true }, data: { active: false } })

    // Calcul expiration
    const now = new Date()
    const expires = new Date(now)
    switch (duration) {
      case 'week': expires.setDate(now.getDate() + 7); break
      case 'month': expires.setMonth(now.getMonth() + 1); break
      case 'quarter': expires.setMonth(now.getMonth() + 3); break
      case 'halfyear': expires.setMonth(now.getMonth() + 6); break
      case 'year': expires.setFullYear(now.getFullYear() + 1); break
      default: expires.setMonth(now.getMonth() + 1)
    }

    const sub = await db.subscription.create({
      data: { userId, plan, duration, startedAt: now, expiresAt: expires, active: true },
    })

    // Analytics event
    await db.analyticsEvent.create({ data: { userId, event: 'subscription_activated', props: JSON.stringify({ plan, duration }) } })

    // PostHog analytics — distinguish paid start vs downgrade to free.
    if (plan === 'decouverte') {
      void trackEventServer(
        'subscription_cancelled',
        { plan, duration, previousPlan: 'paid' },
        userId
      )
    } else {
      void trackEventServer(
        'subscription_started',
        { plan, duration, expiresAt: expires.toISOString() },
        userId
      )
    }

    return NextResponse.json({ subscription: sub, plan: validPlan })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur' }, { status: 500 })
  }
}
