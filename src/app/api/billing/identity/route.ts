import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { upsertBillingIdentity, parseRevenueCatEnvironment } from '@/lib/billing/identity'

export const runtime = 'nodejs'

/**
 * POST /api/billing/identity
 * Registers (or re-asserts) the canonical billing identity for the
 * authenticated user. Only the authenticated user's own identity may be
 * registered — a client can never bind a provider id to another user.
 *
 * The identity is canonical per provider (RevenueCat reuses the same App User
 * ID for sandbox and production), so the client CANNOT choose the billing
 * environment here: it is never persisted and never trusted. If the client
 * sends an `environment` field it is strictly validated ('sandbox' | '
 * production') or the request is rejected — an invalid value is never defaulted
 * to production.
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
  // A client-provided environment is informational only and must be strictly
  // valid; it is never stored and never used to scope the identity.
  if (body.environment !== undefined) {
    const env = parseRevenueCatEnvironment(body.environment as string)
    if (!env) {
      return NextResponse.json({ error: 'Invalid environment value' }, { status: 400 })
    }
  }
  // The client may only bind its own identity.
  if (body.userId != null && body.userId !== userId) {
    return NextResponse.json({ error: 'Cannot bind identity to another user' }, { status: 403 })
  }

  const result = await upsertBillingIdentity({ provider, externalUserId, userId })
  if (!result.ok) {
    return NextResponse.json({ ok: false, code: result.code, reason: result.reason }, { status: 409 })
  }
  return NextResponse.json({ ok: true, identity: result.row })
}
