/**
 * AQWELIA — Admin Business Cockpit (PR113) · ANALYTICS — données réelles.
 *
 * Agrégats COUNT/groupBy uniquement (bornés, pas de scan non borné).
 * Les métriques sans donnée fiable (funnel/conversion, télémetrie
 * marketing) sont renvoyées `unavailable: true` — jamais inventées, jamais
 * affichées à zéro.
 */
import { NextResponse } from 'next/server'
import { requireAdminFromDb } from '@/lib/admin-auth'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const THIRTY_DAYS_MS = 30 * 24 * 3600 * 1000

export async function GET() {
  const auth = await requireAdminFromDb()
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.reason === 'no-session' ? 'Unauthorized' : 'Forbidden' }, { status: auth.reason === 'no-session' ? 401 : 403 })
  }

  const since = new Date(Date.now() - THIRTY_DAYS_MS)

  const [
    totalUsers,
    newUsers30d,
    pools,
    waterTests,
    diagnostics,
    executions,
    outcomes,
    subscriptionsByStatus,
    bannersByStatus,
    popupsByStatus,
    announcementsByStatus,
  ] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { createdAt: { gte: since } } }),
    db.poolProfile.count(),
    db.waterTest.count(),
    db.photoDiagnostic.count(),
    db.recommendationExecution.count(),
    db.recommendationOutcome.count(),
    db.subscription.groupBy({ by: ['status'], _count: { _all: true } }),
    db.adminContentBanner.groupBy({ by: ['status'], _count: { _all: true } }),
    db.adminContentPopup.groupBy({ by: ['status'], _count: { _all: true } }),
    db.adminContentAnnouncement.groupBy({ by: ['status'], _count: { _all: true } }),
  ])

  const countMap = <T extends { status: string; _count: { _all: number } }>(rows: T[]) =>
    Object.fromEntries(rows.map((r) => [r.status, r._count._all]))

  return NextResponse.json(
    {
      generatedAt: new Date().toISOString(),
      users: { total: totalUsers, newLast30d: newUsers30d },
      activity: {
        poolProfiles: pools,
        waterTests,
        photoDiagnostics: diagnostics,
        recommendationExecutions: executions,
        recommendationOutcomes: outcomes,
      },
      subscriptionsByStatus: countMap(subscriptionsByStatus),
      marketingContent: {
        bannersByStatus: countMap(bannersByStatus),
        popupsByStatus: countMap(popupsByStatus),
        announcementsByStatus: countMap(announcementsByStatus),
      },
      // Aucune télémetrie d'impressions/clics fiable → explicitement indisponible.
      conversions: { unavailable: true, reason: 'no_reliable_telemetry' },
      campaignPerformance: { unavailable: true, reason: 'no_reliable_telemetry' },
    },
    { status: 200, headers: { 'Cache-Control': 'private, no-store, max-age=0' } }
  )
}
