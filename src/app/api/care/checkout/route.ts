/**
 * AQWELIA Care — Checkout endpoint (create an Order from the user's Cart).
 *
 * URL: /api/care/checkout
 *
 * POST: Requires NextAuth session. Body: { address, city, zipCode, country? }.
 *  - Reads the user's cart (must have ≥1 item with quantity ≥1).
 *  - Hydrates each cart line with the current product price from the DB.
 *  - Computes subtotal, tax (20 % VAT), shipping (free over 75 €, else 6.90 €).
 *  - Persists a new Order with status='pending'.
 *  - Clears the cart (items = '[]').
 *  - Returns { order }.
 *
 * Payment (Stripe, etc.) is handled in a separate /api/care/orders/[id]/pay
 * route — this endpoint only creates the pending order. Email confirmation is
 * fire-and-forget (best-effort).
 */
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { pickLocale, translate } from '@/lib/i18n-api'

export const runtime = 'nodejs'

const FREE_SHIPPING_THRESHOLD = 75
const SHIPPING_DEFAULT = 6.9
const VAT_RATE = 0.2

interface CartItem {
  productId: string
  quantity: number
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

  const address =
    typeof body?.address === 'string' && body.address.trim() ? body.address.trim() : ''
  const city =
    typeof body?.city === 'string' && body.city.trim() ? body.city.trim() : ''
  const zipCode =
    typeof body?.zipCode === 'string' && body.zipCode.trim() ? body.zipCode.trim() : ''
  const country =
    typeof body?.country === 'string' && body.country.trim() ? body.country.trim() : 'FR'

  if (!address || !city || !zipCode) {
    const msg = await translate(
      locale,
      'care.errMissingAddress',
      'Adresse de livraison incomplète.'
    )
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  try {
    const cart = await (db as any).cart.findUnique({
      where: { userId: session.user.id },
    })
    if (!cart) {
      const msg = await translate(locale, 'care.errEmptyCart', 'Panier vide.')
      return NextResponse.json({ error: msg }, { status: 400 })
    }

    let items: CartItem[] = []
    try {
      const parsed = JSON.parse(cart.items)
      if (Array.isArray(parsed)) {
        items = parsed.filter(
          (i) =>
            i && typeof i.productId === 'string' && Number.isFinite(i.quantity)
        )
      }
    } catch {
      items = []
    }

    if (items.length === 0) {
      const msg = await translate(locale, 'care.errEmptyCart', 'Panier vide.')
      return NextResponse.json({ error: msg }, { status: 400 })
    }

    // Hydrate product info (filter out inactive/regulated items just in case).
    const productIds = items.map((i) => i.productId)
    const products = await db.product.findMany({
      where: { id: { in: productIds }, active: true, regulated: false },
    })
    const productMap = new Map(products.map((p) => [p.id, p]))

    const lineItems = items
      .filter((i) => productMap.has(i.productId))
      .map((i) => {
        const p = productMap.get(i.productId)!
        return {
          productId: p.id,
          sku: p.sku,
          name: p.name,
          unit: p.unit,
          price: p.price,
          currency: p.currency,
          quantity: i.quantity,
          lineTotal: Math.round(p.price * i.quantity * 100) / 100,
        }
      })

    if (lineItems.length === 0) {
      const msg = await translate(
        locale,
        'care.errNoActiveItems',
        'Aucun produit commandable dans le panier.'
      )
      return NextResponse.json({ error: msg }, { status: 400 })
    }

    const subtotal =
      Math.round(lineItems.reduce((sum, l) => sum + l.lineTotal, 0) * 100) / 100
    const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_DEFAULT
    const taxBase = subtotal + shipping
    const tax = Math.round(taxBase * VAT_RATE * 100) / 100
    const total = Math.round((taxBase + tax) * 100) / 100

    const order = await (db as any).order.create({
      data: {
        userId: session.user.id,
        items: JSON.stringify(lineItems),
        subtotal,
        tax,
        shipping,
        total,
        currency: 'EUR',
        status: 'pending',
        address,
        city,
        zipCode,
        country,
      },
    })

    // Clear the cart once the order is persisted.
    await (db as any).cart.update({
      where: { userId: session.user.id },
      data: { items: '[]' },
    })

    // Best-effort email confirmation (fire-and-forget — never blocks).
    void import('@/lib/email')
      .then((m: any) => m.sendOrderConfirmationEmail?.({ order, email: session.user.email }))
      .catch((err) => console.error('[care/checkout] email failed:', err))

    return NextResponse.json({ order }, { status: 201 })
  } catch (err) {
    console.error('[care/checkout] POST error:', err)
    const msg = await translate(locale, 'care.errGeneric', 'Une erreur est survenue.')
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
