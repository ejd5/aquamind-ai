import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { pickLocale, translate } from '@/lib/i18n-api'
import { getProAccess, type ProAccess } from '@/lib/pro/access'
import {
  proClientAccessWhere,
  proNestedInterventionWhere,
} from '@/lib/pro/intervention-scope'
import {
  cleanOptionalText,
  isOneOf,
  parseOptionalDate,
  parseStoredStringArray,
  PRO_CLIENT_STATUSES,
  PRO_CONTACT_CHANNELS,
  serializeShortStringArray,
} from '@/lib/pro/crm'
import { toolWorkspaceText } from '@/i18n/locales/tool-workspaces'

export const runtime = 'nodejs'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
type Ctx = { params: Promise<{ id: string }> }

async function getAccessibleClient(id: string, access: ProAccess, actorUserId: string) {
  return db.proClient.findFirst({
    where: { id, ...proClientAccessWhere(access, actorUserId) },
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
  const access = await getProAccess(session.user.id)
  const interventionWhere = proNestedInterventionWhere(access, session.user.id)
  const assignedPoolWhere = interventionWhere
    ? { interventions: { some: interventionWhere } }
    : undefined
  const client = await db.proClient.findFirst({
    where: { id, ...proClientAccessWhere(access, session.user.id) },
    include: {
      pools: {
        where: assignedPoolWhere,
        orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
        include: {
          _count: {
            select: {
              interventions: interventionWhere ? { where: interventionWhere } : true,
              waterTests: true,
            },
          },
        },
      },
      interventions: {
        where: interventionWhere,
        orderBy: { scheduledAt: 'desc' },
        take: 20,
        include: { pool: { select: { id: true, name: true } } },
      },
      activities: {
        orderBy: { occurredAt: 'desc' },
        take: 50,
      },
      _count: {
        select: {
          pools: assignedPoolWhere ? { where: assignedPoolWhere } : true,
          interventions: interventionWhere ? { where: interventionWhere } : true,
          activities: true,
        },
      },
    },
  })

  if (!client) {
    const msg = await translate(locale, 'common.errors.notFound', 'Non trouvé')
    return NextResponse.json({ error: msg }, { status: 404 })
  }

  return NextResponse.json({
    client: { ...client, tags: parseStoredStringArray(client.tags) },
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

  const existing = await getAccessibleClient(id, access, session.user.id)
  if (!existing) {
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
  if (typeof body.firstName === 'string' && body.firstName.trim()) {
    data.firstName = body.firstName.trim().slice(0, 120)
  }
  if (typeof body.lastName === 'string' && body.lastName.trim()) {
    data.lastName = body.lastName.trim().slice(0, 120)
  }
  if (body.companyName !== undefined) data.companyName = cleanOptionalText(body.companyName, 200)
  if (body.email !== undefined) {
    const email = cleanOptionalText(body.email, 320)?.toLowerCase() ?? null
    if (email && !EMAIL_RE.test(email)) {
      const msg = await translate(locale, 'pro.errors.emailInvalid', 'Email invalide')
      return NextResponse.json({ error: msg }, { status: 400 })
    }
    data.email = email
  }
  if (body.phone !== undefined) data.phone = cleanOptionalText(body.phone, 80)
  if (body.address !== undefined) data.address = cleanOptionalText(body.address, 500)
  if (body.city !== undefined) data.city = cleanOptionalText(body.city, 160)
  if (body.zipCode !== undefined) data.zipCode = cleanOptionalText(body.zipCode, 30)
  if (body.source !== undefined) data.source = cleanOptionalText(body.source, 120)
  if (body.notes !== undefined) data.notes = cleanOptionalText(body.notes)
  if (body.tags !== undefined) data.tags = serializeShortStringArray(body.tags)
  if (body.status !== undefined) {
    if (!isOneOf(PRO_CLIENT_STATUSES, body.status)) {
      return NextResponse.json({ error: 'Invalid client status' }, { status: 400 })
    }
    data.status = body.status
  }
  if (body.preferredContact !== undefined) {
    if (!isOneOf(PRO_CONTACT_CHANNELS, body.preferredContact)) {
      return NextResponse.json({ error: 'Invalid contact channel' }, { status: 400 })
    }
    data.preferredContact = body.preferredContact
  }

  for (const field of ['lastContactAt', 'nextFollowUpAt'] as const) {
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
    const client = await db.$transaction(async (tx) => {
      const updated = await tx.proClient.update({ where: { id }, data })
      if (typeof data.status === 'string' && data.status !== existing.status) {
        await tx.proClientActivity.create({
          data: {
            proClientId: id,
            actorUserId: session.user.id,
            type: 'status_change',
            title: `crm.status_change:${existing.status}:${data.status}`,
          },
        })
      }
      return updated
    })
    return NextResponse.json({ client: { ...client, tags: parseStoredStringArray(client.tags) } })
  } catch (error) {
    console.error('[pro/clients/[id]] PATCH error:', error)
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

  const existing = await getAccessibleClient(id, access, session.user.id)
  if (!existing) {
    const msg = await translate(locale, 'common.errors.notFound', 'Non trouvé')
    return NextResponse.json({ error: msg }, { status: 404 })
  }

  try {
    await db.proClient.delete({ where: { id } })
    return NextResponse.json({ ok: true, id })
  } catch (error) {
    console.error('[pro/clients/[id]] DELETE error:', error)
    const msg = await translate(locale, 'pro.errors.generic', 'Une erreur est survenue.')
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
