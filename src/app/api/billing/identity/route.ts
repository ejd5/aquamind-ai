import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { upsertBillingIdentity, getBillingAccessEnvironment } from '@/lib/billing/identity'

export const runtime = 'nodejs'

/**
 * POST /api/billing/identity
 * Registers (or re-asserts) the canonical billing identity for the
 * authenticated user. Only the authenticated user's own identity may be
 * registered — a client can never bind a provider id to another user.
 *
 * The identity is canonical per provider (RevenueCat reuses the same App User
 * ID for sandbox and production), so the client CANNOT choose the billing
 * environment here: it is never persisted and never trusted, and any
 * client-sent `environment` field is ignored for scoping.
 *
 * Wave A2 (Round 4): after a successful binding, the server returns the
 * AUTHORITATIVE billing access environment computed exclusively by
 * getBillingAccessEnvironment() (server-side). The client stores this value
 * and uses it for purchase / restore / convergence — it never computes or
 * sends it.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = session.user.id

  let body: { provider?: unknown; environment?: unknown; externalUserId?: unknown; userId?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const provider = body.provider === 'stripe' ? 'stripe' : body.provider === 'revenuecat' ? 'revenuecat' : null
  const externalUserId = typeof body.externalUserId === 'string' ? body.externalUserId : ''

  if (!provider || !externalUserId) {
    return NextResponse.json({ error: 'provider and externalUserId are required' }, { status: 400 })
  }
  // The client may only bind its own identity.
  if (body.userId != null && body.userId !== userId) {
    return NextResponse.json({ error: 'Cannot bind identity to another user' }, { status: 403 })
  }

  const result = await upsertBillingIdentity({ provider, externalUserId, userId })
  if (!result.ok) {
    return NextResponse.json({ ok: false, code: result.code, reason: result.reason }, { status: 409 })
  }

  // Wave A2 (Round 4): the server is the ONLY source of the billing access
  // environment. Never trust a client-supplied value.
  const billingAccessEnvironment = getBillingAccessEnvironment()
  return NextResponse.json({
    ok: true,
    identity: result.row,
    billingAccessEnvironment,
  })
}
