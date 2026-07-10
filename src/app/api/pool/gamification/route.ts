import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { pickLocale, translate } from '@/lib/i18n-api'
import { buildGamificationReport } from '@/lib/pool/gamification'
import { calculateSavings } from '@/lib/pool/savings-calculator'

export const runtime = 'nodejs'

/**
 * GET /api/pool/gamification
 * GET /api/pool/gamification?poolId=xxx   (multi-pool scoping — informational)
 *
 * Returns the user's gamification state: badges, streak, rank. The composite
 * rank score factors in savings (€), streak (days) and unlocked badges.
 */
export async function GET(req: Request) {
  const locale = pickLocale(req)
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    const msg = await translate(locale, 'common.errors.unauthorized', 'Non autorisé')
    return NextResponse.json({ error: msg }, { status: 401 })
  }
  const userId = session.user.id

  const url = new URL(req.url)
  const _poolId = url.searchParams.get('poolId')

  const [waterTests, actionPlans, profile] = await Promise.all([
    db.waterTest.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      take: 1000,
      select: {
        createdAt: true,
        ph: true,
        freeChlorine: true,
        combinedChlorine: true,
        clearWaterIndex: true,
        status: true,
      },
    }),
    db.actionPlan.findMany({
      where: { waterTest: { userId } },
      orderBy: { createdAt: 'asc' },
      take: 1000,
      select: { createdAt: true, severity: true },
    }),
    db.poolProfile.findFirst({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true },
    }),
  ])

  // Savings total feeds the rank composite score.
  const savingsReport = calculateSavings(
    waterTests.map((t) => ({ createdAt: t.createdAt })),
    actionPlans.map((a) => ({ createdAt: a.createdAt })),
  )

  const report = buildGamificationReport(
    waterTests.map((t) => ({
      createdAt: t.createdAt,
      ph: t.ph,
      freeChlorine: t.freeChlorine,
      combinedChlorine: t.combinedChlorine,
      clearWaterIndex: t.clearWaterIndex,
      status: t.status,
    })),
    actionPlans.map((a) => ({ createdAt: a.createdAt, severity: a.severity })),
    { createdAt: profile?.createdAt },
    savingsReport.totalSaved,
  )

  return NextResponse.json(report)
}
