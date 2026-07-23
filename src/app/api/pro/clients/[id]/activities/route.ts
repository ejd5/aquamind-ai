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
  PRO_ACTIVITY_TYPES,
} from '@/lib/pro/crm'
import { toolWorkspaceText } from '@/i18n/locales/tool-workspaces'

export const runtime = 'nodejs'

type Ctx = { params: Promise<{ id: string }> }
const CONTACT_ACTIVITY_TYPES = new Set(['call', 'email', 'sms', 'visit'])
const USER_ACTIVITY_TYPES = ['note', 'call', 'email', 'sms', 'visit', 'follow_up'] as const

async function getOwnedClient(id: string, ownerUserId: string) {
  return db.proClient.findFirst({
    where: { id, proUserId: ownerUserId },
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
  const owned = await getOwnedClient(id, access.ownerUserId)
  if (!owned) {
    const msg = await translate(locale, 'common.errors.notFound', 'Non trouvé')
    return NextResponse.json({ error: msg }, { status: 404 })
  }

  const url = new URL(req.url)
  const requestedLimit = Number(url.searchParams.get('limit'))
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(100, Math.max(1, Math.round(requestedLimit)))
    : 50

  const activities = await db.proClientActivity.findMany({
    where: { proClientId: id },
    orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }],
    take: limit,
  })
  return NextResponse.json({ activities })
}

export async function POST(req: NextRequest, ctx: Ctx) {
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

  const owned = await getOwnedClient(id, access.ownerUserId)
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

  const type = isOneOf(USER_ACTIVITY_TYPES, body.type) ? body.type : 'note'
  const title = cleanOptionalText(body.title, 200)
  const occurredAt = parseOptionalDate(body.occurredAt)
  const nextFollowUpAt = parseOptionalDate(body.nextFollowUpAt)

  if (!title) return NextResponse.json({ error: 'Activity title is required' }, { status: 400 })
  if (!occurredAt.valid || !nextFollowUpAt.valid) {
    return NextResponse.json({ error: 'Invalid activity date' }, { status: 400 })
  }
  if (!isOneOf(PRO_ACTIVITY_TYPES, type)) {
    return NextResponse.json({ error: 'Invalid activity type' }, { status: 400 })
  }

  const activityDate = occurredAt.value ?? new Date()
  try {
    const activity = await db.$transaction(async (tx) => {
      const created = await tx.proClientActivity.create({
        data: {
          proClientId: id,
          actorUserId: session.user.id,
          type,
          title,
          details: cleanOptionalText(body.details),
          occurredAt: activityDate,
        },
      })

      const clientUpdate: { lastContactAt?: Date; nextFollowUpAt?: Date | null } = {}
      if (CONTACT_ACTIVITY_TYPES.has(type)) clientUpdate.lastContactAt = activityDate
      if (nextFollowUpAt.provided) clientUpdate.nextFollowUpAt = nextFollowUpAt.value
      if (Object.keys(clientUpdate).length > 0) {
        await tx.proClient.update({ where: { id }, data: clientUpdate })
      }
      return created
    })
    return NextResponse.json({ activity }, { status: 201 })
  } catch (error) {
    console.error('[pro/clients/[id]/activities] POST error:', error)
    const msg = await translate(locale, 'pro.errors.generic', 'Une erreur est survenue.')
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
