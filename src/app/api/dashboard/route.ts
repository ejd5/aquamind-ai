import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { clarityLabel, calculateClearWaterIndex } from '@/lib/pool/water-balance'
import { assessSwimSafety } from '@/lib/pool/safety-rules'

export const runtime = 'nodejs'

export async function GET() {
  const [profile, latestTest, latestPlan, tests, diagnostics, equipment, products, chatCount] = await Promise.all([
    db.poolProfile.findFirst(),
    db.waterTest.findFirst({ orderBy: { createdAt: 'desc' }, include: { actionPlans: true } }),
    db.actionPlan.findFirst({ orderBy: { createdAt: 'desc' } }),
    db.waterTest.findMany({ take: 30, orderBy: { createdAt: 'desc' } }),
    db.photoDiagnostic.findMany({ take: 5, orderBy: { createdAt: 'desc' } }),
    db.equipment.count(),
    db.productInventory.count(),
    db.chatMessage.count(),
  ])

  let clearWaterIndex = null
  let clarity = null
  let swim = null
  let latestPlanParsed = null

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
