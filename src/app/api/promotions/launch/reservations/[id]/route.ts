import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { releaseReservation } from '@/lib/launch-offers/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * DELETE /api/promotions/launch/reservations/:id
 * Authentifié, propriétaire de la réservation. Idempotent.
 */
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> | { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = 'then' in ctx.params ? await ctx.params : ctx.params
  const result = await releaseReservation(id, session.user.id)
  if (!result.ok) {
    return NextResponse.json({ error: 'not_found_or_forbidden' }, { status: 404 })
  }
  return NextResponse.json({ ok: true }, { status: 200 })
}
