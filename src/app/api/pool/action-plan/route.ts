import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { generateScientificallyQualifiedActionPlan } from '@/lib/pool/scientific-action-plan'
import type { MeasurementConfidenceInput } from '@/lib/pool/measurement-confidence'
import { isPoolFieldConfirmed } from '@/lib/pool/onboarding-form'
import { pickLocale, translate } from '@/lib/i18n-api'

export const runtime = 'nodejs'

// AQWELIA Wave A1 — canonical scientific path.
// This route uses the SAME scientific engine as POST /api/pool/water-test:
// measurement completeness, provenance-adjusted confidence, strict LSI,
// contextual swimming safety and dosage readiness. A deferred or non-calculable
// dosage never exposes an actionable quantity (readiness gates + masking).
// No fallback to the legacy unqualified engine.

// Régénère un plan d'action scientifique à partir d'un test existant (id) ou de valeurs inline
export async function POST(req: NextRequest) {
  const locale = pickLocale(req)
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    const msg = await translate(locale, 'common.errors.unauthorized', 'Non autorisé')
    return NextResponse.json({ error: msg }, { status: 401 })
  }
  const userId = session.user.id

  try {
    const body = await req.json()
    let test: Awaited<ReturnType<typeof db.waterTest.findUnique>> | null = null
    if (body.testId) {
      // Only fetch if it belongs to the authenticated user
      test = await db.waterTest.findFirst({ where: { id: body.testId, userId } })
    }
    if (!test && body.values) {
      test = body.values
    }
    if (!test) {
      const msg = await translate(
        locale,
        'common.errors.testIdValuesRequired',
        'testId ou values requis'
      )
      return NextResponse.json({ error: msg }, { status: 400 })
    }

    const profile = await db.poolProfile.findFirst({ where: { userId } })
    if (!profile) {
      const msg = await translate(
        locale,
        'common.errors.poolProfileRequired',
        'Profil piscine requis'
      )
      return NextResponse.json({ error: msg }, { status: 400 })
    }

    // Build the QUALIFIED inputs (same contract as the water-test route).
    const scientificTest = {
      ph: Number(test.ph),
      freeChlorine: toNullable(test.freeChlorine),
      totalChlorine: toNullable(test.totalChlorine),
      combinedChlorine: toNullable(test.combinedChlorine),
      bromine: toNullable(test.bromine),
      alkalinity: toNullable(test.alkalinity),
      calciumHardness: toNullable(test.calciumHardness),
      cyanuricAcid: toNullable(test.cyanuricAcid),
      salt: toNullable(test.salt),
      phosphates: toNullable(test.phosphates),
      temperature: toNullable(test.temperature),
      totalDissolvedSolids: toNullable(test.totalDissolvedSolids),
    }
    const scientificProfile = {
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
    }
    // Use stored provenance (freshness / method / calibration) when the test row
    // carries it; inline values without provenance get the unadjusted confidence.
    const measurementConfidenceInput: MeasurementConfidenceInput | undefined =
      test.measuredAt
        ? {
            measuredAt: new Date(test.measuredAt),
            measurementMethod: (test.measurementMethod as any) || 'manual',
            measurementMetadata: test.measurementMetadata ?? null,
          }
        : undefined

    const plan = generateScientificallyQualifiedActionPlan(
      scientificTest as any,
      scientificProfile as any,
      locale,
      measurementConfidenceInput,
    )

    // Sauvegarder le plan (si testId existant, écraser ancien)
    let saved: Awaited<ReturnType<typeof db.actionPlan.create>> | null = null
    if (body.testId) {
      saved = await db.actionPlan.create({
        data: {
          waterTestId: body.testId,
          diagnosis: plan.diagnosis,
          severity: plan.severity,
          confidence: plan.confidence,
          scientificMethodVersion: plan.scientificConfidence.methodVersion,
          dosageMethodVersion: plan.dosageMethodVersion,
          swimSafetyMethodVersion: plan.contextualSwimSafety.methodVersion,
          immediateActions: JSON.stringify(plan.immediateActions),
          chemicalDosages: JSON.stringify(plan.chemicalDosages),
          filtrationHours: plan.filtrationHours,
          retestInHours: plan.retestInHours,
          swimSafety: plan.swimSafety,
          doNotDo: JSON.stringify(plan.doNotDo),
          estimatedCost: plan.estimatedCost,
          whenToCallProfessional: plan.whenToCallProfessional,
        },
      })
    }

    return NextResponse.json({ plan, saved })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

function toNullable(v: unknown): number | null {
  if (v === '' || v === null || v === undefined) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}
