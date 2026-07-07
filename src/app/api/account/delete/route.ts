/**
 * AQWELIA — RGPD account deletion endpoint.
 *
 * POST /api/account/delete
 *
 * Cascade-deletes the authenticated user and ALL associated data:
 * poolProfiles, waterTests (+ actionPlans), photoDiagnostics, equipment,
 * inventory, chatMessages, maintenanceTasks, poolDesigns, reminders,
 * guideViews, subscriptions, analyticsEvents, accounts.
 *
 * All relations on `User` are `onDelete: Cascade` in the Prisma schema,
 * so a single `db.user.delete` propagates to every dependent row.
 *
 * The session JWT is NOT revoked server-side (NextAuth v4 JWTs are stateless);
 * the client MUST call `signOut()` after this endpoint returns 200 to drop
 * the cookie. The JWT will simply fail to resolve to a user on the next
 * `getServerSession` call (user no longer exists), which is equivalent to
 * a sign-out from the user's perspective.
 */
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { pickLocale, translate } from '@/lib/i18n-api'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    const locale = pickLocale(req)
    const msg = await translate(locale, 'common.errors.unauthorized', 'Non autorisé')
    return NextResponse.json({ error: msg }, { status: 401 })
  }

  const userId = session.user.id

  try {
    // Prisma onDelete: Cascade is set on every relation to User, so this
    // single delete cascades to every dependent model atomically.
    await db.user.delete({ where: { id: userId } })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[account/delete] error:', err)
    const locale = pickLocale(req)
    const msg = await translate(
      locale,
      'common.errors.accountDeleteError',
      'Erreur lors de la suppression du compte'
    )
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
