import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { pickLocale, translate } from '@/lib/i18n-api'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    const locale = pickLocale(req)
    const msg = await translate(locale, 'common.errors.unauthorized', 'Non autorisé')
    return NextResponse.json({ error: msg }, { status: 401 })
  }
  const userId = session.user.id

  const products = await db.productInventory.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } })
  return NextResponse.json({ products })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    const locale = pickLocale(req)
    const msg = await translate(locale, 'common.errors.unauthorized', 'Non autorisé')
    return NextResponse.json({ error: msg }, { status: 401 })
  }
  const userId = session.user.id

  try {
    const body = await req.json()
    const p = await db.productInventory.create({
      data: {
        userId,
        productName: body.productName,
        category: body.category || 'other',
        concentration: numOrNull(body.concentration),
        quantity: Number(body.quantity) || 0,
        unit: body.unit || 'kg',
        price: numOrNull(body.price),
        instructions: body.instructions || null,
      },
    })
    return NextResponse.json({ product: p })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    const locale = pickLocale(req)
    const msg = await translate(locale, 'common.errors.unauthorized', 'Non autorisé')
    return NextResponse.json({ error: msg }, { status: 401 })
  }
  const userId = session.user.id

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (id) {
    // Only delete if it belongs to the authenticated user
    const existing = await db.productInventory.findFirst({ where: { id, userId } })
    if (existing) {
      await db.productInventory.delete({ where: { id } })
    }
  }
  return NextResponse.json({ success: true })
}

function numOrNull(v: any): number | null {
  if (v === '' || v === null || v === undefined) return null
  const n = Number(v)
  return isNaN(n) ? null : n
}
