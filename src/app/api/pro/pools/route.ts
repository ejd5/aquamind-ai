/**
 * AQWELIA Pro — Pools API (MVP).
 *
 * URL: /api/pro/pools
 *
 * POST — create a new pool (ProPool) for a given client. The client must
 *        belong to the authenticated pro (`proUserId = session.user.id`).
 *
 * Note: listing a pro's pools is done via /api/pro/clients/[id] (the
 * detail endpoint includes `pools`). A flat list could be added later.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { pickLocale, translate } from '@/lib/i18n-api'
import { getProAccess } from '@/lib/pro/access'
import { toolWorkspaceText } from '@/i18n/locales/tool-workspaces'

export const runtime = 'nodejs'

const ALLOWED_TYPES = new Set(['pool', 'spa', 'both'])

export async function GET(req: NextRequest) {
  const locale = pickLocale(req)
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    const msg = await translate(locale, 'common.errors.unauthorized', 'Non autorisé')
    return NextResponse.json({ error: msg }, { status: 401 })
  }

  const url = new URL(req.url)
  const q = (url.searchParams.get('q') || '').trim()
  const type = url.searchParams.get('type')
  const access = await getProAccess(session.user.id)
  const where: any = { client: { proUserId: access.ownerUserId } }
  if (type && ALLOWED_TYPES.has(type)) where.type = type
  if (q) {
    where.OR = [
      { name: { contains: q } },
      { client: { firstName: { contains: q } } },
      { client: { lastName: { contains: q } } },
      { client: { city: { contains: q } } },
    ]
  }

  const pools = await db.proPool.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    take: 200,
    include: {
      client: {
        select: { id: true, firstName: true, lastName: true, city: true },
      },
      waterTests: { orderBy: { testedAt: 'desc' }, take: 1 },
      _count: { select: { interventions: true, waterTests: true } },
    },
  })

  return NextResponse.json({ pools, total: pools.length })
}

export async function POST(req: NextRequest) {
  const locale = pickLocale(req)
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    const msg = await translate(locale, 'common.errors.unauthorized', 'Non autorisé')
    return NextResponse.json({ error: msg }, { status: 401 })
  }
  const access = await getProAccess(session.user.id)
  if (!access.canWrite) return NextResponse.json({ error: toolWorkspaceText(locale, 'readonly') }, { status: 403 })

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const proClientId =
    typeof body?.proClientId === 'string' ? body.proClientId : ''
  if (!proClientId) {
    const msg = await translate(
      locale,
      'pro.errors.clientIdRequired',
      'Client requis'
    )
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  // Verify the client belongs to the authenticated pro.
  const client = await db.proClient.findFirst({
    where: { id: proClientId, proUserId: access.ownerUserId },
    select: { id: true },
  })
  if (!client) {
    const msg = await translate(locale, 'common.errors.notFound', 'Non trouvé')
    return NextResponse.json({ error: msg }, { status: 404 })
  }

  const name =
    typeof body?.name === 'string' && body.name.trim() ? body.name.trim() : ''
  if (!name) {
    const msg = await translate(locale, 'pro.errors.poolNameRequired', 'Nom du bassin requis')
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  const type =
    typeof body?.type === 'string' && ALLOWED_TYPES.has(body.type)
      ? body.type
      : 'pool'
  const volume =
    body?.volume != null && Number.isFinite(Number(body.volume))
      ? Number(body.volume)
      : null
  const unit = body?.unit === 'gal' ? 'gal' : 'm3'
  const shape =
    typeof body?.shape === 'string' && body.shape.trim() ? body.shape.trim() : null
  const surface =
    typeof body?.surface === 'string' && body.surface.trim()
      ? body.surface.trim()
      : null
  const treatmentType =
    typeof body?.treatmentType === 'string' && body.treatmentType.trim()
      ? body.treatmentType.trim()
      : null
  const filterType =
    typeof body?.filterType === 'string' && body.filterType.trim()
      ? body.filterType.trim()
      : null
  const address =
    typeof body?.address === 'string' && body.address.trim()
      ? body.address.trim()
      : null
  const notes =
    typeof body?.notes === 'string' && body.notes.trim()
      ? body.notes.trim().slice(0, 10000)
      : null

  try {
    const pool = await db.proPool.create({
      data: {
        proClientId,
        name,
        type,
        volume,
        unit,
        shape,
        surface,
        treatmentType,
        saltSystem: !!body?.saltSystem,
        filterType,
        address,
        notes,
      },
    })
    return NextResponse.json({ pool }, { status: 201 })
  } catch (err) {
    console.error('[pro/pools] POST error:', err)
    const msg = await translate(locale, 'pro.errors.generic', 'Une erreur est survenue.')
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
