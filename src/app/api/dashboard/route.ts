import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { clarityLabel, calculateClearWaterIndex } from '@/lib/pool/water-balance'
import { assessSwimSafety } from '@/lib/pool/safety-rules'
import { pickLocale, translate } from '@/lib/i18n-api'
import { generateActionPlan } from '@/lib/pool/action-plan'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  const locale = pickLocale(req)
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    const msg = await translate(locale, 'common.errors.unauthorized', 'Non autorisé')
    return NextResponse.json({ error: msg }, { status: 401 })
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
    // Re-generate the FULL plan from the latest test to get fresh translation
    // keys. The DB stores French literals without keys for old plans. By
    // regenerating, we get immediateActions/chemicalDosages WITH actionKey,
    // detailKey, productKey, methodKey, warningKeys etc. — so the UI can
    // translate everything instead of showing French fallbacks.
    if (latestTest && profile) {
      try {
        const freshPlan = generateActionPlan(latestTest as any, profile as any)
        // Use fresh immediateActions and chemicalDosages (they have *Key fields)
        latestPlanParsed.immediateActions = freshPlan.immediateActions as any
        latestPlanParsed.chemicalDosages = freshPlan.chemicalDosages as any
        // Merge scalar key fields
        latestPlanParsed.diagnosisKey = freshPlan.diagnosisKey
        latestPlanParsed.diagnosisParams = freshPlan.diagnosisParams
        latestPlanParsed.doNotDoKeys = freshPlan.doNotDoKeys
        latestPlanParsed.whenToCallProfessionalKey = freshPlan.whenToCallProfessionalKey
        latestPlanParsed.whenToCallProfessionalParams = freshPlan.whenToCallProfessionalParams
        latestPlanParsed.lsiLabelKey = freshPlan.lsiLabelKey
        latestPlanParsed.swimReasonKeys = freshPlan.swimReasonKeys
        latestPlanParsed.swimReasonParams = freshPlan.swimReasonParams
      } catch { /* keep DB-stored plan as fallback */ }
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
