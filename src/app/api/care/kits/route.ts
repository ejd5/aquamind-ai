/**
 * AQWELIA Care — Kits list endpoint.
 *
 * URL: /api/care/kits
 *
 * GET: Public. Returns active kits, optionally filtered by ?active=true|false.
 * Each kit's `items` JSON is enriched with the product snapshot at read time
 * (productId, sku, name, unit, price, imageUrl) so the client can render the
 * kit contents without an extra round-trip per product.
 */
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { pickLocale, translate } from '@/lib/i18n-api'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  const locale = pickLocale(req)
  const url = new URL(req.url)
  const onlyActive = url.searchParams.get('active') !== 'false'

  try {
    const kits = await (db as any).kit.findMany({
      where: onlyActive ? { active: true } : undefined,
      orderBy: [{ price: 'asc' }, { slug: 'asc' }],
    })
    if (kits.length === 0) {
      return NextResponse.json({ items: [], total: 0 })
    }

    // Collect all productIds referenced by kits, hydrate in a single query.
    const productIds = new Set<string>()
    for (const k of kits) {
      try {
        const items = JSON.parse(k.items)
        if (Array.isArray(items)) {
          for (const it of items) {
            if (it && typeof it.sku === 'string') productIds.add(it.sku)
          }
        }
      } catch {
        // ignore parse errors
      }
    }

    const products = await db.product.findMany({
      where: { sku: { in: Array.from(productIds) } },
    })
    const productMap = new Map(products.map((p) => [p.sku, p]))

    const items = kits.map((k: any) => {
      let parsed: Array<{ sku: string; quantity: number }> = []
      try {
        const p = JSON.parse(k.items)
        if (Array.isArray(p)) parsed = p
      } catch {
        parsed = []
      }
      const resolvedItems = parsed
        .map((it) => {
          const product = productMap.get(it.sku)
          if (!product) return null
          return {
            productId: product.id,
            sku: product.sku,
            name: product.name,
            unit: product.unit,
            price: product.price,
            imageUrl: product.imageUrl,
            quantity: it.quantity,
          }
        })
        .filter(Boolean)
      return {
        ...k,
        items: resolvedItems,
      }
    })

    return NextResponse.json({ items, total: items.length })
  } catch (err) {
    console.error('[care/kits] GET error:', err)
    const msg = await translate(locale, 'care.errGeneric', 'Une erreur est survenue.')
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
