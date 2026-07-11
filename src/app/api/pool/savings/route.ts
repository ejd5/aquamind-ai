import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { pickLocale, translate } from '@/lib/i18n-api'
import { calculateSavings } from '@/lib/pool/savings-calculator'

export const runtime = 'nodejs'

/**
 * GET /api/pool/savings
 * GET /api/pool/savings?poolId=xxx   (multi-pool scoping — informational only,
 *                                     since WaterTest is still user-scoped in
 *                                     the Prisma schema today)
 *
 * Returns the AQWELIA savings report for the authenticated user. No DB write —
 * the calculation is fully derived from the user's water-test history.
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

  // Pull all water tests (createdAt only — the savings engine only needs dates)
  // plus reminders as a proxy for "interventions" (each reminder ≈ a visit avoided).
  const [waterTests, reminders] = await Promise.all([
    db.waterTest.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      take: 1000,
      select: { createdAt: true },
    }),
    db.reminder.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      take: 500,
      select: { createdAt: true, type: true },
    }),
  ])

  const report = calculateSavings(
    waterTests.map((t) => ({ createdAt: t.createdAt })),
    reminders.map((r) => ({ createdAt: r.createdAt, type: r.type })),
  )

  return NextResponse.json(report)
}
