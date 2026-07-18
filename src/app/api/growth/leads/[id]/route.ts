/**
 * AQWELIA Growth OS — Lead detail API.
 *
 * URL: /api/growth/leads/[id]
 *
 * GET   — full lead record + timeline (events) + appointments + quotes +
 *         recent agent runs.
 * PATCH — update lead status (NEW | QUALIFIED | SCORED | ASSIGNED | CONTACTED |
 *         APPOINTMENT | QUOTED | WON | LOST), assignee, score, notes.
 *
 * Auth: NextAuth session required. Verifies that the lead's `organizationId`
 * matches the user's primary organization (404 otherwise, never leaks).
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { pickLocale, translate } from '@/lib/i18n-api'
import { toolWorkspaceText } from '@/i18n/locales/tool-workspaces'

export const runtime = 'nodejs'

type Ctx = { params: Promise<{ id: string }> }

const VALID_STATUSES = [
  'NEW',
  'QUALIFIED',
  'SCORED',
  'ASSIGNED',
  'CONTACTED',
  'APPOINTMENT',
  'QUOTED',
  'WON',
  'LOST',
]

async function getUserOrganization(userId: string) {
  const owned = await db.organization.findFirst({
    where: { ownerId: userId },
    orderBy: { createdAt: 'asc' },
  })
  if (owned) return owned
  const membership = await db.organizationMember.findFirst({
    where: { userId, status: 'active' },
    orderBy: { createdAt: 'asc' },
    include: { organization: true },
  })
  return membership?.organization ?? null
}

export async function GET(req: NextRequest, ctx: Ctx) {
  const locale = pickLocale(req)
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    const msg = await translate(locale, 'common.errors.unauthorized', 'Non autorisé')
    return NextResponse.json({ error: msg }, { status: 401 })
  }

  const { id } = await ctx.params
  const org = await getUserOrganization(session.user.id)
  if (!org) {
    const msg = await translate(locale, 'common.errors.notFound', 'Non trouvé')
    return NextResponse.json({ error: msg }, { status: 404 })
  }

  const lead = await db.lead.findFirst({
    where: { id, organizationId: org.id },
    include: {
      events: { orderBy: { createdAt: 'desc' }, take: 50 },
      appointments: { orderBy: { startTime: 'desc' }, take: 10 },
      quotes: { orderBy: { createdAt: 'desc' }, take: 10 },
      agentRuns: {
        orderBy: { startedAt: 'desc' },
        take: 20,
        include: { _count: { select: { actions: true } } },
      },
      _count: {
        select: { events: true, appointments: true, quotes: true },
      },
    },
  })

  if (!lead) {
    const msg = await translate(locale, 'common.errors.notFound', 'Non trouvé')
    return NextResponse.json({ error: msg }, { status: 404 })
  }
  return NextResponse.json({ lead })
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const locale = pickLocale(req)
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    const msg = await translate(locale, 'common.errors.unauthorized', 'Non autorisé')
    return NextResponse.json({ error: msg }, { status: 401 })
  }

  const { id } = await ctx.params
  const org = await getUserOrganization(session.user.id)
  if (!org) {
    const msg = await translate(locale, 'common.errors.notFound', 'Non trouvé')
    return NextResponse.json({ error: msg }, { status: 404 })
  }

  const existing = await db.lead.findFirst({
    where: { id, organizationId: org.id },
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
  if (typeof body?.status === 'string') {
    if (!VALID_STATUSES.includes(body.status)) {
      const msg = await translate(
        locale,
        'growth.errors.invalidStatus',
        'Statut invalide'
      )
      return NextResponse.json({ error: msg }, { status: 400 })
    }
    data.status = body.status
  }
  if (typeof body?.assignedTo === 'string') {
    const assignedTo = body.assignedTo.trim()
    if (!assignedTo) {
      data.assignedTo = null
    } else {
      const member = await db.organizationMember.findFirst({
        where: { organizationId: org.id, userId: assignedTo, status: 'active' },
        select: { id: true },
      })
      if (!member) {
        return NextResponse.json({ error: toolWorkspaceText(locale, 'memberUnauthorized') }, { status: 400 })
      }
      data.assignedTo = assignedTo
    }
  }
  if (typeof body?.score === 'number') {
    data.score = Math.max(0, Math.min(100, Math.round(body.score)))
  }
  if (typeof body?.notes === 'string') {
    data.notes = body.notes.trim().slice(0, 10000) || null
  }
  if (typeof body?.urgency === 'string') {
    data.urgency = body.urgency
  }
  if (typeof body?.budget === 'string') {
    data.budget = body.budget
  }
  if (typeof body?.serviceType === 'string') {
    data.serviceType = body.serviceType
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
    const lead = await db.lead.update({ where: { id }, data })
    // Log event if status changed.
    if (data.status) {
      await db.leadEvent.create({
        data: {
          leadId: id,
          type: 'status_changed',
          actor: session.user.id,
          payload: JSON.stringify({ status: data.status }),
        },
      })
    }
    return NextResponse.json({ lead })
  } catch (err) {
    console.error('[growth/leads/[id]] PATCH error:', err)
    const msg = await translate(
      locale,
      'growth.errors.generic',
      'Une erreur est survenue.'
    )
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
