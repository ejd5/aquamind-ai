/**
 * AQWELIA Pro — Intervention detail API (MVP).
 *
 * URL: /api/pro/interventions/[id]
 *
 * GET    — intervention record with its client and pool (summary).
 * PATCH  — update status, notes, photos, actions, productsUsed, duration,
 *          completedAt, technicianId, scheduledAt. JSON-array columns
 *          (`photos`, `actions`, `productsUsed`) accept either an array
 *          (server JSON-stringifies it) or a pre-stringified string.
 * DELETE — remove the intervention.
 *
 * Auth: session required. Every op verifies
 * `intervention.client.proUserId === session.user.id` (404 otherwise).
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { pickLocale, translate } from '@/lib/i18n-api'

export const runtime = 'nodejs'

const ALLOWED_TYPES = new Set([
  'maintenance',
  'repair',
  'opening',
  'closing',
  'emergency',
])
const ALLOWED_STATUSES = new Set([
  'scheduled',
  'in_progress',
  'completed',
  'cancelled',
])

type Ctx = { params: Promise<{ id: string }> }

/** Stringify an array field for JSON-string columns. */
function toJsonArray(v: unknown): string | null {
  if (Array.isArray(v)) return JSON.stringify(v)
  if (typeof v === 'string' && v.trim()) return v
  return null
}

async function getOwnedIntervention(id: string, userId: string) {
  return db.proIntervention.findFirst({
    where: { id, client: { proUserId: userId } },
    select: { id: true, status: true },
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

  const owned = await getOwnedIntervention(id, session.user.id)
  if (!owned) {
    const msg = await translate(locale, 'common.errors.notFound', 'Non trouvé')
    return NextResponse.json({ error: msg }, { status: 404 })
  }

  const intervention = await db.proIntervention.findUnique({
    where: { id },
    include: {
      client: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          email: true,
          address: true,
          city: true,
          zipCode: true,
        },
      },
      pool: { select: { id: true, name: true, type: true, address: true } },
    },
  })
  return NextResponse.json({ intervention })
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const locale = pickLocale(req)
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    const msg = await translate(locale, 'common.errors.unauthorized', 'Non autorisé')
    return NextResponse.json({ error: msg }, { status: 401 })
  }
  const { id } = await ctx.params

  const existing = await getOwnedIntervention(id, session.user.id)
  if (!existing) {
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

  if (typeof body?.type === 'string' && ALLOWED_TYPES.has(body.type))
    data.type = body.type
  if (typeof body?.status === 'string' && ALLOWED_STATUSES.has(body.status))
    data.status = body.status
  if (typeof body?.technicianId === 'string')
    data.technicianId = body.technicianId || null
  if (body?.duration != null && Number.isFinite(Number(body.duration)))
    data.duration = Math.max(0, Math.round(Number(body.duration)))
  if (typeof body?.notes === 'string')
    data.notes = body.notes.trim().slice(0, 10000) || null

  // JSON-array columns: accept arrays (preferred) or pre-stringified strings.
  if (body?.photos !== undefined) data.photos = toJsonArray(body.photos)
  if (body?.actions !== undefined) data.actions = toJsonArray(body.actions)
  if (body?.productsUsed !== undefined)
    data.productsUsed = toJsonArray(body.productsUsed)

  // scheduledAt
  if (body?.scheduledAt !== undefined) {
    if (body.scheduledAt === null) {
      // Refuse to clear scheduledAt — it's required by the schema.
      const msg = await translate(
        locale,
        'pro.errors.scheduledAtRequired',
        'Date planifiée requise'
      )
      return NextResponse.json({ error: msg }, { status: 400 })
    }
    const d = new Date(body.scheduledAt)
    if (Number.isNaN(d.getTime())) {
      const msg = await translate(
        locale,
        'pro.errors.scheduledAtInvalid',
        'Date planifiée invalide'
      )
      return NextResponse.json({ error: msg }, { status: 400 })
    }
    data.scheduledAt = d
  }

  // completedAt: explicit value, explicit null to clear, or auto-now when
  // status transitions to 'completed' and no value is provided.
  if (body?.completedAt !== undefined) {
    if (body.completedAt === null) {
      data.completedAt = null
    } else {
      const d = new Date(body.completedAt)
      if (!Number.isNaN(d.getTime())) data.completedAt = d
    }
  } else if (
    typeof body?.status === 'string' &&
    body.status === 'completed' &&
    existing.status !== 'completed'
  ) {
    data.completedAt = new Date()
  }

  // Optional: move to another pool owned by the same client.
  if (typeof body?.proPoolId !== 'undefined') {
    if (body.proPoolId === null) {
      data.proPoolId = null
    } else if (typeof body.proPoolId === 'string' && body.proPoolId) {
      // Verify the pool exists and is reachable from this intervention's client.
      // We have the intervention id; fetch its clientId first.
      const current = await db.proIntervention.findUnique({
        where: { id },
        select: { proClientId: true },
      })
      if (current) {
        const pool = await db.proPool.findFirst({
          where: { id: body.proPoolId, proClientId: current.proClientId },
          select: { id: true },
        })
        if (!pool) {
          const msg = await translate(
            locale,
            'pro.errors.poolNotOwnedByClient',
            'Ce bassin n\'appartient pas à ce client'
          )
          return NextResponse.json({ error: msg }, { status: 400 })
        }
        data.proPoolId = body.proPoolId
      }
    }
  }

  if (Object.keys(data).length === 0) {
    const msg = await translate(
      locale,
      'common.errors.noFields',
      'Aucun champ à mettre à jour'
    )
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  try {
    const intervention = await db.proIntervention.update({
      where: { id },
      data,
    })
    return NextResponse.json({ intervention })
  } catch (err) {
    console.error('[pro/interventions/[id]] PATCH error:', err)
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

  const existing = await getOwnedIntervention(id, session.user.id)
  if (!existing) {
    const msg = await translate(locale, 'common.errors.notFound', 'Non trouvé')
    return NextResponse.json({ error: msg }, { status: 404 })
  }

  try {
    await db.proIntervention.delete({ where: { id } })
    return NextResponse.json({ ok: true, id })
  } catch (err) {
    console.error('[pro/interventions/[id]] DELETE error:', err)
    const msg = await translate(locale, 'pro.errors.generic', 'Une erreur est survenue.')
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
