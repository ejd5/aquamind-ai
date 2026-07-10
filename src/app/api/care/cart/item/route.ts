/**
 * AQWELIA Care — Cart item endpoints (current user).
 *
 * URL: /api/care/cart/item
 *
 * POST:   Add an item to the cart (or increment quantity if already present).
 *         Body: { productId, quantity }.
 * PATCH:  Update the quantity of an existing item (or remove if quantity=0).
 *         Body: { productId, quantity }.
 * DELETE: Remove an item from the cart. Body: { productId }.
 *
 * All routes require NextAuth session. Defensive casts on `(db as any)` keep
 * the file type-safe before the Prisma Client picks up the new Cart model.
 */
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { pickLocale, translate } from '@/lib/i18n-api'

export const runtime = 'nodejs'

interface CartItem {
  productId: string
  quantity: number
}

async function getOrCreateCart(userId: string) {
  const existing = await (db as any).cart.findUnique({ where: { userId } })
  if (existing) return existing
  return (db as any).cart.create({ data: { userId, items: '[]' } })
}

function readItems(cart: { items: string }): CartItem[] {
  try {
    const parsed = JSON.parse(cart.items)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (i) =>
        i && typeof i.productId === 'string' && Number.isFinite(i.quantity)
    ) as CartItem[]
  } catch {
    return []
  }
}

function writeItems(items: CartItem[]): string {
  return JSON.stringify(items.filter((i) => i.quantity > 0))
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

  const productId =
    typeof body?.productId === 'string' ? body.productId : undefined
  const quantity = Number(body?.quantity)
  if (!productId || !Number.isFinite(quantity) || quantity < 1) {
    const msg = await translate(locale, 'care.errBadCartItem', 'Item invalide.')
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  try {
    // Verify the product exists and is active.
    const product = await db.product.findUnique({ where: { id: productId } })
    if (!product || !product.active) {
      const msg = await translate(
        locale,
        'care.errProductNotAvailable',
        'Produit non disponible.'
      )
      return NextResponse.json({ error: msg }, { status: 404 })
    }

    const cart = await getOrCreateCart(session.user.id)
    const items = readItems(cart)
    const existing = items.find((i) => i.productId === productId)
    if (existing) {
      existing.quantity += Math.floor(quantity)
    } else {
      items.push({ productId, quantity: Math.floor(quantity) })
    }
    const updated = await (db as any).cart.update({
      where: { userId: session.user.id },
      data: { items: writeItems(items) },
    })
    return NextResponse.json({ cart: updated })
  } catch (err) {
    console.error('[care/cart/item] POST error:', err)
    const msg = await translate(locale, 'care.errGeneric', 'Une erreur est survenue.')
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
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

  const productId =
    typeof body?.productId === 'string' ? body.productId : undefined
  const quantity = Number(body?.quantity)
  if (!productId || !Number.isFinite(quantity) || quantity < 0) {
    const msg = await translate(locale, 'care.errBadCartItem', 'Item invalide.')
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  try {
    const cart = await getOrCreateCart(session.user.id)
    const items = readItems(cart)
    const existing = items.find((i) => i.productId === productId)
    if (!existing) {
      const msg = await translate(
        locale,
        'care.errCartItemNotFound',
        'Item introuvable dans le panier.'
      )
      return NextResponse.json({ error: msg }, { status: 404 })
    }
    existing.quantity = Math.floor(quantity)
    const updated = await (db as any).cart.update({
      where: { userId: session.user.id },
      data: { items: writeItems(items) },
    })
    return NextResponse.json({ cart: updated })
  } catch (err) {
    console.error('[care/cart/item] PATCH error:', err)
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

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const productId =
    typeof body?.productId === 'string' ? body.productId : undefined
  if (!productId) {
    const msg = await translate(locale, 'care.errBadCartItem', 'Item invalide.')
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  try {
    const cart = await getOrCreateCart(session.user.id)
    const items = readItems(cart).filter((i) => i.productId !== productId)
    const updated = await (db as any).cart.update({
      where: { userId: session.user.id },
      data: { items: writeItems(items) },
    })
    return NextResponse.json({ cart: updated })
  } catch (err) {
    console.error('[care/cart/item] DELETE error:', err)
    const msg = await translate(locale, 'care.errGeneric', 'Une erreur est survenue.')
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
