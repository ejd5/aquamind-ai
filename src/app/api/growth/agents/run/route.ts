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
import { getGrowthOrganization } from '@/lib/growth/access'
import { dispatchAgent, AGENT_LIST, type AgentType } from '@/lib/growth/agents'

export const runtime = 'nodejs'

const VALID_AGENT_TYPES = new Set(AGENT_LIST.map((a) => a.type))
const LEAD_SCOPED_AGENT_TYPES = new Set<AgentType>([
  'qualification',
  'diagnostic',
  'matching',
  'appointment',
  'nurturing',
  'quote',
  'attribution',
])

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
  const org = await getGrowthOrganization(session.user.id)
  const requestedLeadId = typeof body?.leadId === 'string' ? body.leadId : undefined

  // Every action that changes a lead must be scoped to the caller's active
  // organization.  The agent input cannot be allowed to point at a different
  // lead than the URL/body context.
  if (LEAD_SCOPED_AGENT_TYPES.has(agentType)) {
    if (!org || !requestedLeadId) {
      const msg = await translate(locale, 'common.errors.notFound', 'Non trouvé')
      return NextResponse.json({ error: msg }, { status: 404 })
    }
    const lead = await db.lead.findFirst({
      where: { id: requestedLeadId, organizationId: org.id },
      select: { id: true, consent: true },
    })
    if (!lead) {
      const msg = await translate(locale, 'common.errors.notFound', 'Non trouvé')
      return NextResponse.json({ error: msg }, { status: 404 })
    }
    // AQWELIA Growth Inbox Beta never starts an outbound sequence without a
    // recorded, explicit consent. Actual sending remains a later provider
    // integration with an unsubscribe workflow.
    if (agentType === 'nurturing' && !lead.consent) {
      return NextResponse.json(
        { error: 'Explicit consent is required before starting a nurture sequence.' },
        { status: 409 }
      )
    }
  }

  const input = {
    ...(body?.input && typeof body.input === 'object' ? body.input : {}),
    ...(requestedLeadId ? { leadId: requestedLeadId } : {}),
  }

  const ctx = {
    organizationId: org?.id,
    userId: session.user.id,
    leadId: requestedLeadId,
    objective: body?.objective ? String(body.objective) : spec.objective,
    tools: spec.tools,
    budget: spec.budget,
    maxActions: spec.maxActions,
    input,
  }

  try {
    const result = await dispatchAgent(agentType, ctx, input)
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
