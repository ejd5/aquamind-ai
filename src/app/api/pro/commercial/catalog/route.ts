import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { getProAccess } from '@/lib/pro/access'
import { pickLocale, translate } from '@/lib/i18n-api'

export const runtime = 'nodejs'

const CATALOG_KINDS = ['service', 'product', 'fee'] as const
type CatalogKind = (typeof CATALOG_KINDS)[number]

interface CatalogMetadata {
  version: 'pro-catalog-v1'
  description: string | null
  taxRate: number
}

function text(value: unknown, maximum: number): string {
  return typeof value === 'string' ? value.trim().slice(0, maximum) : ''
}

function numberOrNull(value: unknown): number | null {
  if (value === '' || value === null || value === undefined) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function kind(value: unknown): CatalogKind {
  return typeof value === 'string' && CATALOG_KINDS.includes(value as CatalogKind)
    ? value as CatalogKind
    : 'service'
}

function metadata(value: string | null): CatalogMetadata {
  try {
    const parsed = value ? JSON.parse(value) : null
    if (parsed?.version === 'pro-catalog-v1') {
      return {
        version: 'pro-catalog-v1',
        description: typeof parsed.description === 'string' ? parsed.description : null,
        taxRate: Number.isFinite(Number(parsed.taxRate)) ? Number(parsed.taxRate) : 20,
      }
    }
  } catch {}
  return { version: 'pro-catalog-v1', description: value, taxRate: 20 }
}

function serializeMetadata(description: unknown, taxRate: unknown): string {
  const rate = numberOrNull(taxRate) ?? 20
  if (rate < 0 || rate > 100) throw new Error('INVALID_TAX_RATE')
  return JSON.stringify({
    version: 'pro-catalog-v1',
    description: text(description, 2_000) || null,
    taxRate: Math.round(rate * 100) / 100,
  } satisfies CatalogMetadata)
}

function present(item: {
  id: string
  productName: string
  category: string
  quantity: number
  unit: string
  price: number | null
  instructions: string | null
  createdAt: Date
}) {
  const meta = metadata(item.instructions)
  return {
    id: item.id,
    name: item.productName,
    kind: item.category.startsWith('pro_') ? item.category.slice(4) : 'product',
    description: meta.description,
    unit: item.unit,
    unitPrice: item.price ?? 0,
    taxRate: meta.taxRate,
    stockQuantity: item.quantity,
    active: true,
    createdAt: item.createdAt,
  }
}

async function requireAccess(req: NextRequest) {
  const locale = pickLocale(req)
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    const msg = await translate(locale, 'common.errors.unauthorized', 'Non autorisé')
    return { response: NextResponse.json({ error: msg }, { status: 401 }) } as const
  }
  const access = await getProAccess(session.user.id)
  if (!access.canManage) {
    return { response: NextResponse.json({ error: 'Commercial management access required' }, { status: 403 }) } as const
  }
  return { access, userId: session.user.id } as const
}

export async function GET(req: NextRequest) {
  const auth = await requireAccess(req)
  if ('response' in auth) return auth.response

  const url = new URL(req.url)
  const q = text(url.searchParams.get('q'), 120)
  const requestedKind = url.searchParams.get('kind')
  const category = requestedKind && CATALOG_KINDS.includes(requestedKind as CatalogKind)
    ? `pro_${requestedKind}`
    : undefined

  const items = await db.productInventory.findMany({
    where: {
      userId: auth.access.ownerUserId,
      ...(category ? { category } : { category: { startsWith: 'pro_' } }),
      ...(q ? { productName: { contains: q } } : {}),
    },
    orderBy: { productName: 'asc' },
    take: 500,
  })

  return NextResponse.json({ items: items.map(present) })
}

export async function POST(req: NextRequest) {
  const auth = await requireAccess(req)
  if ('response' in auth) return auth.response

  let body: Record<string, unknown>
  try {
    body = await req.json() as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const name = text(body.name, 240)
  const unitPrice = numberOrNull(body.unitPrice)
  const stockQuantity = numberOrNull(body.stockQuantity) ?? 0
  const itemKind = kind(body.kind)
  const unit = text(body.unit, 40) || (itemKind === 'service' ? 'visit' : 'unit')

  if (!name) return NextResponse.json({ error: 'Catalog item name is required' }, { status: 400 })
  if (unitPrice === null || unitPrice < 0 || unitPrice > 100_000_000) {
    return NextResponse.json({ error: 'Invalid unit price' }, { status: 400 })
  }
  if (stockQuantity < 0 || stockQuantity > 1_000_000_000) {
    return NextResponse.json({ error: 'Invalid stock quantity' }, { status: 400 })
  }

  try {
    const created = await db.productInventory.create({
      data: {
        userId: auth.access.ownerUserId,
        productName: name,
        category: `pro_${itemKind}`,
        concentration: null,
        quantity: stockQuantity,
        unit,
        price: Math.round(unitPrice * 100) / 100,
        instructions: serializeMetadata(body.description, body.taxRate),
      },
    })
    return NextResponse.json({ item: present(created) }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'INVALID_TAX_RATE') {
      return NextResponse.json({ error: 'Invalid tax rate' }, { status: 400 })
    }
    console.error('[pro/commercial/catalog] POST error:', error)
    return NextResponse.json({ error: 'Unable to create catalog item' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAccess(req)
  if ('response' in auth) return auth.response

  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const existing = await db.productInventory.findFirst({
    where: { id, userId: auth.access.ownerUserId, category: { startsWith: 'pro_' } },
  })
  if (!existing) return NextResponse.json({ error: 'Catalog item not found' }, { status: 404 })

  let body: Record<string, unknown>
  try {
    body = await req.json() as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const data: Record<string, unknown> = {}
  if (body.name !== undefined) {
    const name = text(body.name, 240)
    if (!name) return NextResponse.json({ error: 'Catalog item name is required' }, { status: 400 })
    data.productName = name
  }
  if (body.kind !== undefined) data.category = `pro_${kind(body.kind)}`
  if (body.unit !== undefined) data.unit = text(body.unit, 40) || 'unit'
  if (body.unitPrice !== undefined) {
    const price = numberOrNull(body.unitPrice)
    if (price === null || price < 0 || price > 100_000_000) {
      return NextResponse.json({ error: 'Invalid unit price' }, { status: 400 })
    }
    data.price = Math.round(price * 100) / 100
  }
  if (body.stockQuantity !== undefined) {
    const quantity = numberOrNull(body.stockQuantity)
    if (quantity === null || quantity < 0 || quantity > 1_000_000_000) {
      return NextResponse.json({ error: 'Invalid stock quantity' }, { status: 400 })
    }
    data.quantity = quantity
  }
  if (body.description !== undefined || body.taxRate !== undefined) {
    const current = metadata(existing.instructions)
    try {
      data.instructions = serializeMetadata(
        body.description !== undefined ? body.description : current.description,
        body.taxRate !== undefined ? body.taxRate : current.taxRate,
      )
    } catch {
      return NextResponse.json({ error: 'Invalid tax rate' }, { status: 400 })
    }
  }

  const updated = await db.productInventory.update({ where: { id }, data })
  return NextResponse.json({ item: present(updated) })
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAccess(req)
  if ('response' in auth) return auth.response

  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const existing = await db.productInventory.findFirst({
    where: { id, userId: auth.access.ownerUserId, category: { startsWith: 'pro_' } },
    select: { id: true },
  })
  if (!existing) return NextResponse.json({ error: 'Catalog item not found' }, { status: 404 })
  await db.productInventory.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
