import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { generateScientificallyQualifiedActionPlan } from '@/lib/pool/scientific-action-plan'
import { resolveContextualOperatingTargets } from '@/lib/pool/contextual-targets'
import { assessContextualSwimSafety } from '@/lib/pool/contextual-swim-safety'
import { assessMeasurementConfidence } from '@/lib/pool/measurement-confidence'
import {
  MeasurementProvenanceError,
  normalizeMeasurementProvenance,
} from '@/lib/pool/measurement-provenance'
import { calculateClearWaterIndex, calculateLsiAssessment, lsiInterpretation } from '@/lib/pool/water-balance'
import { assessScientificQuality } from '@/lib/pool/scientific-quality'
import { isPoolFieldConfirmed } from '@/lib/pool/onboarding-form'
import { pickLocale, translate } from '@/lib/i18n-api'
import { trackEventServer } from '@/lib/analytics-server'
import { requireFeatureAccess } from '@/lib/billing/gate'
import { findOwnedPool } from '@/lib/brain/access'
import { recordAutomaticFollowup } from '@/lib/brain/record-followup'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  const locale = pickLocale(req)
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    const msg = await translate(locale, 'common.errors.unauthorized', 'Non autorisé')
    return NextResponse.json({ error: msg }, { status: 401 })
  }
  const userId = session.user.id
  const poolId = new URL(req.url).searchParams.get('poolId')

  // P0-B: Feature gate — history_extended
  // Free plan (Découverte) gets 14 days of history, paid plans get unlimited.
  const historyGate = await requireFeatureAccess(req as any, 'history_extended')
  const createdAt = historyGate.denied
    ? { gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) }
    : undefined

  const tests = await db.waterTest.findMany({
    where: { userId, createdAt, ...(poolId ? { OR: [{ poolId }, { poolId: null }] } : {}) },
    take: historyGate.denied ? 100 : 500,
    orderBy: { createdAt: 'desc' },
    include: { actionPlans: true },
  })
  return NextResponse.json({
    tests: historyGate.denied
      ? tests.map(({ lsi: _lsi, lsiMethodVersion: _lsiMethodVersion, ...test }) => test)
      : tests,
    historyLimited: historyGate.denied,
  })
}

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
    const profile = await findOwnedPool(userId, body.poolId)
    if (body.poolId && !profile) {
      return NextResponse.json({ error: 'Pool not found' }, { status: 404 })
    }

    const ph = Number(body.ph)
    if (isNaN(ph)) {
      const msg = await translate(
        locale,
        'common.errors.phRequired',
        'pH requis'
      )
      return NextResponse.json({ error: msg }, { status: 400 })
    }

    const analysisTime = new Date()
    const source = typeof body.source === 'string' && body.source.trim()
      ? body.source.trim().slice(0, 80)
      : 'manual'
    const provenance = normalizeMeasurementProvenance({
      measuredAt: body.measuredAt,
      measurementMethod: body.measurementMethod,
      measurementMetadata: body.measurementMetadata,
      source,
    }, analysisTime)

    const test = {
      ph,
      freeChlorine: numOrNull(body.freeChlorine),
      totalChlorine: numOrNull(body.totalChlorine),
      combinedChlorine: numOrNull(body.combinedChlorine),
      alkalinity: numOrNull(body.alkalinity),
      calciumHardness: numOrNull(body.calciumHardness),
      cyanuricAcid: numOrNull(body.cyanuricAcid),
      salt: numOrNull(body.salt),
      bromine: numOrNull(body.bromine),
      phosphates: numOrNull(body.phosphates),
      temperature: numOrNull(body.temperature),
      source,
      note: typeof body.note === 'string' && body.note.trim()
        ? body.note.trim().slice(0, 2_000)
        : null,
    }
    const scientificTest = {
      ...test,
      totalDissolvedSolids: numOrNull(body.totalDissolvedSolids),
    }
    const scientificProfile = {
      volume: profile?.volume ?? 0,
      unit: (profile?.unit ?? 'm3') as any,
      treatmentType: profile?.treatmentType ?? 'unknown',
      saltSystem: profile?.saltSystem ?? false,
      waterBodyType: profile?.waterBodyType ?? null,
      filterType: profile?.filterType ?? null,
      manufacturerSaltMin: profile?.manufacturerSaltMin ?? null,
      manufacturerSaltMax: profile?.manufacturerSaltMax ?? null,
      manufacturerChlorineMax: profile?.manufacturerChlorineMax ?? null,
      volumeConfirmed: isPoolFieldConfirmed(profile ?? {}, 'volume'),
    }
    const contextualTargets = resolveContextualOperatingTargets({
      treatmentType: scientificProfile.treatmentType,
      saltSystem: scientificProfile.saltSystem,
      waterBodyType: scientificProfile.waterBodyType,
      cyanuricAcid: scientificTest.cyanuricAcid,
      manufacturerSaltMin: scientificProfile.manufacturerSaltMin,
      manufacturerSaltMax: scientificProfile.manufacturerSaltMax,
    })
    const contextualSwimSafety = assessContextualSwimSafety(
      scientificTest,
      {
        treatmentType: scientificProfile.treatmentType,
        saltSystem: scientificProfile.saltSystem,
        waterBodyType: scientificProfile.waterBodyType,
        cyanuricAcid: scientificTest.cyanuricAcid,
        manufacturerSaltMin: scientificProfile.manufacturerSaltMin,
        manufacturerSaltMax: scientificProfile.manufacturerSaltMax,
        manufacturerChlorineMax: scientificProfile.manufacturerChlorineMax,
      },
      locale,
    )

    // Status + indices. LSI is strict and swimming safety is treatment-aware.
    const cwi = calculateClearWaterIndex(scientificTest)
    const lsiCalculation = calculateLsiAssessment(scientificTest)
    const lsi = lsiCalculation.value
    const standaloneQuality = assessScientificQuality(scientificTest, scientificProfile)
    const standaloneConfidence = assessMeasurementConfidence(
      standaloneQuality,
      provenance,
      analysisTime,
    )
    const persistedLimitations = [
      ...standaloneQuality.limitations,
      ...standaloneConfidence.limitations,
    ]
    let status = 'ok'
    if (contextualSwimSafety.status === 'forbidden' || cwi < 40) status = 'critical'
    else if (cwi < 85 || contextualSwimSafety.status === 'avoid') status = 'warning'

    const created = await db.waterTest.create({
      data: {
        ...test,
        totalDissolvedSolids: scientificTest.totalDissolvedSolids,
        measuredAt: provenance.measuredAt,
        measurementMethod: provenance.measurementMethod,
        measurementMetadata: provenance.measurementMetadata,
        scientificQualityScore: standaloneConfidence.score,
        scientificMethodVersion: standaloneConfidence.methodVersion,
        scientificLimitations: JSON.stringify(persistedLimitations),
        lsiMethodVersion: lsiCalculation.methodVersion,
        userId,
        poolId: profile?.id || null,
        status,
        clearWaterIndex: cwi,
        swimSafety: contextualSwimSafety.status,
        lsi,
      },
    })

    // Generate a deterministic plan, then qualify every conclusion and dosage.
    let actionPlan: Awaited<ReturnType<typeof db.actionPlan.create>> | null = null
    let qualifiedPlan: ReturnType<typeof generateScientificallyQualifiedActionPlan> | null = null
    if (profile) {
      qualifiedPlan = generateScientificallyQualifiedActionPlan(
        scientificTest,
        scientificProfile,
        locale,
        provenance,
        analysisTime,
      )
      actionPlan = await db.actionPlan.create({
        data: {
          waterTestId: created.id,
          diagnosis: qualifiedPlan.diagnosis,
          severity: qualifiedPlan.severity,
          confidence: qualifiedPlan.confidence,
          scientificMethodVersion: qualifiedPlan.scientificConfidence.methodVersion,
          dosageMethodVersion: qualifiedPlan.dosageMethodVersion,
          swimSafetyMethodVersion: qualifiedPlan.contextualSwimSafety.methodVersion,
          immediateActions: JSON.stringify(qualifiedPlan.immediateActions),
          chemicalDosages: JSON.stringify(qualifiedPlan.chemicalDosages),
          filtrationHours: qualifiedPlan.filtrationHours,
          retestInHours: qualifiedPlan.retestInHours,
          swimSafety: qualifiedPlan.swimSafety,
          doNotDo: JSON.stringify(qualifiedPlan.doNotDo),
          estimatedCost: qualifiedPlan.estimatedCost,
          whenToCallProfessional: qualifiedPlan.whenToCallProfessional,
        },
      })
    }
    const brainFollowup = profile ? await recordAutomaticFollowup(userId, profile.id, created) : null

    // Analytics — fire-and-forget, never blocks the response.
    void trackEventServer(
      'water_test_submitted',
      {
        ph,
        hasChlorine: test.freeChlorine != null,
        hasBromine: test.bromine != null,
        source: test.source,
        measurementMethod: provenance.measurementMethod,
        measurementAgeHours: standaloneConfidence.ageHours,
        treatmentType: scientificProfile.treatmentType,
        waterBodyType: scientificProfile.waterBodyType,
        clearWaterIndex: cwi,
        status,
        scientificQuality: standaloneQuality.score,
        scientificConfidence: qualifiedPlan?.confidence ?? standaloneConfidence.score,
        lsiEligible: lsiCalculation.value != null,
        swimSafetyMethod: contextualSwimSafety.methodVersion,
      },
      userId
    )

    // P0-B: Feature gate — pro_mode (LSI interpretation is a "pro" feature)
    // All users get contextual targets, safety and explainable confidence.
    // Pro mode additionally receives the LSI value, interpretation and provenance.
    const proGate = await requireFeatureAccess(req, 'pro_mode')
    const {
      lsi: _storedLsi,
      lsiMethodVersion: _storedLsiMethodVersion,
      ...publicTest
    } = created
    const normalizedPlan = normalizeStoredActionPlan(actionPlan)
    const response: any = {
      test: proGate.denied ? publicTest : created,
      actionPlan: normalizedPlan && qualifiedPlan
        ? {
            ...normalizedPlan,
            scientificQuality: qualifiedPlan.scientificQuality,
            scientificConfidence: qualifiedPlan.scientificConfidence,
            confidenceLevel: qualifiedPlan.confidenceLevel,
            contextualSwimSafety: qualifiedPlan.contextualSwimSafety,
            dosageMethodVersion: qualifiedPlan.dosageMethodVersion,
            dosageLabelVerificationRequired: qualifiedPlan.dosageLabelVerificationRequired,
          }
        : normalizedPlan,
      scientificQuality: qualifiedPlan?.scientificQuality ?? standaloneQuality,
      scientificConfidence: qualifiedPlan?.scientificConfidence ?? standaloneConfidence,
      contextualTargets,
      contextualSwimSafety,
      measurementProvenance: {
        measuredAt: provenance.measuredAt,
        measurementMethod: provenance.measurementMethod,
        measurementMetadata: provenance.measurementMetadata
          ? JSON.parse(provenance.measurementMetadata)
          : null,
        methodVersion: provenance.methodVersion,
      },
      brainFollowup,
    }
    if (!proGate.denied) {
      response.lsiInfo = lsiInterpretation(lsi)
      response.lsi = lsi
      response.lsiCalculation = lsiCalculation
    } else {
      response.lsiInfo = null
      response.proModeRequired = true
    }

    return NextResponse.json(response)
  } catch (e) {
    if (e instanceof MeasurementProvenanceError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: 400 })
    }
    const msg = e instanceof Error ? e.message : 'Erreur'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const locale = pickLocale(req)
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    const msg = await translate(locale, 'common.errors.unauthorized', 'Non autorisé')
    return NextResponse.json({ error: msg }, { status: 401 })
  }
  const userId = session.user.id

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (id) {
    // Only delete if it belongs to the authenticated user
    const existing = await db.waterTest.findFirst({ where: { id, userId } })
    if (existing) {
      await db.waterTest.delete({ where: { id } })
    }
  }
  return NextResponse.json({ success: true })
}

function normalizeStoredActionPlan(
  plan: Awaited<ReturnType<typeof db.actionPlan.create>> | null
) {
  if (!plan) return null

  return {
    ...plan,
    immediateActions: parseJsonArray(plan.immediateActions),
    chemicalDosages: parseJsonArray(plan.chemicalDosages),
    doNotDo: parseJsonArray(plan.doNotDo),
  }
}

function parseJsonArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value
  if (typeof value !== 'string' || value.trim() === '') return []

  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function numOrNull(v: any): number | null {
  if (v === '' || v === null || v === undefined) return null
  const n = Number(v)
  return isNaN(n) ? null : n
}
