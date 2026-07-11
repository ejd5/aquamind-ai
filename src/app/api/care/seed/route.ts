/**
 * AQWELIA Care — Admin/dev seed endpoint.
 *
 * URL: /api/care/seed
 *
 * POST: Admin-only. Idempotently seeds the Care catalog (categories, products,
 * kits) from `src/lib/pool/care-seed.ts`. Useful for dev environments and for
 * re-syncing after a schema change. Requires ADMIN_EMAILS env var + matching
 * session email.
 */
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { pickLocale, translate } from '@/lib/i18n-api'
import { seedCareDatabase } from '@/lib/pool/care-seed'

export const runtime = 'nodejs'

function getAdminEmails(): Set<string> | null {
  const raw = process.env.ADMIN_EMAILS
  if (!raw) return null
  const set = new Set(
    raw.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)
  )
  return set.size > 0 ? set : null
}

export async function POST(req: Request) {
  const locale = pickLocale(req)
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    const msg = await translate(locale, 'common.errors.unauthorized', 'Non autorisé')
    return NextResponse.json({ error: msg }, { status: 401 })
  }
  const adminEmails = getAdminEmails()
  if (adminEmails && !adminEmails.has(session.user.email.toLowerCase())) {
    const msg = await translate(locale, 'common.errors.unauthorized', 'Non autorisé')
    return NextResponse.json({ error: msg }, { status: 403 })
  }
  if (!adminEmails) {
    // No ADMIN_EMAILS configured — refuse to seed from the network for safety.
    const msg = await translate(
      locale,
      'care.errAdminNotConfigured',
      'ADMIN_EMAILS non configuré.'
    )
    return NextResponse.json({ error: msg }, { status: 403 })
  }

  try {
    await seedCareDatabase(db)
    const [productCount, categoryCount, kitCount] = await Promise.all([
      db.product.count(),
      (db as any).productCategory.count(),
      (db as any).kit.count(),
    ])
    return NextResponse.json({
      ok: true,
      counts: { products: productCount, categories: categoryCount, kits: kitCount },
    })
  } catch (err) {
    console.error('[care/seed] POST error:', err)
    const msg = await translate(locale, 'care.errGeneric', 'Une erreur est survenue.')
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
