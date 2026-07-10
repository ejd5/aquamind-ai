import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { pickLocale, translate } from '@/lib/i18n-api'
import { generateAnnualReview } from '@/lib/pool/annual-review'

export const runtime = 'nodejs'

/**
 * GET /api/pool/annual-review
 * GET /api/pool/annual-review?poolId=xxx   (multi-pool scoping)
 * GET /api/pool/annual-review?year=2024    (filter by calendar year)
 *
 * Returns the annual review for the authenticated user's pool.
 * No DB write — fully derived from water tests, action plans, diagnostics,
 * products inventory, reminders, and pool profile.
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
  const poolId = url.searchParams.get('poolId')
  const yearParam = url.searchParams.get('year')
  const profileWhere = poolId ? { id: poolId, userId } : { userId }

  // Determine season window
  const now = new Date()
  const year = yearParam ? parseInt(yearParam, 10) : now.getFullYear()
  const seasonStart = new Date(year, 0, 1) // Jan 1
  const seasonEnd = yearParam
    ? new Date(year, 11, 31, 23, 59, 59) // Dec 31 if explicit year
    : now // current year → up to now

  const [profile, waterTests, actionPlans, diagnostics, products, reminders] = await Promise.all([
    db.poolProfile.findFirst({ where: profileWhere }),
    db.waterTest.findMany({
      where: { userId, createdAt: { gte: seasonStart, lte: seasonEnd } },
      orderBy: { createdAt: 'asc' },
      take: 1000,
      select: {
        createdAt: true,
        status: true,
        clearWaterIndex: true,
        ph: true,
        freeChlorine: true,
        bromine: true,
        combinedChlorine: true,
      },
    }),
    db.actionPlan.findMany({
      where: { waterTest: { userId }, createdAt: { gte: seasonStart, lte: seasonEnd } },
      orderBy: { createdAt: 'asc' },
      take: 500,
      select: { createdAt: true, severity: true },
    }),
    db.photoDiagnostic.findMany({
      where: { userId, createdAt: { gte: seasonStart, lte: seasonEnd } },
      orderBy: { createdAt: 'asc' },
      take: 200,
      select: { createdAt: true, confidence: true },
    }),
    db.productInventory.findMany({
      where: { userId },
      select: {
        productName: true,
        category: true,
        quantity: true,
        unit: true,
        price: true,
      },
    }),
    db.reminder.findMany({
      where: { userId, createdAt: { gte: seasonStart, lte: seasonEnd } },
      orderBy: { createdAt: 'asc' },
      take: 500,
      select: { createdAt: true, type: true },
    }),
  ])

  const profileLite = profile
    ? {
        volume: profile.volume,
        treatmentType: profile.treatmentType,
        waterBodyType: profile.waterBodyType,
      }
    : null

  const review = generateAnnualReview(
    waterTests,
    actionPlans,
    diagnostics,
    profileLite,
    products.map((p) => ({
      productName: p.productName,
      category: p.category,
      quantity: p.quantity,
      unit: p.unit,
      price: p.price,
    })),
    reminders.map((r) => ({ createdAt: r.createdAt, type: r.type })),
    now,
  )

  return NextResponse.json({
    ...review,
    profileName: profile?.name || null,
  })
}
