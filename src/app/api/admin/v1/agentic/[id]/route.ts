/**
 * AQWELIA — Admin Control Plane V1 · revue HUMAINE d'une proposition agent.
 * POST { decision: APPROVE | REJECT } — change UNIQUEMENT le statut.
 * Aucune exécution/publication dans ce geste (PR séparée : APPROVE puis PUBLISH).
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdminFromDb } from '@/lib/admin-auth'
import { reviewProposal } from '@/lib/admin-agentic/agents'
import { agentReviewSchema } from '@/lib/admin-control/schemas'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminFromDb()
  if (!auth.authorized) return NextResponse.json({ error: auth.reason === 'no-session' ? 'Unauthorized' : 'Forbidden' }, { status: auth.reason === 'no-session' ? 401 : 403 })

  const { id } = await params
  const body = await req.json().catch(() => null)
  const parsed = agentReviewSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_payload', details: parsed.error.flatten().fieldErrors }, { status: 400 })
  }
  const result = await reviewProposal(id, parsed.data.decision, auth.userId, parsed.data.reason)
  if (!result.ok) {
    const status = result.error === 'not_found' ? 404 : 400
    return NextResponse.json({ error: result.error }, { status })
  }
  return NextResponse.json({ proposal: result.proposal }, { status: 200 })
}
