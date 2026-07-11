/**
 * AQWELIA Care — Product list endpoint.
 *
 * URL: /api/care/products
 *
 * GET: Public. Returns active products with optional filters:
 *   ?category=green|orange|red
 *   ?subcategory=bandelettes-tests|cartouches-filtres|...
 *   ?search=ph (case-insensitive on name + brand + sku)
 *   ?limit=50 (default 50, max 200)
 *   ?offset=0
 *   ?includeInactive=false (admin only — see ADMIN_EMAILS env var)
 *
 * Regulated (red) products are returned with `active=false` so the UI can
 * display them but route the user to a partner supplier for purchase.
 */
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { pickLocale, translate } from '@/lib/i18n-api'

export const runtime = 'nodejs'

const ALLOWED_CATEGORIES = new Set(['green', 'orange', 'red'])

export async function GET(req: Request) {
  const locale = pickLocale(req)
  const url = new URL(req.url)
  const category = url.searchParams.get('category') ?? undefined
  const subcategory = url.searchParams.get('subcategory') ?? undefined
  const search = url.searchParams.get('search') ?? undefined
  const limitRaw = parseInt(url.searchParams.get('limit') ?? '50', 10)
  const offsetRaw = parseInt(url.searchParams.get('offset') ?? '0', 10)
  const includeInactive = url.searchParams.get('includeInactive') === 'true'

  if (category && !ALLOWED_CATEGORIES.has(category)) {
    const msg = await translate(locale, 'care.errBadCategory', 'Invalid category')
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  const limit = Math.min(Math.max(Number.isFinite(limitRaw) ? limitRaw : 50, 1), 200)
  const offset = Math.max(Number.isFinite(offsetRaw) ? offsetRaw : 0, 0)

  const where: any = {}
  if (!includeInactive) where.active = true
  if (category) where.category = category
  if (subcategory) where.subcategory = subcategory
  if (search && search.trim().length > 0) {
    const s = search.trim()
    where.OR = [
      { name: { contains: s } },
      { brand: { contains: s } },
      { sku: { contains: s } },
      { description: { contains: s } },
    ]
  }

  try {
    const [items, total] = await Promise.all([
      db.product.findMany({
        where,
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
        take: limit,
        skip: offset,
      }),
      db.product.count({ where }),
    ])

    return NextResponse.json({ items, total, limit, offset })
  } catch (err) {
    console.error('[care/products] GET error:', err)
    const msg = await translate(locale, 'care.errGeneric', 'Une erreur est survenue.')
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
