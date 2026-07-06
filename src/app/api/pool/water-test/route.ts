import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { generateActionPlan } from '@/lib/pool/action-plan'
import { calculateClearWaterIndex, calculateLSI, lsiInterpretation } from '@/lib/pool/water-balance'
import { assessSwimSafety } from '@/lib/pool/safety-rules'
import { evaluateParam } from '@/lib/pool/targets'

export const runtime = 'nodejs'

export async function GET() {
  const tests = await db.waterTest.findMany({ take: 50, orderBy: { createdAt: 'desc' }, include: { actionPlans: true } })
  return NextResponse.json({ tests })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const ph = Number(body.ph)
    if (isNaN(ph)) return NextResponse.json({ error: 'pH requis' }, { status: 400 })

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
      source: body.source || 'manual',
      note: body.note || null,
    }

    // Statut + indices
    const cwi = calculateClearWaterIndex(test as any)
    const swim = assessSwimSafety(test as any)
    const lsi = calculateLSI(test as any)
    let status = 'ok'
    if (swim.status === 'forbidden' || cwi < 40) status = 'critical'
    else if (cwi < 85 || swim.status === 'avoid') status = 'warning'

    const created = await db.waterTest.create({
      data: {
        ...test,
        status,
        clearWaterIndex: cwi,
        swimSafety: swim.status,
        lsi,
      },
    })

    // Générer plan d'action déterministe si profil existe
    const profile = await db.poolProfile.findFirst()
    let actionPlan = null
    if (profile) {
      const plan = generateActionPlan(test as any, {
        volume: profile.volume,
        unit: profile.unit as any,
        treatmentType: profile.treatmentType,
        saltSystem: profile.saltSystem,
      })
      actionPlan = await db.actionPlan.create({
        data: {
          waterTestId: created.id,
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

    return NextResponse.json({ test: created, actionPlan, lsiInfo: lsiInterpretation(lsi) })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (id) await db.waterTest.delete({ where: { id } })
  return NextResponse.json({ success: true })
}

function numOrNull(v: any): number | null {
  if (v === '' || v === null || v === undefined) return null
  const n = Number(v)
  return isNaN(n) ? null : n
}
