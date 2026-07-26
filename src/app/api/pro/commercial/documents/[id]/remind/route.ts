import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { getProAccess } from '@/lib/pro/access'
import { parseCommercialDocument, serializeCommercialDocument } from '@/lib/pro/commercial'
import { pickLocale, translate } from '@/lib/i18n-api'

export const runtime = 'nodejs'

const CHANNELS = ['email', 'sms', 'phone', 'whatsapp'] as const

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

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await accessFor(req)
  if ('response' in auth) return auth.response
  const { id } = await context.params

  const activity = await db.proClientActivity.findFirst({
    where: {
      id,
      type: 'commercial_invoice',
      client: { proUserId: auth.access.ownerUserId },
    },
    include: {
      client: {
        select: { firstName: true, lastName: true, companyName: true, email: true, phone: true },
      },
    },
  })
  if (!activity) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })

  let body: Record<string, unknown> = {}
  try {
    body = await req.json() as Record<string, unknown>
  } catch {}

  let invoice
  try {
    invoice = parseCommercialDocument(activity.details)
  } catch {
    return NextResponse.json({ error: 'Stored invoice is invalid' }, { status: 409 })
  }
  if (invoice.type !== 'invoice') {
    return NextResponse.json({ error: 'Document is not an invoice' }, { status: 409 })
  }
  if (['draft', 'paid', 'cancelled'].includes(invoice.status)) {
    return NextResponse.json({ error: `Invoice status ${invoice.status} cannot be reminded` }, { status: 409 })
  }

  const now = new Date()
  const dueAt = invoice.dueDate ? new Date(invoice.dueDate).getTime() : null
  const overdue = dueAt != null && dueAt < now.getTime()
  const force = body.force === true
  if (!overdue && !force) {
    return NextResponse.json({ error: 'Invoice is not overdue', code: 'INVOICE_NOT_OVERDUE' }, { status: 409 })
  }

  const requestedChannel = text(body.channel, 20)
  const channel = CHANNELS.includes(requestedChannel as (typeof CHANNELS)[number])
    ? requestedChannel as (typeof CHANNELS)[number]
    : 'email'
  const reminderCount = invoice.reminderCount + 1
  const updatedInvoice = {
    ...invoice,
    status: overdue ? 'overdue' as const : invoice.status,
    reminderCount,
    lastReminderAt: now.toISOString(),
  }
  const reminder = {
    version: 'pro-commercial-reminder-v1',
    documentActivityId: activity.id,
    documentNumber: invoice.number,
    reminderCount,
    channel,
    message: text(body.message, 4_000) || null,
    deliveryStatus: 'recorded' as const,
    recordedAt: now.toISOString(),
  }

  const result = await db.$transaction(async (tx) => {
    const updated = await tx.proClientActivity.update({
      where: { id: activity.id },
      data: {
        actorUserId: auth.actorUserId,
        details: serializeCommercialDocument(updatedInvoice),
      },
    })
    const reminderActivity = await tx.proClientActivity.create({
      data: {
        proClientId: activity.proClientId,
        actorUserId: auth.actorUserId,
        type: 'payment_reminder',
        title: `Relance ${invoice.number} #${reminderCount}`,
        details: JSON.stringify(reminder),
        occurredAt: now,
      },
    })
    return { updated, reminderActivity }
  })

  return NextResponse.json({
    invoice: { id: result.updated.id, document: updatedInvoice },
    reminder: { id: result.reminderActivity.id, ...reminder },
    recipient: {
      name: activity.client.companyName || `${activity.client.firstName} ${activity.client.lastName}`,
      email: activity.client.email,
      phone: activity.client.phone,
    },
  }, { status: 201 })
}
