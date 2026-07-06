import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

export async function GET() {
  const products = await db.productInventory.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json({ products })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const p = await db.productInventory.create({
      data: {
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
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (id) await db.productInventory.delete({ where: { id } })
  return NextResponse.json({ success: true })
}

function numOrNull(v: any): number | null {
  if (v === '' || v === null || v === undefined) return null
  const n = Number(v)
  return isNaN(n) ? null : n
}
