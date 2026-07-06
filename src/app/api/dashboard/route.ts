import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { clarityLabel, calculateClearWaterIndex } from '@/lib/pool/water-balance'
import { assessSwimSafety } from '@/lib/pool/safety-rules'

export const runtime = 'nodejs'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }
  const userId = session.user.id

  const [profile, latestTest, latestPlan, tests, diagnostics, equipment, products, chatCount] = await Promise.all([
    db.poolProfile.findFirst({ where: { userId } }),
    db.waterTest.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' }, include: { actionPlans: true } }),
    db.actionPlan.findFirst({
      where: { waterTest: { userId } },
      orderBy: { createdAt: 'desc' },
    }),
    db.waterTest.findMany({ where: { userId }, take: 30, orderBy: { createdAt: 'desc' } }),
    db.photoDiagnostic.findMany({ where: { userId }, take: 5, orderBy: { createdAt: 'desc' } }),
    db.equipment.count({ where: { userId } }),
    db.productInventory.count({ where: { userId } }),
    db.chatMessage.count({ where: { userId } }),
  ])

  let clearWaterIndex: number | null = null
  let clarity: ReturnType<typeof clarityLabel> | null = null
  let swim: ReturnType<typeof assessSwimSafety> | null = null
  // latestPlanParsed overrides 3 string fields (JSON columns) with parsed arrays,
  // so it is intentionally NOT the raw ActionPlan type.
  let latestPlanParsed: {
    immediateActions: any[]
    chemicalDosages: any[]
    doNotDo: any[]
    [k: string]: any
  } | null = null

  if (latestTest) {
    clearWaterIndex = latestTest.clearWaterIndex || calculateClearWaterIndex(latestTest as any)
    clarity = clarityLabel(clearWaterIndex)
    swim = assessSwimSafety(latestTest as any)
  }

  if (latestPlan) {
    latestPlanParsed = {
      ...latestPlan,
      immediateActions: safeParse(latestPlan.immediateActions),
      chemicalDosages: safeParse(latestPlan.chemicalDosages),
      doNotDo: safeParse(latestPlan.doNotDo),
    }
  }

  return NextResponse.json({
    profile,
    latestTest,
    latestPlan: latestPlanParsed,
    clearWaterIndex,
    clarity,
    swim,
    testsCount: tests.length,
    trend: tests.slice(0, 7).reverse(),
    diagnosticsCount: diagnostics.length,
    latestDiagnostic: diagnostics[0] || null,
    equipmentCount: equipment,
    productsCount: products,
    chatCount,
  })
}

function safeParse(s: string | null): any[] {
  if (!s) return []
  try { return JSON.parse(s) } catch { return [] }
}
