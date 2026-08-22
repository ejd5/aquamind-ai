/**
 * AQWELIA — Admin Control Plane V1 · Agentic.
 * GET  = liste des propositions (admin) ;
 * POST = exécute un agent DÉTERMINISTE → proposition NEEDS_REVIEW.
 * JAMAIS de publication automatique : l'agent propose, l'humain valide.
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdminFromDb } from '@/lib/admin-auth'
import { runAdminAgent, listProposals } from '@/lib/admin-agentic/agents'
import { agentRunSchema } from '@/lib/admin-control/schemas'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await requireAdminFromDb()
  if (!auth.authorized) return NextResponse.json({ error: auth.reason === 'no-session' ? 'Unauthorized' : 'Forbidden' }, { status: auth.reason === 'no-session' ? 401 : 403 })

  const status = new URL(req.url).searchParams.get('status') ?? undefined
  const proposals = await listProposals({ status })
  return NextResponse.json({ proposals }, { status: 200 })
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminFromDb()
  if (!auth.authorized) return NextResponse.json({ error: auth.reason === 'no-session' ? 'Unauthorized' : 'Forbidden' }, { status: auth.reason === 'no-session' ? 401 : 403 })

  const body = await req.json().catch(() => null)
  const parsed = agentRunSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_payload', details: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const proposal = await runAdminAgent(parsed.data.agent, (parsed.data.input ?? {}) as Parameters<typeof runAdminAgent>[1], auth.userId)
  return NextResponse.json({ proposal }, { status: 201 })
}
