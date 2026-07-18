/**
 * AQWELIA Pro — Dashboard statistics (MVP).
 *
 * URL: /api/pro/dashboard
 *
 * GET — aggregated stats for the authenticated pro's homepage / dashboard:
 *   - clientsCount       total ProClient owned
 *   - poolsCount         total ProPool across all clients
 *   - interventionsCount total ProIntervention (all statuses, all time)
 *   - waterTestsCount    total ProWaterTest (all time)
 *   - interventionsThisWeek  count + sum of completed durations this week
 *   - interventionsUpcoming  next 5 scheduled (status=scheduled,
 *                            scheduledAt >= now, ordered asc)
 *   - interventionsOverdue   count of scheduled with scheduledAt < now
 *   - recentInterventions    last 10 (any status, newest first)
 *   - recentWaterTests       last 10 across all pools (newest first)
 *   - poolsWithoutRecentTest pools with no water test in the last 14 days
 *
 * "This week" is the ISO week (Monday → Sunday) containing `now`, in the
 * server's local timezone. Good enough for a pro MVP.
 *
 * Auth: NextAuth session required.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { pickLocale, translate } from '@/lib/i18n-api'
import { getProAccess } from '@/lib/pro/access'

export const runtime = 'nodejs'

/** Returns the start (Mon 00:00) and end (Sun 23:59:59.999) of the current ISO week. */
function getWeekBounds(now: Date): { start: Date; end: Date } {
  const day = now.getDay() // 0 = Sunday, 1 = Monday, …
  const diffToMonday = (day + 6) % 7 // Mon=0, Tue=1, …, Sun=6
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - diffToMonday)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

export async function GET(req: NextRequest) {
  const locale = pickLocale(req)
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    const msg = await translate(locale, 'common.errors.unauthorized', 'Non autorisé')
    return NextResponse.json({ error: msg }, { status: 401 })
  }
  const userId = (await getProAccess(session.user.id)).ownerUserId

  const now = new Date()
  const { start: weekStart, end: weekEnd } = getWeekBounds(now)
  const fourteenDaysAgo = new Date(now)
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)

  // The "pro scope" predicate: any ProClient whose proUserId = userId.
  // We reuse it across queries via the relation path `client.proUserId`.
  const clientScope = { proUserId: userId }

  const [
    clientsCount,
    poolsCount,
    interventionsCount,
    waterTestsCount,
    interventionsThisWeek,
    interventionsUpcoming,
    interventionsOverdue,
    recentInterventions,
    recentWaterTests,
    poolsWithoutRecentTest,
  ] = await Promise.all([
    db.proClient.count({ where: { proUserId: userId } }),
    db.proPool.count({ where: { client: clientScope } }),
    db.proIntervention.count({ where: { client: clientScope } }),
    db.proWaterTest.count({ where: { pool: { client: clientScope } } }),

    // This week's interventions (any status) + their completed durations.
    db.proIntervention.findMany({
      where: {
        client: clientScope,
        scheduledAt: { gte: weekStart, lte: weekEnd },
      },
      select: { status: true, duration: true },
    }),

    // Upcoming: scheduled in the future, status=scheduled, ordered asc.
    db.proIntervention.findMany({
      where: {
        client: clientScope,
        status: 'scheduled',
        scheduledAt: { gte: now },
      },
      orderBy: { scheduledAt: 'asc' },
      take: 5,
      include: {
        client: {
          select: { id: true, firstName: true, lastName: true, city: true },
        },
        pool: { select: { id: true, name: true, type: true } },
      },
    }),

    // Overdue: scheduled in the past, still status=scheduled.
    db.proIntervention.count({
      where: {
        client: clientScope,
        status: 'scheduled',
        scheduledAt: { lt: now },
      },
    }),

    // Recent interventions (last 10, any status).
    db.proIntervention.findMany({
      where: { client: clientScope },
      orderBy: { scheduledAt: 'desc' },
      take: 10,
      include: {
        client: {
          select: { id: true, firstName: true, lastName: true },
        },
        pool: { select: { id: true, name: true } },
      },
    }),

    // Recent water tests across all the pro's pools (last 10).
    db.proWaterTest.findMany({
      where: { pool: { client: clientScope } },
      orderBy: { testedAt: 'desc' },
      take: 10,
      include: {
        pool: {
          select: { id: true, name: true, client: { select: { id: true, firstName: true, lastName: true } } },
        },
      },
    }),

    // Pools with NO water test in the last 14 days.
    // Strategy: list all pool ids, then count pools that DO have a recent
    // test, and subtract. (Prisma doesn't have a "not exists" operator on
    // a relation filtered by date out of the box; this two-step is simple
    // and fast for the expected MVP scale of hundreds of pools.)
    (async () => {
      const allPools = await db.proPool.findMany({
        where: { client: clientScope },
        select: { id: true, name: true },
      })
      if (allPools.length === 0) return []
      const poolsWithRecentTest = await db.proWaterTest.findMany({
        where: {
          testedAt: { gte: fourteenDaysAgo },
          pool: { client: clientScope },
        },
        select: { proPoolId: true },
        distinct: ['proPoolId'],
      })
      const recentIds = new Set(poolsWithRecentTest.map((t) => t.proPoolId))
      return allPools.filter((p) => !recentIds.has(p.id))
    })(),
  ])

  // Aggregate the week's stats from the raw rows.
  const thisWeekCompleted = interventionsThisWeek.filter(
    (i) => i.status === 'completed'
  )
  const thisWeekTotalDuration = thisWeekCompleted.reduce(
    (sum, i) => sum + (i.duration || 0),
    0
  )

  return NextResponse.json({
    clientsCount,
    poolsCount,
    interventionsCount,
    waterTestsCount,
    interventionsThisWeek: {
      count: interventionsThisWeek.length,
      completedCount: thisWeekCompleted.length,
      totalDurationMinutes: thisWeekTotalDuration,
    },
    interventionsUpcoming,
    interventionsOverdueCount: interventionsOverdue,
    recentInterventions,
    recentWaterTests,
    poolsWithoutRecentTest,
    weekStart: weekStart.toISOString(),
    weekEnd: weekEnd.toISOString(),
    generatedAt: now.toISOString(),
  })
}
