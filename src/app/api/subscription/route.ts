import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { PLANS, DEFAULT_PLAN, type PlanId } from '@/lib/pool/freemium'

// Subscription.plan values: 'free' | 'premium' | 'expert'
// (formerly 'surface' | 'limpide' | 'cristal' | 'gardien' — see worklog L1-C)
// userId wiring is enforced via getServerSession + 401 (Task L1-E).

export const runtime = 'nodejs'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }
  const userId = session.user.id

  const sub = await db.subscription.findFirst({ where: { userId, active: true }, orderBy: { startedAt: 'desc' } })
  const planId: PlanId = (sub?.plan as PlanId) || DEFAULT_PLAN
  const plan = PLANS.find((p) => p.id === planId) || PLANS[0]
  return NextResponse.json({ plan, subscription: sub, allPlans: PLANS })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }
  const userId = session.user.id

  try {
    const { plan, duration } = await req.json()
    const validPlan = PLANS.find((p) => p.id === plan)
    if (!validPlan) return NextResponse.json({ error: 'Plan invalide' }, { status: 400 })

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
      default: expires.setMonth(now.getMonth() + 1)
    }

    const sub = await db.subscription.create({
      data: { userId, plan, duration, startedAt: now, expiresAt: expires, active: true },
    })

    // Analytics event
    await db.analyticsEvent.create({ data: { userId, event: 'subscription_activated', props: JSON.stringify({ plan, duration }) } })

    return NextResponse.json({ subscription: sub, plan: validPlan })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur' }, { status: 500 })
  }
}
