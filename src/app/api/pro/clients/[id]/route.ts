/**
 * AQWELIA Pro — Client detail API (MVP).
 *
 * URL: /api/pro/clients/[id]
 *
 * GET    — full client record + their pools (each with `_count` of
 *          interventions and waterTests) + recent interventions.
 * PATCH  — update client fields (firstName, lastName, email, phone,
 *          address, city, zipCode, notes).
 * DELETE — remove the client (cascade: pools → waterTests, and
 *          interventions are owned directly by the client so they're
 *          cascade-deleted too).
 *
 * Auth: session required. Every operation verifies that the client's
 * `proUserId` matches `session.user.id` (404 otherwise, never leaks
 * existence to other pros).
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { pickLocale, translate } from '@/lib/i18n-api'
import { getProAccess } from '@/lib/pro/access'
import { toolWorkspaceText } from '@/i18n/locales/tool-workspaces'

export const runtime = 'nodejs'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type Ctx = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, ctx: Ctx) {
  const locale = pickLocale(req)
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    const msg = await translate(locale, 'common.errors.unauthorized', 'Non autorisé')
    return NextResponse.json({ error: msg }, { status: 401 })
  }
  const { id } = await ctx.params
  const access = await getProAccess(session.user.id)

  const client = await db.proClient.findFirst({
    where: { id, proUserId: access.ownerUserId },
    include: {
      pools: {
        orderBy: { createdAt: 'asc' },
        include: { _count: { select: { interventions: true, waterTests: true } } },
      },
      interventions: {
        orderBy: { scheduledAt: 'desc' },
        take: 10,
        include: { pool: { select: { id: true, name: true } } },
      },
      _count: { select: { pools: true, interventions: true } },
    },
  })
  if (!client) {
    const msg = await translate(locale, 'common.errors.notFound', 'Non trouvé')
    return NextResponse.json({ error: msg }, { status: 404 })
  }
  return NextResponse.json({ client })
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
  if (!access.canWrite) return NextResponse.json({ error: toolWorkspaceText(locale, 'readonly') }, { status: 403 })

  // Verify ownership before any write.
  const existing = await db.proClient.findFirst({
    where: { id, proUserId: access.ownerUserId },
    select: { id: true },
  })
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
  if (typeof body?.firstName === 'string' && body.firstName.trim())
    data.firstName = body.firstName.trim()
  if (typeof body?.lastName === 'string' && body.lastName.trim())
    data.lastName = body.lastName.trim()
  if (typeof body?.email === 'string') {
    const email = body.email.trim().toLowerCase()
    if (email && !EMAIL_RE.test(email)) {
      const msg = await translate(locale, 'pro.errors.emailInvalid', 'Email invalide')
      return NextResponse.json({ error: msg }, { status: 400 })
    }
    data.email = email || null
  }
  if (typeof body?.phone === 'string') data.phone = body.phone.trim() || null
  if (typeof body?.address === 'string') data.address = body.address.trim() || null
  if (typeof body?.city === 'string') data.city = body.city.trim() || null
  if (typeof body?.zipCode === 'string') data.zipCode = body.zipCode.trim() || null
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
    const client = await db.proClient.update({ where: { id }, data })
    return NextResponse.json({ client })
  } catch (err) {
    console.error('[pro/clients/[id]] PATCH error:', err)
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

  const existing = await db.proClient.findFirst({
    where: { id, proUserId: access.ownerUserId },
    select: { id: true },
  })
  if (!existing) {
    const msg = await translate(locale, 'common.errors.notFound', 'Non trouvé')
    return NextResponse.json({ error: msg }, { status: 404 })
  }

  try {
    // Cascade: deleting the client cascade-deletes its pools, which in turn
    // cascade-delete ProWaterTest and SetNull ProIntervention.proPoolId
    // (interventions themselves are cascade-deleted from ProClient).
    await db.proClient.delete({ where: { id } })
    return NextResponse.json({ ok: true, id })
  } catch (err) {
    console.error('[pro/clients/[id]] DELETE error:', err)
    const msg = await translate(locale, 'pro.errors.generic', 'Une erreur est survenue.')
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
