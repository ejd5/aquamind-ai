/**
 * AQWELIA Pro — Dashboard statistics.
 *
 * Every metric is scoped to the authenticated workspace. Technicians are
 * further restricted to the clients, pools and interventions assigned to
 * their own account.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { pickLocale, translate } from '@/lib/i18n-api'
import { getProAccess } from '@/lib/pro/access'
import {
  proClientAccessWhere,
  proInterventionAccessWhere,
  proPoolAccessWhere,
} from '@/lib/pro/intervention-scope'

export const runtime = 'nodejs'

function getWeekBounds(now: Date): { start: Date; end: Date } {
  const day = now.getDay()
  const diffToMonday = (day + 6) % 7
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

  const access = await getProAccess(session.user.id)
  const actorUserId = session.user.id
  const clientScope = proClientAccessWhere(access, actorUserId)
  const poolScope = proPoolAccessWhere(access, actorUserId)
  const interventionScope = proInterventionAccessWhere(access, actorUserId)

  const now = new Date()
  const { start: weekStart, end: weekEnd } = getWeekBounds(now)
  const fourteenDaysAgo = new Date(now)
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)

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
    db.proClient.count({ where: clientScope }),
    db.proPool.count({ where: poolScope }),
    db.proIntervention.count({ where: interventionScope }),
    db.proWaterTest.count({ where: { pool: poolScope } }),

    db.proIntervention.findMany({
      where: {
        ...interventionScope,
        scheduledAt: { gte: weekStart, lte: weekEnd },
      },
      select: { status: true, duration: true },
    }),

    db.proIntervention.findMany({
      where: {
        ...interventionScope,
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

    db.proIntervention.count({
      where: {
        ...interventionScope,
        status: 'scheduled',
        scheduledAt: { lt: now },
      },
    }),

    db.proIntervention.findMany({
      where: interventionScope,
      orderBy: { scheduledAt: 'desc' },
      take: 10,
      include: {
        client: {
          select: { id: true, firstName: true, lastName: true },
        },
        pool: { select: { id: true, name: true } },
      },
    }),

    db.proWaterTest.findMany({
      where: { pool: poolScope },
      orderBy: { testedAt: 'desc' },
      take: 10,
      include: {
        pool: {
          select: {
            id: true,
            name: true,
            client: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    }),

    (async () => {
      const allPools = await db.proPool.findMany({
        where: poolScope,
        select: { id: true, name: true },
      })
      if (allPools.length === 0) return []
      const poolsWithRecentTest = await db.proWaterTest.findMany({
        where: {
          testedAt: { gte: fourteenDaysAgo },
          pool: poolScope,
        },
        select: { proPoolId: true },
        distinct: ['proPoolId'],
      })
      const recentIds = new Set(poolsWithRecentTest.map((test) => test.proPoolId))
      return allPools.filter((pool) => !recentIds.has(pool.id))
    })(),
  ])

  const thisWeekCompleted = interventionsThisWeek.filter(
    (intervention) => intervention.status === 'completed',
  )
  const thisWeekTotalDuration = thisWeekCompleted.reduce(
    (sum, intervention) => sum + (intervention.duration || 0),
    0,
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
