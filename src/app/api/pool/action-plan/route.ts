import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { generateActionPlan } from '@/lib/pool/action-plan'

export const runtime = 'nodejs'

// Régénère un plan d'action à partir d'un test existant (id) ou de valeurs inline
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    let test = null
    if (body.testId) {
      test = await db.waterTest.findUnique({ where: { id: body.testId } })
    }
    if (!test && body.values) {
      test = body.values
    }
    if (!test) return NextResponse.json({ error: 'testId ou values requis' }, { status: 400 })

    const profile = await db.poolProfile.findFirst()
    if (!profile) return NextResponse.json({ error: 'Profil piscine requis' }, { status: 400 })

    const plan = generateActionPlan(test as any, {
      volume: profile.volume,
      unit: profile.unit as any,
      treatmentType: profile.treatmentType,
      saltSystem: profile.saltSystem,
    })

    // Sauvegarder le plan (si testId existant, écraser ancien)
    let saved = null
    if (body.testId) {
      saved = await db.actionPlan.create({
        data: {
          waterTestId: body.testId,
          diagnosis: plan.diagnosis,
          severity: plan.severity,
          confidence: plan.confidence,
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
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur' }, { status: 500 })
  }
}
