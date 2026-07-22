import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { findOwnedPool, parseJsonArray } from '@/lib/brain/access'
export const runtime = 'nodejs'
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions); if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const pool = await findOwnedPool(session.user.id, req.nextUrl.searchParams.get('poolId')); if (!pool) return NextResponse.json({ error: 'Pool not found' }, { status: 404 })
  const [tests, diagnostics, feedback] = await Promise.all([
    db.waterTest.findMany({ where: { userId: session.user.id, OR: [{ poolId: pool.id }, { poolId: null }] }, take: 100, orderBy: { createdAt: 'desc' }, include: { actionPlans: { include: { executions: { orderBy: { actionIndex: 'asc' } }, outcome: true } } } }),
    db.photoDiagnostic.findMany({ where: { userId: session.user.id, OR: [{ poolId: pool.id }, { poolId: null }] }, take: 40, orderBy: { createdAt: 'desc' } }),
    db.brainFeedback.findMany({ where: { userId: session.user.id, poolId: pool.id }, take: 30, orderBy: { createdAt: 'desc' } }),
  ])
  const timeline = [...tests.map(test => ({ id: test.id, type: 'water_test', occurredAt: test.createdAt, status: test.status, clearWaterIndex: test.clearWaterIndex, data: { ph: test.ph, freeChlorine: test.freeChlorine }, actionPlans: test.actionPlans.map(plan => ({ id: plan.id, actions: parseJsonArray(plan.immediateActions), outcome: plan.outcome })) })), ...diagnostics.map(item => ({ id: item.id, type: 'photo_diagnostic', occurredAt: item.createdAt, status: item.confidence >= .7 ? 'high_confidence' : 'review', data: { summary: item.aiSummary } })), ...feedback.map(item => ({ id: item.id, type: 'feedback', occurredAt: item.createdAt, status: item.helpful === false ? 'needs_review' : 'recorded', data: { rating: item.rating } }))].sort((a,b) => +new Date(b.occurredAt) - +new Date(a.occurredAt))
  const outcomes = tests.flatMap(test => test.actionPlans.map(plan => plan.outcome).filter(Boolean))
  return NextResponse.json({ pool, timeline, intelligence: { testsObserved: tests.length, diagnosticsObserved: diagnostics.length, outcomesObserved: outcomes.length, improvedOutcomes: outcomes.filter(o => o?.status === 'improved').length, awaitingRetest: outcomes.filter(o => o?.status === 'awaiting_retest').length } })
}
