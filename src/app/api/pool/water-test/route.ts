import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { generateActionPlan } from '@/lib/pool/action-plan'
import { calculateClearWaterIndex, calculateLSI, lsiInterpretation } from '@/lib/pool/water-balance'
import { assessSwimSafety } from '@/lib/pool/safety-rules'
import { pickLocale, translate } from '@/lib/i18n-api'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    const locale = pickLocale(req)
    const msg = await translate(locale, 'common.errors.unauthorized', 'Non autorisé')
    return NextResponse.json({ error: msg }, { status: 401 })
  }
  const userId = session.user.id

  const tests = await db.waterTest.findMany({
    where: { userId },
    take: 50,
    orderBy: { createdAt: 'desc' },
    include: { actionPlans: true },
  })
  return NextResponse.json({ tests })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const locale = pickLocale(req)
  if (!session?.user?.id) {
    const msg = await translate(locale, 'common.errors.unauthorized', 'Non autorisé')
    return NextResponse.json({ error: msg }, { status: 401 })
  }
  const userId = session.user.id

  try {
    const body = await req.json()
    const ph = Number(body.ph)
    if (isNaN(ph)) {
      const msg = await translate(
        locale,
        'common.errors.phRequired',
        'pH requis'
      )
      return NextResponse.json({ error: msg }, { status: 400 })
    }

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
        userId,
        status,
        clearWaterIndex: cwi,
        swimSafety: swim.status,
        lsi,
      },
    })

    // Générer plan d'action déterministe si profil existe
    const profile = await db.poolProfile.findFirst({ where: { userId } })
    let actionPlan: Awaited<ReturnType<typeof db.actionPlan.create>> | null = null
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
    // TODO: i18n — return a translation key for the client to localise.
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    const locale = pickLocale(req)
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

function numOrNull(v: any): number | null {
  if (v === '' || v === null || v === undefined) return null
  const n = Number(v)
  return isNaN(n) ? null : n
}
