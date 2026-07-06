import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

export async function GET() {
  const events = await db.analyticsEvent.findMany({ take: 200, orderBy: { createdAt: 'desc' } })
  // KPIs simples
  const firstScan = await db.analyticsEvent.findFirst({ where: { event: 'first_scan' }, orderBy: { createdAt: 'asc' } })
  const firstTest = await db.analyticsEvent.findFirst({ where: { event: 'first_test' }, orderBy: { createdAt: 'asc' } })
  const firstPlan = await db.analyticsEvent.findFirst({ where: { event: 'first_plan' }, orderBy: { createdAt: 'asc' } })
  const paywallViews = await db.analyticsEvent.count({ where: { event: 'paywall_viewed' } })
  const conversions = await db.analyticsEvent.count({ where: { event: 'subscription_activated' } })
  const guideOpens = await db.guideView.count()

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
  try {
    const { event, props } = await req.json()
    if (!event) return NextResponse.json({ error: 'event requis' }, { status: 400 })
    const e = await db.analyticsEvent.create({ data: { event, props: props ? JSON.stringify(props) : null } })
    return NextResponse.json({ event: e })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur' }, { status: 500 })
  }
}
