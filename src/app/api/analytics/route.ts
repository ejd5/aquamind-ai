import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { pickLocale, translate } from '@/lib/i18n-api'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const locale = pickLocale(req)
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    const msg = await translate(locale, 'common.errors.unauthorized', 'Non autorisé')
    return NextResponse.json({ error: msg }, { status: 401 })
  }
  const userId = session.user.id

  const events = await db.analyticsEvent.findMany({ where: { userId }, take: 200, orderBy: { createdAt: 'desc' } })
  // KPIs simples
  const firstScan = await db.analyticsEvent.findFirst({ where: { userId, event: 'first_scan' }, orderBy: { createdAt: 'asc' } })
  const firstTest = await db.analyticsEvent.findFirst({ where: { userId, event: 'first_test' }, orderBy: { createdAt: 'asc' } })
  const firstPlan = await db.analyticsEvent.findFirst({ where: { userId, event: 'first_plan' }, orderBy: { createdAt: 'asc' } })
  const paywallViews = await db.analyticsEvent.count({ where: { userId, event: 'paywall_viewed' } })
  const conversions = await db.analyticsEvent.count({ where: { userId, event: 'subscription_activated' } })
  const guideOpens = await db.guideView.count({ where: { userId } })

  return NextResponse.json({
    kpis: {
      firstScanAt: firstScan?.createdAt || null,
      firstTestAt: firstTest?.createdAt || null,
      firstPlanAt: firstPlan?.createdAt || null,
      paywallViews,
      conversions,
      conversionRate: paywallViews > 0 ? (conversions / paywallViews * 100).toFixed(1) + '%' : '—',
      guideOpens,
    },
    events,
  })
}

export async function POST(req: NextRequest) {
  const locale = pickLocale(req)
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    const msg = await translate(locale, 'common.errors.unauthorized', 'Non autorisé')
    return NextResponse.json({ error: msg }, { status: 401 })
  }
  const userId = session.user.id

  try {
    const { event, props } = await req.json()
    if (!event) {
      const msg = await translate(locale, 'common.errors.eventRequired', 'event requis')
      return NextResponse.json({ error: msg }, { status: 400 })
    }
    const e = await db.analyticsEvent.create({ data: { userId, event, props: props ? JSON.stringify(props) : null } })
    return NextResponse.json({ event: e })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur' }, { status: 500 })
  }
}
