import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { clarityLabel, calculateClearWaterIndex } from '@/lib/pool/water-balance'
import { isInsufficientQualityScore } from '@/lib/pool/scientific-quality'
import { pickLocale, translate } from '@/lib/i18n-api'
import { generateScientificallyQualifiedActionPlan } from '@/lib/pool/scientific-action-plan'
import { isPoolFieldConfirmed } from '@/lib/pool/onboarding-form'
import {
  buildDashboardPlanView,
  buildDashboardSwim,
  sanitizeDashboardLatestTest,
} from '@/lib/pool/dashboard-plan-gate'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  const locale = pickLocale(req)
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    const msg = await translate(locale, 'common.errors.unauthorized', 'Non autorisé')
    return NextResponse.json({ error: msg }, { status: 401 })
  }
  const userId = session.user.id

  // Multi-pool: scope the profile to the requested poolId if provided.
  // (WaterTest/PhotoDiagnostic/etc. remain user-scoped until a schema
  // migration adds poolId — the active pool drives the profile block.)
  const url = new URL(req.url)
  const poolId = url.searchParams.get('poolId')
  const profileWhere = poolId ? { id: poolId, userId } : { userId }
  const poolScope = poolId ? { OR: [{ poolId }, { poolId: null }] } : {}

  const [profile, latestTest, tests, diagnostics, equipment, products, chatCount] = await Promise.all([
    db.poolProfile.findFirst({ where: profileWhere }),
    // The plan is fetched as a child of the latest test so the dashboard can
    // guarantee the stored plan BELONGS to that test (never a previous one).
    db.waterTest.findFirst({
      where: { userId, ...poolScope },
      orderBy: { createdAt: 'desc' },
      include: {
        actionPlans: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { executions: true, outcome: true },
        },
      },
    }),
    db.waterTest.findMany({ where: { userId, ...poolScope }, take: 30, orderBy: { createdAt: 'desc' } }),
    db.photoDiagnostic.findMany({ where: { userId, ...poolScope }, take: 5, orderBy: { createdAt: 'desc' } }),
    db.equipment.count({ where: { userId } }),
    db.productInventory.count({ where: { userId } }),
    db.chatMessage.count({ where: { userId } }),
  ])

  // The stored plan is the plan attached to the LATEST test (if any). A test
  // without a plan never picks up a previous test's plan.
  const storedPlan = latestTest?.actionPlans?.[0] ?? null

  let clearWaterIndex: number | null = null
  let clarity: ReturnType<typeof clarityLabel> | null = null

  if (latestTest) {
    // PR #96: a scientifically INSUFFICIENT assessment must never be presented
    // as a complete global score ("Eau parfaite 100/100"). Keep the CWI
    // internal, expose an explicit "Analyse partielle" state instead.
    if (isInsufficientQualityScore((latestTest as { scientificQualityScore?: number | null }).scientificQualityScore)) {
      clearWaterIndex = null
      clarity = {
        label: 'Analyse partielle',
        labelKey: 'clarityPartial',
        status: 'partial',
        color: 'accent',
      }
    } else {
      clearWaterIndex = latestTest.clearWaterIndex || calculateClearWaterIndex(latestTest as any)
      clarity = clarityLabel(clearWaterIndex)
    }
  }

  // Re-generate the FULL scientific plan from the latest test to get fresh
  // translation keys AND consistent scientific gating (dosage readiness,
  // contextual swim safety, method versions). The dashboard never bypasses the
  // rules and never falls back to the legacy engine: if regeneration fails or
  // the profile is missing, the plan view is FAIL-CLOSED.
  let freshPlan: ReturnType<typeof generateScientificallyQualifiedActionPlan> | null = null
  if (latestTest && profile) {
    try {
      freshPlan = generateScientificallyQualifiedActionPlan(
        latestTest as any,
        {
          volume: profile.volume,
          unit: profile.unit as any,
          treatmentType: profile.treatmentType,
          saltSystem: profile.saltSystem,
          waterBodyType: profile.waterBodyType ?? null,
          filterType: profile.filterType ?? null,
          manufacturerSaltMin: profile.manufacturerSaltMin ?? null,
          manufacturerSaltMax: profile.manufacturerSaltMax ?? null,
          manufacturerChlorineMax: profile.manufacturerChlorineMax ?? null,
          volumeConfirmed: isPoolFieldConfirmed(profile, 'volume'),
        } as any,
        locale,
        latestTest.measuredAt
          ? {
              measuredAt: new Date(latestTest.measuredAt),
              measurementMethod: (latestTest.measurementMethod as any) || 'manual',
              measurementMetadata: latestTest.measurementMetadata ?? null,
            }
          : undefined,
        new Date(),
      )
    } catch {
      freshPlan = null
    }
  }

  const latestPlan = buildDashboardPlanView({
    freshPlan,
    storedPlan,
    storedPlanBelongsToLatestTest: Boolean(storedPlan) && storedPlan?.waterTestId === latestTest?.id,
    // Safe metadata derived from the LATEST TEST, never from historical plan
    // content. storedActionPlanId is attached by the gate only when a stored
    // plan belongs exactly to the latest test.
    sourceMetadata: {
      sourceWaterTestId: latestTest?.id ?? null,
      sourceMeasuredAt: latestTest?.measuredAt ?? latestTest?.createdAt ?? null,
      generatedAt: new Date(),
    },
  })

  // FAIL-CLOSED swim: only a fresh canonical plan is authoritative; without one
  // the header shows 'unknown' + scientificRequalificationRequired (never the
  // possibly-historical stored latestTest.swimSafety).
  const swim = buildDashboardSwim({
    freshPlan,
    hasLatestTest: Boolean(latestTest),
  })

  // The PUBLIC latestTest NEVER carries the raw Prisma actionPlans relation
  // (and therefore no executions/outcome or stored dosage). The plan is exposed
  // ONLY through the secured `latestPlan` view.
  const sanitizedLatestTest = sanitizeDashboardLatestTest(latestTest as any)

  return NextResponse.json({
    profile,
    latestTest: sanitizedLatestTest,
    latestPlan,
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
