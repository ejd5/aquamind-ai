/**
 * AQWELIA Pro — Pool detail API (MVP).
 *
 * URL: /api/pro/pools/[id]
 *
 * GET    — pool record + recent water tests (20) + recent interventions
 *          (20) + client summary (id, firstName, lastName).
 * PATCH  — update pool fields (name, type, volume, unit, shape, surface,
 *          treatmentType, saltSystem, filterType, address, notes).
 * DELETE — remove the pool. ProWaterTest cascade-deleted; ProIntervention
 *          rows are kept but their `proPoolId` is set to NULL (SetNull).
 *
 * Auth: session required. Every op verifies `pool.client.proUserId ===
 * session.user.id` (404 otherwise).
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { pickLocale, translate } from '@/lib/i18n-api'
import { getProAccess } from '@/lib/pro/access'

export const runtime = 'nodejs'

const ALLOWED_TYPES = new Set(['pool', 'spa', 'both'])

type Ctx = { params: Promise<{ id: string }> }

async function getOwnedPool(id: string, userId: string) {
  // Single source of truth for the "this pool belongs to the pro" check.
  // Returns the pool id-only record or null. (We don't `include` heavy
  // relations here — callers do their own selective include based on verb.)
  return db.proPool.findFirst({
    where: { id, client: { proUserId: userId } },
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
        select: { id: true, firstName: true, lastName: true, phone: true, email: true },
      },
      waterTests: {
        orderBy: { testedAt: 'desc' },
        take: 20,
      },
      interventions: {
        orderBy: { scheduledAt: 'desc' },
        take: 20,
        select: {
          id: true,
          type: true,
          status: true,
          scheduledAt: true,
          completedAt: true,
          duration: true,
          technicianId: true,
        },
      },
      _count: { select: { waterTests: true, interventions: true } },
    },
  })
  return NextResponse.json({ pool })
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
  if (!access.canWrite) return NextResponse.json({ error: 'Accès en lecture seule' }, { status: 403 })

  const owned = await getOwnedPool(id, access.ownerUserId)
  if (!owned) {
    const msg = await translate(locale, 'common.errors.notFound', 'Non trouvé')
    return NextResponse.json({ error: msg }, { status: 404 })
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const data: Record<string, unknown> = {}
  if (typeof body?.name === 'string' && body.name.trim())
    data.name = body.name.trim()
  if (typeof body?.type === 'string' && ALLOWED_TYPES.has(body.type))
    data.type = body.type
  if (body?.volume != null && Number.isFinite(Number(body.volume)))
    data.volume = Number(body.volume)
  if (body?.unit === 'gal' || body?.unit === 'm3') data.unit = body.unit
  if (typeof body?.shape === 'string') data.shape = body.shape.trim() || null
  if (typeof body?.surface === 'string') data.surface = body.surface.trim() || null
  if (typeof body?.treatmentType === 'string')
    data.treatmentType = body.treatmentType.trim() || null
  if (typeof body?.saltSystem === 'boolean') data.saltSystem = body.saltSystem
  if (typeof body?.filterType === 'string')
    data.filterType = body.filterType.trim() || null
  if (typeof body?.address === 'string') data.address = body.address.trim() || null
  if (typeof body?.notes === 'string')
    data.notes = body.notes.trim().slice(0, 10000) || null

  if (Object.keys(data).length === 0) {
    const msg = await translate(
      locale,
      'common.errors.noFields',
      'Aucun champ à mettre à jour'
    )
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  try {
    const pool = await db.proPool.update({ where: { id }, data })
    return NextResponse.json({ pool })
  } catch (err) {
    console.error('[pro/pools/[id]] PATCH error:', err)
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
  if (!access.canManage) return NextResponse.json({ error: 'Droits insuffisants' }, { status: 403 })

  const owned = await getOwnedPool(id, access.ownerUserId)
  if (!owned) {
    const msg = await translate(locale, 'common.errors.notFound', 'Non trouvé')
    return NextResponse.json({ error: msg }, { status: 404 })
  }

  try {
    // Cascade: ProWaterTest is cascade-deleted; ProIntervention.proPoolId
    // is SetNull so the intervention record (and its history) is preserved.
    await db.proPool.delete({ where: { id } })
    return NextResponse.json({ ok: true, id })
  } catch (err) {
    console.error('[pro/pools/[id]] DELETE error:', err)
    const msg = await translate(locale, 'pro.errors.generic', 'Une erreur est survenue.')
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
