import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { getProAccess } from '@/lib/pro/access'
import { proClientAccessWhere } from '@/lib/pro/intervention-scope'
import {
  ProCommercialError,
  assertCommercialTransition,
  calculateCommercialLines,
  isCommercialStatus,
  normalizeCurrency,
  parseCommercialDocument,
  parseOptionalCommercialDate,
  serializeCommercialDocument,
  type ProCommercialDocument,
  type ProCommercialStatus,
} from '@/lib/pro/commercial'
import { pickLocale, translate } from '@/lib/i18n-api'

export const runtime = 'nodejs'

function text(value: unknown, maximum: number): string {
  return typeof value === 'string' ? value.trim().slice(0, maximum) : ''
}

async function accessFor(req: NextRequest) {
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
  return { access, actorUserId: session.user.id } as const
}

async function findDocument(id: string, ownerUserId: string) {
  return db.proClientActivity.findFirst({
    where: {
      id,
      type: { in: ['commercial_quote', 'commercial_invoice'] },
      client: { proUserId: ownerUserId },
    },
    include: {
      client: {
        select: { firstName: true, lastName: true, companyName: true, email: true },
      },
    },
  })
}

function present(activity: NonNullable<Awaited<ReturnType<typeof findDocument>>>) {
  return {
    id: activity.id,
    document: parseCommercialDocument(activity.details),
    client: activity.client,
    actorUserId: activity.actorUserId,
    occurredAt: activity.occurredAt,
    createdAt: activity.createdAt,
  }
}

function applyStatusTimestamps(
  document: ProCommercialDocument,
  status: ProCommercialStatus,
  now: string,
): ProCommercialDocument {
  return {
    ...document,
    status,
    sentAt: status === 'sent' && !document.sentAt ? now : document.sentAt,
    acceptedAt: status === 'accepted' && !document.acceptedAt ? now : document.acceptedAt,
    paidAt: status === 'paid' && !document.paidAt ? now : document.paidAt,
  }
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await accessFor(req)
  if ('response' in auth) return auth.response
  const { id } = await context.params
  const activity = await findDocument(id, auth.access.ownerUserId)
  if (!activity) return NextResponse.json({ error: 'Commercial document not found' }, { status: 404 })
  try {
    return NextResponse.json({ commercialDocument: present(activity) })
  } catch (error) {
    return NextResponse.json({ error: 'Stored commercial document is invalid' }, { status: 409 })
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await accessFor(req)
  if ('response' in auth) return auth.response
  const { id } = await context.params
  const activity = await findDocument(id, auth.access.ownerUserId)
  if (!activity) return NextResponse.json({ error: 'Commercial document not found' }, { status: 404 })

  let body: Record<string, unknown>
  try {
    body = await req.json() as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  try {
    let document = parseCommercialDocument(activity.details)
    if (body.status !== undefined) {
      if (!isCommercialStatus(body.status)) {
        return NextResponse.json({ error: 'Invalid commercial document status' }, { status: 400 })
      }
      assertCommercialTransition(document.type, document.status, body.status)
      document = applyStatusTimestamps(document, body.status, new Date().toISOString())
    }

    if (body.lines !== undefined) {
      if (document.status !== 'draft') {
        return NextResponse.json({ error: 'Only draft documents can change their lines' }, { status: 409 })
      }
      const totals = calculateCommercialLines(body.lines)
      document = {
        ...document,
        lines: totals.lines,
        subtotal: totals.subtotal,
        taxTotal: totals.taxTotal,
        total: totals.total,
      }
    }

    if (body.currency !== undefined) document.currency = normalizeCurrency(body.currency)
    if (body.notes !== undefined) document.notes = text(body.notes, 4_000) || null
    if (body.dueDate !== undefined) {
      if (document.type !== 'invoice') {
        return NextResponse.json({ error: 'dueDate applies only to invoices' }, { status: 400 })
      }
      document.dueDate = parseOptionalCommercialDate(body.dueDate)
    }
    if (body.validUntil !== undefined) {
      if (document.type !== 'quote') {
        return NextResponse.json({ error: 'validUntil applies only to quotes' }, { status: 400 })
      }
      document.validUntil = parseOptionalCommercialDate(body.validUntil)
    }

    const updated = await db.proClientActivity.update({
      where: { id: activity.id },
      data: {
        actorUserId: auth.actorUserId,
        details: serializeCommercialDocument(document),
      },
      include: {
        client: {
          select: { firstName: true, lastName: true, companyName: true, email: true },
        },
      },
    })
    return NextResponse.json({ commercialDocument: present(updated) })
  } catch (error) {
    if (error instanceof ProCommercialError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 400 })
    }
    console.error('[pro/commercial/documents/:id] PATCH error:', error)
    return NextResponse.json({ error: 'Unable to update commercial document' }, { status: 500 })
  }
}
