/**
 * AQWELIA Care — Product categories endpoint.
 *
 * URL: /api/care/categories
 *
 * GET: Public. Returns the list of ProductCategory records, ordered by
 * `sortOrder` then `slug`. Includes a computed `productCount` for each
 * category (count of active products with `subcategory = slug`).
 */
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { pickLocale, translate } from '@/lib/i18n-api'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  const locale = pickLocale(req)
  try {
    const cats = await db.productCategory.findMany({
      orderBy: [{ sortOrder: 'asc' }, { slug: 'asc' }],
    })

    // Compute active product count per category (by subcategory = slug).
    const counts = await db.product.groupBy({
      by: ['subcategory'],
      _count: { _all: true },
      where: { active: true },
    })
    const countMap = new Map<string, number>()
    for (const c of counts) {
      if (c.subcategory) countMap.set(c.subcategory, c._count._all)
    }

    const items = cats.map((c) => ({
      ...c,
      productCount: countMap.get(c.slug) ?? 0,
    }))

    return NextResponse.json({ items, total: items.length })
  } catch (err) {
    console.error('[care/categories] GET error:', err)
    const msg = await translate(locale, 'care.errGeneric', 'Une erreur est survenue.')
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
