/**
 * AQWELIA Growth OS — Lead qualification API.
 *
 * URL: /api/growth/leads/[id]/qualify
 *
 * POST — run the qualification agent. Body:
 *        `{ answers: [{ question, answer, weight? }] }`.
 *        Returns the agent result (score, tier, nextStep).
 *
 * Auth: NextAuth session required. Lead must belong to user's organization.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { pickLocale, translate } from '@/lib/i18n-api'
import { getGrowthOrganization } from '@/lib/growth/access'
import { qualification, type QualificationInput } from '@/lib/growth/agents'

export const runtime = 'nodejs'

type Ctx = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, ctx: Ctx) {
  const locale = pickLocale(req)
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    const msg = await translate(locale, 'common.errors.unauthorized', 'Non autorisé')
    return NextResponse.json({ error: msg }, { status: 401 })
  }

  const { id } = await ctx.params
  const org = await getGrowthOrganization(session.user.id)
  if (!org) {
    const msg = await translate(locale, 'common.errors.notFound', 'Non trouvé')
    return NextResponse.json({ error: msg }, { status: 404 })
  }

  const existing = await db.lead.findFirst({
    where: { id, organizationId: org.id },
    select: { id: true },
  })
  if (!existing) {
    const msg = await translate(locale, 'common.errors.notFound', 'Non trouvé')
    return NextResponse.json({ error: msg }, { status: 404 })
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const answers = Array.isArray(body?.answers) ? body.answers : []
  if (answers.length === 0) {
    const msg = await translate(
      locale,
      'growth.errors.noAnswers',
      'Aucune réponse fournie'
    )
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  const input: QualificationInput = {
    leadId: id,
    answers: answers.map((a: any) => ({
      question: String(a?.question ?? ''),
      answer: String(a?.answer ?? ''),
      weight: typeof a?.weight === 'number' ? a.weight : undefined,
    })),
  }

  try {
    const result = await qualification(
      {
        organizationId: org.id,
        userId: session.user.id,
        leadId: id,
        objective: 'Qualify lead with ' + answers.length + ' answers',
        tools: ['qualification_scoring', 'lead_update'],
        budget: 0.15,
        maxActions: 8,
      },
      input
    )
    return NextResponse.json({ result })
  } catch (err) {
    console.error('[growth/qualify] error:', err)
    const msg = await translate(
      locale,
      'growth.errors.generic',
      'Une erreur est survenue.'
    )
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
