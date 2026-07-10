/**
 * AQWELIA Care — Single product endpoint.
 *
 * URL: /api/care/products/[id]
 *
 * GET: Public. Returns the product by id or SKU (the `id` segment is matched
 * against both the `id` (cuid) and the `sku` fields — handy for sharing a
 * product URL by its human-readable SKU like `CARE-STRIP-50`).
 *
 * Returns 404 if not found or if the product is inactive AND the caller is
 * not an admin (admin override via ADMIN_EMAILS + session — see
 * /api/care/notify for the same admin pattern).
 */
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { pickLocale, translate } from '@/lib/i18n-api'

export const runtime = 'nodejs'

function getAdminEmails(): Set<string> | null {
  const raw = process.env.ADMIN_EMAILS
  if (!raw) return null
  const set = new Set(
    raw.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)
  )
  return set.size > 0 ? set : null
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const locale = pickLocale(req)
  const { id } = await params

  try {
    const product = await db.product.findFirst({
      where: {
        OR: [{ id }, { sku: id }],
      },
    })

    if (!product) {
      const msg = await translate(locale, 'care.errProductNotFound', 'Produit introuvable.')
      return NextResponse.json({ error: msg }, { status: 404 })
    }

    // Hide inactive products from non-admin callers.
    if (!product.active) {
      const session = await getServerSession(authOptions)
      const adminEmails = getAdminEmails()
      const isAdmin =
        !!session?.user?.email &&
        (!adminEmails || adminEmails.has(session.user.email.toLowerCase()))
      if (!isAdmin) {
        const msg = await translate(
          locale,
          'care.errProductNotAvailable',
          'Produit non disponible.'
        )
        return NextResponse.json({ error: msg }, { status: 404 })
      }
    }

    return NextResponse.json({ product })
  } catch (err) {
    console.error('[care/products/[id]] GET error:', err)
    const msg = await translate(locale, 'care.errGeneric', 'Une erreur est survenue.')
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
