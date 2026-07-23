import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { pickLocale, translate } from '@/lib/i18n-api'
import { getProAccess } from '@/lib/pro/access'
import {
  cleanOptionalText,
  isOneOf,
  parseOptionalDate,
  PRO_POOL_STATUSES,
} from '@/lib/pro/crm'
import { toolWorkspaceText } from '@/i18n/locales/tool-workspaces'

export const runtime = 'nodejs'

const ALLOWED_TYPES = ['pool', 'spa', 'both'] as const
type Ctx = { params: Promise<{ id: string }> }

async function getOwnedPool(id: string, ownerUserId: string) {
  return db.proPool.findFirst({
    where: { id, client: { proUserId: ownerUserId } },
    select: { id: true },
  })
}

export async function GET(req: NextRequest, ctx: Ctx) {
  const locale = pickLocale(req)
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    const msg = await translate(locale, 'common.errors.unauthorized', 'Non autorisé')
    return NextResponse.json({ error: msg }, { status: 401 })
  }

  const { id } = await ctx.params
  const access = await getProAccess(session.user.id)
  const owned = await getOwnedPool(id, access.ownerUserId)
  if (!owned) {
    const msg = await translate(locale, 'common.errors.notFound', 'Non trouvé')
    return NextResponse.json({ error: msg }, { status: 404 })
  }

  const pool = await db.proPool.findUnique({
    where: { id },
    include: {
      client: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          companyName: true,
          phone: true,
          email: true,
          address: true,
          city: true,
          zipCode: true,
        },
      },
      waterTests: { orderBy: { testedAt: 'desc' }, take: 30 },
      interventions: {
        orderBy: { scheduledAt: 'desc' },
        take: 30,
        select: {
          id: true,
          type: true,
          status: true,
          priority: true,
          scheduledAt: true,
          startedAt: true,
          completedAt: true,
          duration: true,
          technicianId: true,
          amount: true,
          currency: true,
        },
      },
      _count: { select: { waterTests: true, interventions: true } },
    },
  })
  return NextResponse.json({
    pool,
    access: { role: access.role, canWrite: access.canWrite, canManage: access.canManage },
  })
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const locale = pickLocale(req)
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    const msg = await translate(locale, 'common.errors.unauthorized', 'Non autorisé')
    return NextResponse.json({ error: msg }, { status: 401 })
  }

  const { id } = await ctx.params
  const access = await getProAccess(session.user.id)
  if (!access.canWrite) {
    return NextResponse.json({ error: toolWorkspaceText(locale, 'readonly') }, { status: 403 })
  }

  const owned = await getOwnedPool(id, access.ownerUserId)
  if (!owned) {
    const msg = await translate(locale, 'common.errors.notFound', 'Non trouvé')
    return NextResponse.json({ error: msg }, { status: 404 })
  }

  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const data: Record<string, unknown> = {}
  if (typeof body.name === 'string' && body.name.trim()) data.name = body.name.trim().slice(0, 200)
  if (body.type !== undefined) {
    if (!isOneOf(ALLOWED_TYPES, body.type)) {
      return NextResponse.json({ error: 'Invalid pool type' }, { status: 400 })
    }
    data.type = body.type
  }
  if (body.status !== undefined) {
    if (!isOneOf(PRO_POOL_STATUSES, body.status)) {
      return NextResponse.json({ error: 'Invalid pool status' }, { status: 400 })
    }
    data.status = body.status
  }
  if (body.volume !== undefined) {
    if (body.volume === null || body.volume === '') data.volume = null
    else if (Number.isFinite(Number(body.volume)) && Number(body.volume) >= 0) data.volume = Number(body.volume)
    else return NextResponse.json({ error: 'Invalid pool volume' }, { status: 400 })
  }
  if (body.unit === 'gal' || body.unit === 'm3') data.unit = body.unit
  if (body.saltSystem !== undefined && typeof body.saltSystem === 'boolean') {
    data.saltSystem = body.saltSystem
  }

  for (const field of [
    'shape',
    'surface',
    'treatmentType',
    'filterType',
    'brand',
    'model',
    'serialNumber',
    'address',
    'accessInstructions',
    'equipmentNotes',
    'notes',
  ] as const) {
    if (body[field] !== undefined) data[field] = cleanOptionalText(body[field])
  }

  for (const field of ['installedAt', 'lastServiceAt', 'nextServiceAt'] as const) {
    const parsed = parseOptionalDate(body[field])
    if (!parsed.provided) continue
    if (!parsed.valid) return NextResponse.json({ error: `Invalid ${field}` }, { status: 400 })
    data[field] = parsed.value
  }

  if (Object.keys(data).length === 0) {
    const msg = await translate(locale, 'common.errors.noFields', 'Aucun champ à mettre à jour')
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  try {
    const pool = await db.proPool.update({ where: { id }, data })
    return NextResponse.json({ pool })
  } catch (error) {
    console.error('[pro/pools/[id]] PATCH error:', error)
    const msg = await translate(locale, 'pro.errors.generic', 'Une erreur est survenue.')
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const locale = pickLocale(req)
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    const msg = await translate(locale, 'common.errors.unauthorized', 'Non autorisé')
    return NextResponse.json({ error: msg }, { status: 401 })
  }

  const { id } = await ctx.params
  const access = await getProAccess(session.user.id)
  if (!access.canManage) {
    return NextResponse.json({ error: 'Droits insuffisants' }, { status: 403 })
  }

  const owned = await getOwnedPool(id, access.ownerUserId)
  if (!owned) {
    const msg = await translate(locale, 'common.errors.notFound', 'Non trouvé')
    return NextResponse.json({ error: msg }, { status: 404 })
  }

  try {
    await db.proPool.delete({ where: { id } })
    return NextResponse.json({ ok: true, id })
  } catch (error) {
    console.error('[pro/pools/[id]] DELETE error:', error)
    const msg = await translate(locale, 'pro.errors.generic', 'Une erreur est survenue.')
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
