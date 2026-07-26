import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { getProAccess } from '@/lib/pro/access'
import {
  createCommercialNumber,
  parseCommercialDocument,
  serializeCommercialDocument,
  type ProCommercialDocument,
} from '@/lib/pro/commercial'
import { pickLocale, translate } from '@/lib/i18n-api'

export const runtime = 'nodejs'

function addDays(date: Date, days: number): string {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000).toISOString()
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

  const quoteActivity = await db.proClientActivity.findFirst({
    where: {
      id,
      type: 'commercial_quote',
      client: { proUserId: auth.access.ownerUserId },
    },
    include: {
      client: {
        select: { firstName: true, lastName: true, companyName: true, email: true },
      },
    },
  })
  if (!quoteActivity) return NextResponse.json({ error: 'Quote not found' }, { status: 404 })

  let quote: ProCommercialDocument
  try {
    quote = parseCommercialDocument(quoteActivity.details)
  } catch {
    return NextResponse.json({ error: 'Stored quote is invalid' }, { status: 409 })
  }
  if (quote.type !== 'quote' || quote.status !== 'accepted') {
    return NextResponse.json({ error: 'Only an accepted quote can be converted' }, { status: 409 })
  }

  const existingInvoices = await db.proClientActivity.findMany({
    where: {
      proClientId: quote.proClientId,
      type: 'commercial_invoice',
      client: { proUserId: auth.access.ownerUserId },
    },
    select: { id: true, details: true },
    orderBy: { occurredAt: 'desc' },
    take: 200,
  })
  for (const activity of existingInvoices) {
    try {
      const invoice = parseCommercialDocument(activity.details)
      if (invoice.sourceQuoteActivityId === quoteActivity.id) {
        return NextResponse.json(
          { error: 'Quote already converted', invoiceActivityId: activity.id },
          { status: 409 },
        )
      }
    } catch {}
  }

  const now = new Date()
  const invoice: ProCommercialDocument = {
    ...quote,
    type: 'invoice',
    number: createCommercialNumber('invoice', now),
    status: 'draft',
    issueDate: now.toISOString(),
    dueDate: addDays(now, 30),
    validUntil: null,
    sentAt: null,
    acceptedAt: null,
    paidAt: null,
    reminderCount: 0,
    lastReminderAt: null,
    sourceQuoteActivityId: quoteActivity.id,
  }

  const created = await db.proClientActivity.create({
    data: {
      proClientId: quote.proClientId,
      actorUserId: auth.actorUserId,
      type: 'commercial_invoice',
      title: invoice.number,
      details: serializeCommercialDocument(invoice),
      occurredAt: now,
    },
    include: {
      client: {
        select: { firstName: true, lastName: true, companyName: true, email: true },
      },
    },
  })

  return NextResponse.json({
    commercialDocument: {
      id: created.id,
      document: invoice,
      client: created.client,
      actorUserId: created.actorUserId,
      occurredAt: created.occurredAt,
      createdAt: created.createdAt,
    },
  }, { status: 201 })
}
