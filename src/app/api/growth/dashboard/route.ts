/**
 * AQWELIA Growth OS — Dashboard API.
 *
 * URL: /api/growth/dashboard
 *
 * GET — returns aggregated Growth OS stats for the authenticated pro's
 *       organization:
 *         - leadsCount, leadsByStatus, leadsBySource
 *         - conversionRate (NEW → WON)
 *         - appointmentsCount (upcoming + this week)
 *         - quotesCount (draft/sent/accepted)
 *         - revenue (sum of accepted quotes)
 *         - commissions (sum due/paid)
 *         - agentRuns (last 30 days, by type, success rate)
 *         - recentLeads (5 most recent)
 *
 * Auth: NextAuth session required.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { pickLocale, translate } from '@/lib/i18n-api'
import { getGrowthOrganization } from '@/lib/growth/access'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const locale = pickLocale(req)
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    const msg = await translate(locale, 'common.errors.unauthorized', 'Non autorisé')
    return NextResponse.json({ error: msg }, { status: 401 })
  }

  const org = await getGrowthOrganization(session.user.id, {
    id: true, name: true, plan: true, status: true, type: true,
  })
  if (!org) {
    // Empty dashboard — user has no organization yet.
    return NextResponse.json({
      organization: null,
      leadsCount: 0,
      leadsByStatus: {},
      leadsBySource: {},
      conversionRate: 0,
      appointmentsCount: 0,
      appointmentsUpcoming: 0,
      quotesCount: 0,
      quotesAccepted: 0,
      revenue: 0,
      commissionsDue: 0,
      commissionsPaid: 0,
      agentRunsCount: 0,
      agentRunsByType: {},
      agentRunsSuccessRate: 0,
      recentLeads: [],
      pipeline: [],
      generatedAt: new Date().toISOString(),
    })
  }

  const orgId = org.id
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const [
    leadsCount,
    leadsByStatusGroup,
    leadsBySourceGroup,
    wonCount,
    appointmentsCount,
    appointmentsUpcoming,
    quotesCount,
    quotesAccepted,
    revenueAgg,
    commissionsDueAgg,
    commissionsPaidAgg,
    agentRunsCount,
    agentRunsByTypeGroup,
    agentRunsCompleted,
    recentLeads,
    pipelineGroup,
  ] = await Promise.all([
    db.lead.count({ where: { organizationId: orgId } }),
    db.lead.groupBy({ by: ['status'], where: { organizationId: orgId }, _count: true }),
    db.lead.groupBy({ by: ['source'], where: { organizationId: orgId }, _count: true }),
    db.lead.count({ where: { organizationId: orgId, status: 'WON' } }),
    db.appointment.count({ where: { organizationId: orgId } }),
    db.appointment.count({
      where: {
        organizationId: orgId,
        startTime: { gte: now },
        status: { in: ['proposed', 'confirmed'] },
      },
    }),
    db.quote.count({ where: { organizationId: orgId } }),
    db.quote.count({ where: { organizationId: orgId, status: 'accepted' } }),
    db.quote.aggregate({
      where: { organizationId: orgId, status: 'accepted' },
      _sum: { total: true },
    }),
    db.commission.aggregate({
      where: { organizationId: orgId, status: 'due' },
      _sum: { amount: true },
    }),
    db.commission.aggregate({
      where: { organizationId: orgId, status: 'paid' },
      _sum: { amount: true },
    }),
    db.agentRun.count({
      where: { organizationId: orgId, startedAt: { gte: thirtyDaysAgo } },
    }),
    db.agentRun.groupBy({
      by: ['agentType'],
      where: { organizationId: orgId, startedAt: { gte: thirtyDaysAgo } },
      _count: true,
    }),
    db.agentRun.count({
      where: {
        organizationId: orgId,
        startedAt: { gte: thirtyDaysAgo },
        status: 'completed',
      },
    }),
    db.lead.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { _count: { select: { events: true, appointments: true, quotes: true } } },
    }),
    db.lead.groupBy({
      by: ['status'],
      where: { organizationId: orgId, updatedAt: { gte: sevenDaysAgo } },
      _count: true,
    }),
  ])

  const leadsByStatus: Record<string, number> = {}
  for (const row of leadsByStatusGroup) leadsByStatus[row.status] = row._count
  const leadsBySource: Record<string, number> = {}
  for (const row of leadsBySourceGroup) leadsBySource[row.source] = row._count
  const agentRunsByType: Record<string, number> = {}
  for (const row of agentRunsByTypeGroup) agentRunsByType[row.agentType] = row._count
  const pipeline: Record<string, number> = {}
  for (const row of pipelineGroup) pipeline[row.status] = row._count

  const conversionRate = leadsCount > 0 ? Math.round((wonCount / leadsCount) * 100) : 0
  const agentRunsSuccessRate =
    agentRunsCount > 0 ? Math.round((agentRunsCompleted / agentRunsCount) * 100) : 0

  return NextResponse.json({
    organization: {
      id: org.id,
      name: org.name,
      plan: org.plan,
      status: org.status,
      type: org.type,
    },
    leadsCount,
    leadsByStatus,
    leadsBySource,
    conversionRate,
    appointmentsCount,
    appointmentsUpcoming,
    quotesCount,
    quotesAccepted,
    revenue: revenueAgg._sum.total ?? 0,
    commissionsDue: commissionsDueAgg._sum.amount ?? 0,
    commissionsPaid: commissionsPaidAgg._sum.amount ?? 0,
    agentRunsCount,
    agentRunsByType,
    agentRunsSuccessRate,
    recentLeads,
    pipeline,
    generatedAt: new Date().toISOString(),
  })
}
