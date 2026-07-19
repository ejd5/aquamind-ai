/**
 * AQWELIA Pro — Water tests API (MVP).
 *
 * URL: /api/pro/water-tests
 *
 * POST — record a new ProWaterTest for a given pool. The pool must belong
 *        to the authenticated pro (verified via `pool.client.proUserId`).
 *        All chemistry fields are optional; the pro may record only what
 *        they measured. `testedAt` defaults to now; an explicit ISO string
 *        is honoured.
 *
 * Auth: NextAuth session required.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { pickLocale, translate } from '@/lib/i18n-api'
import { getProAccess } from '@/lib/pro/access'
import { toolWorkspaceText } from '@/i18n/locales/tool-workspaces'

export const runtime = 'nodejs'

/** Parse a body value as a Float, returning `null` if missing/invalid. */
function toFloat(v: unknown): number | null {
  if (v == null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

/** Parse a body value as an Int, returning `null` if missing/invalid. */
function toInt(v: unknown): number | null {
  if (v == null || v === '') return null
  const n = Number(v)
  if (!Number.isFinite(n)) return null
  return Math.round(n)
}

export async function GET(req: NextRequest) {
  const locale = pickLocale(req)
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    const msg = await translate(locale, 'common.errors.unauthorized', 'Non autorisé')
    return NextResponse.json({ error: msg }, { status: 401 })
  }

  const url = new URL(req.url)
  const proPoolId = url.searchParams.get('proPoolId')
  const access = await getProAccess(session.user.id)
  const where: any = { pool: { client: { proUserId: access.ownerUserId } } }
  if (proPoolId) where.proPoolId = proPoolId
  const waterTests = await db.proWaterTest.findMany({
    where,
    orderBy: { testedAt: 'desc' },
    take: 200,
    include: {
      pool: {
        select: {
          id: true,
          name: true,
          client: { select: { id: true, firstName: true, lastName: true } },
        },
      },
    },
  })
  return NextResponse.json({ waterTests, total: waterTests.length })
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

  const proPoolId =
    typeof body?.proPoolId === 'string' ? body.proPoolId : ''
  if (!proPoolId) {
    const msg = await translate(
      locale,
      'pro.errors.poolIdRequired',
      'Bassin requis'
    )
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  // Verify the pool belongs to a client owned by the authenticated pro.
  const pool = await db.proPool.findFirst({
    where: { id: proPoolId, client: { proUserId: access.ownerUserId } },
    select: { id: true },
  })
  if (!pool) {
    const msg = await translate(locale, 'common.errors.notFound', 'Non trouvé')
    return NextResponse.json({ error: msg }, { status: 404 })
  }

  // Parse an explicit testedAt (ISO 8601). Falls back to `now` on any error.
  let testedAt: Date = new Date()
  if (typeof body?.testedAt === 'string' && body.testedAt.trim()) {
    const parsed = new Date(body.testedAt)
    if (!Number.isNaN(parsed.getTime())) testedAt = parsed
  }

  const notes =
    typeof body?.notes === 'string' && body.notes.trim()
      ? body.notes.trim().slice(0, 10000)
      : null

  try {
    const waterTest = await db.proWaterTest.create({
      data: {
        proPoolId,
        ph: toFloat(body?.ph),
        freeChlorine: toFloat(body?.freeChlorine),
        totalChlorine: toFloat(body?.totalChlorine),
        combinedChlorine: toFloat(body?.combinedChlorine),
        alkalinity: toFloat(body?.alkalinity),
        calciumHardness: toFloat(body?.calciumHardness),
        cyanuricAcid: toFloat(body?.cyanuricAcid),
        salt: toFloat(body?.salt),
        phosphates: toFloat(body?.phosphates),
        temperature: toFloat(body?.temperature),
        clearWaterIndex: toInt(body?.clearWaterIndex),
        notes,
        testedAt,
      },
    })
    return NextResponse.json({ waterTest }, { status: 201 })
  } catch (err) {
    console.error('[pro/water-tests] POST error:', err)
    const msg = await translate(locale, 'pro.errors.generic', 'Une erreur est survenue.')
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
