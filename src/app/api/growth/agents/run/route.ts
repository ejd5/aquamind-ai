/**
 * AQWELIA Growth OS — Agent run API.
 *
 * URL: /api/growth/agents/run
 *
 * POST — trigger an agent run. Body:
 *        `{ agentType, input, leadId?, objective? }`.
 *        Dispatches to the matching agent function in
 *        `src/lib/growth/agents.ts`. Returns the full AgentResult.
 *
 * Auth: NextAuth session required. The user's primary organization becomes
 * the run's `organizationId`.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { pickLocale, translate } from '@/lib/i18n-api'
import { dispatchAgent, AGENT_LIST, type AgentType } from '@/lib/growth/agents'

export const runtime = 'nodejs'

const VALID_AGENT_TYPES = new Set(AGENT_LIST.map((a) => a.type))

async function getUserOrganization(userId: string) {
  const owned = await db.organization.findFirst({
    where: { ownerId: userId },
    orderBy: { createdAt: 'asc' },
  })
  if (owned) return owned
  const membership = await db.organizationMember.findFirst({
    where: { userId, status: 'active' },
    orderBy: { createdAt: 'asc' },
    include: { organization: true },
  })
  return membership?.organization ?? null
}

export async function POST(req: NextRequest) {
  const locale = pickLocale(req)
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    const msg = await translate(locale, 'common.errors.unauthorized', 'Non autorisé')
    return NextResponse.json({ error: msg }, { status: 401 })
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const agentType = String(body?.agentType ?? '') as AgentType
  if (!VALID_AGENT_TYPES.has(agentType)) {
    const msg = await translate(
      locale,
      'growth.errors.invalidAgentType',
      'Type d\'agent invalide'
    )
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  const spec = AGENT_LIST.find((a) => a.type === agentType)!
  const org = await getUserOrganization(session.user.id)

  const ctx = {
    organizationId: org?.id,
    userId: session.user.id,
    leadId: body?.leadId ? String(body.leadId) : undefined,
    objective: body?.objective ? String(body.objective) : spec.objective,
    tools: spec.tools,
    budget: spec.budget,
    maxActions: spec.maxActions,
    input: body?.input,
  }

  try {
    const result = await dispatchAgent(agentType, ctx, body?.input ?? {})
    return NextResponse.json({ result })
  } catch (err) {
    console.error('[growth/agents/run] error:', err)
    const msg = await translate(
      locale,
      'growth.errors.generic',
      'Une erreur est survenue.'
    )
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
