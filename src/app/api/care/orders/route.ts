/**
 * AQWELIA Care — User orders list endpoint.
 *
 * URL: /api/care/orders
 *
 * GET: Requires NextAuth session. Returns the authenticated user's orders,
 * newest first. Each order's `items` is a JSON string the client must parse.
 */
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { pickLocale, translate } from '@/lib/i18n-api'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  const locale = pickLocale(req)
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    const msg = await translate(locale, 'common.errors.unauthorized', 'Non autorisé')
    return NextResponse.json({ error: msg }, { status: 401 })
  }

  try {
    const orders = await (db as any).order.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ items: orders, total: orders.length })
  } catch (err) {
    console.error('[care/orders] GET error:', err)
    const msg = await translate(locale, 'care.errGeneric', 'Une erreur est survenue.')
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
