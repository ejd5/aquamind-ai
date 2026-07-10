/**
 * AQWELIA Care — Cart endpoints (current user).
 *
 * URL: /api/care/cart
 *
 * GET:    Returns the user's cart (creates an empty one on first GET).
 * POST:   Bulk replace cart items. Body: { items: Array<{ productId, quantity }> }.
 *         Useful for the client to sync the local cart state after a series of
 *         add/update/remove operations.
 * DELETE: Clears all items from the cart.
 *
 * All routes require NextAuth session. The cart is keyed by `userId`.
 */
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { pickLocale, translate } from '@/lib/i18n-api'

export const runtime = 'nodejs'

interface CartItemInput {
  productId?: unknown
  quantity?: unknown
}

function sanitizeItems(raw: unknown): { productId: string; quantity: number }[] | null {
  if (!Array.isArray(raw)) return null
  const out: { productId: string; quantity: number }[] = []
  for (const item of raw as CartItemInput[]) {
    const productId =
      typeof item?.productId === 'string' ? item.productId : undefined
    const qtyNum = Number(item?.quantity)
    if (!productId || !Number.isFinite(qtyNum) || qtyNum < 0) return null
    out.push({ productId, quantity: Math.floor(qtyNum) })
  }
  return out
}

async function getOrCreateCart(userId: string) {
  const existing = await (db as any).cart.findUnique({ where: { userId } })
  if (existing) return existing
  return (db as any).cart.create({
    data: { userId, items: '[]' },
  })
}

export async function GET(req: Request) {
  const locale = pickLocale(req)
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    const msg = await translate(locale, 'common.errors.unauthorized', 'Non autorisé')
    return NextResponse.json({ error: msg }, { status: 401 })
  }
  try {
    const cart = await getOrCreateCart(session.user.id)
    return NextResponse.json({ cart })
  } catch (err) {
    console.error('[care/cart] GET error:', err)
    const msg = await translate(locale, 'care.errGeneric', 'Une erreur est survenue.')
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(req: Request) {
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

  const items = sanitizeItems(body?.items)
  if (items === null) {
    const msg = await translate(locale, 'care.errBadCartItems', 'Items invalides.')
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  try {
    await getOrCreateCart(session.user.id)
    const cart = await (db as any).cart.update({
      where: { userId: session.user.id },
      data: { items: JSON.stringify(items) },
    })
    return NextResponse.json({ cart })
  } catch (err) {
    console.error('[care/cart] POST error:', err)
    const msg = await translate(locale, 'care.errGeneric', 'Une erreur est survenue.')
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  const locale = pickLocale(req)
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    const msg = await translate(locale, 'common.errors.unauthorized', 'Non autorisé')
    return NextResponse.json({ error: msg }, { status: 401 })
  }

  try {
    await getOrCreateCart(session.user.id)
    const cart = await (db as any).cart.update({
      where: { userId: session.user.id },
      data: { items: '[]' },
    })
    return NextResponse.json({ cart })
  } catch (err) {
    console.error('[care/cart] DELETE error:', err)
    const msg = await translate(locale, 'care.errGeneric', 'Une erreur est survenue.')
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
