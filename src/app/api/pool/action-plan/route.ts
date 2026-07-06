import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { generateActionPlan } from '@/lib/pool/action-plan'

export const runtime = 'nodejs'

// Régénère un plan d'action à partir d'un test existant (id) ou de valeurs inline
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
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
    if (!test) return NextResponse.json({ error: 'testId ou values requis' }, { status: 400 })

    const profile = await db.poolProfile.findFirst({ where: { userId } })
    if (!profile) return NextResponse.json({ error: 'Profil piscine requis' }, { status: 400 })

    const plan = generateActionPlan(test as any, {
      volume: profile.volume,
      unit: profile.unit as any,
      treatmentType: profile.treatmentType,
      saltSystem: profile.saltSystem,
    })

    // Sauvegarder le plan (si testId existant, écraser ancien)
    let saved: Awaited<ReturnType<typeof db.actionPlan.create>> | null = null
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
