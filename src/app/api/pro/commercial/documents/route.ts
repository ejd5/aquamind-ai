import { Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { getProAccess } from '@/lib/pro/access'
import { proClientAccessWhere, proInterventionAccessWhere } from '@/lib/pro/intervention-scope'
import {
  ProCommercialError,
  calculateCommercialLines,
  createCommercialNumber,
  isCommercialStatus,
  isCommercialType,
  normalizeCurrency,
  parseCommercialDocument,
  parseOptionalCommercialDate,
  serializeCommercialDocument,
  type ProCommercialDocument,
  type ProCommercialLineInput,
  type ProCommercialType,
} from '@/lib/pro/commercial'
import { pickLocale, translate } from '@/lib/i18n-api'

export const runtime = 'nodejs'

const ACTIVITY_TYPES = ['commercial_quote', 'commercial_invoice']

function text(value: unknown, maximum: number): string {
  return typeof value === 'string' ? value.trim().slice(0, maximum) : ''
}

function addDays(date: Date, days: number): string {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000).toISOString()
}

function parseCatalogMetadata(value: string | null): { description: string | null; taxRate: number } {
  try {
    const parsed = value ? JSON.parse(value) : null
    if (parsed?.version === 'pro-catalog-v1') {
      return {
        description: typeof parsed.description === 'string' ? parsed.description : null,
        taxRate: Number.isFinite(Number(parsed.taxRate)) ? Number(parsed.taxRate) : 20,
      }
    }
  } catch {}
  return { description: value, taxRate: 20 }
}

async function requireCommercialAccess(req: NextRequest) {
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

async function resolveLines(
  ownerUserId: string,
  rawLines: unknown,
): Promise<ProCommercialLineInput[]> {
  if (!Array.isArray(rawLines)) return []
  const ids = [...new Set(rawLines
    .map((line) => line && typeof line === 'object' ? text((line as Record<string, unknown>).catalogItemId, 120) : '')
    .filter(Boolean))]
  const catalog = ids.length
    ? await db.productInventory.findMany({
        where: { id: { in: ids }, userId: ownerUserId, category: { startsWith: 'pro_' } },
      })
    : []
  const byId = new Map(catalog.map((item) => [item.id, item]))

  return rawLines.map((line) => {
    const input = line && typeof line === 'object' ? line as Record<string, unknown> : {}
    const catalogItemId = text(input.catalogItemId, 120) || null
    const item = catalogItemId ? byId.get(catalogItemId) : null
    const meta = item ? parseCatalogMetadata(item.instructions) : null
    return {
      catalogItemId,
      description: text(input.description, 500) || item?.productName || meta?.description || '',
      quantity: input.quantity,
      unit: text(input.unit, 40) || item?.unit || 'unit',
      unitPrice: input.unitPrice ?? item?.price,
      taxRate: input.taxRate ?? meta?.taxRate ?? 20,
    }
  })
}

function present(activity: {
  id: string
  proClientId: string
  actorUserId: string | null
  type: string
  title: string
  details: string | null
  occurredAt: Date
  createdAt: Date
  client?: {
    firstName: string
    lastName: string
    companyName: string | null
    email: string | null
  }
}) {
  const document = parseCommercialDocument(activity.details)
  return {
    id: activity.id,
    document,
    client: activity.client ?? null,
    actorUserId: activity.actorUserId,
    occurredAt: activity.occurredAt,
    createdAt: activity.createdAt,
  }
}

export async function GET(req: NextRequest) {
  const auth = await requireCommercialAccess(req)
  if ('response' in auth) return auth.response

  const url = new URL(req.url)
  const requestedType = url.searchParams.get('type')
  const requestedStatus = url.searchParams.get('status')
  const clientId = text(url.searchParams.get('clientId'), 120)
  const where: Prisma.ProClientActivityWhereInput = {
    type: requestedType && isCommercialType(requestedType)
      ? `commercial_${requestedType}`
      : { in: ACTIVITY_TYPES },
    client: proClientAccessWhere(auth.access, auth.actorUserId),
    ...(clientId ? { proClientId: clientId } : {}),
  }

  const activities = await db.proClientActivity.findMany({
    where,
    orderBy: { occurredAt: 'desc' },
    take: 500,
    include: {
      client: {
        select: { firstName: true, lastName: true, companyName: true, email: true },
      },
    },
  })

  const documents = activities.flatMap((activity) => {
    try {
      const item = present(activity)
      return requestedStatus && isCommercialStatus(requestedStatus) && item.document.status !== requestedStatus
        ? []
        : [item]
    } catch {
      return []
    }
  })
  const now = Date.now()
  const unpaidInvoices = documents.filter(({ document }) =>
    document.type === 'invoice' && !['paid', 'cancelled'].includes(document.status),
  )
  const overdueInvoices = unpaidInvoices.filter(({ document }) =>
    document.dueDate != null && new Date(document.dueDate).getTime() < now,
  )

  return NextResponse.json({
    documents,
    summary: {
      total: documents.length,
      quotes: documents.filter(({ document }) => document.type === 'quote').length,
      invoices: documents.filter(({ document }) => document.type === 'invoice').length,
      unpaidAmount: Math.round(unpaidInvoices.reduce((sum, item) => sum + item.document.total, 0) * 100) / 100,
      overdueAmount: Math.round(overdueInvoices.reduce((sum, item) => sum + item.document.total, 0) * 100) / 100,
      overdueCount: overdueInvoices.length,
    },
  })
}

export async function POST(req: NextRequest) {
  const auth = await requireCommercialAccess(req)
  if ('response' in auth) return auth.response

  let body: Record<string, unknown>
  try {
    body = await req.json() as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!isCommercialType(body.type)) {
    return NextResponse.json({ error: 'Document type must be quote or invoice' }, { status: 400 })
  }
  const type: ProCommercialType = body.type
  const proClientId = text(body.proClientId, 120)
  if (!proClientId) return NextResponse.json({ error: 'proClientId required' }, { status: 400 })

  const client = await db.proClient.findFirst({
    where: { id: proClientId, ...proClientAccessWhere(auth.access, auth.actorUserId) },
    select: { id: true },
  })
  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

  const proInterventionId = text(body.proInterventionId, 120) || null
  if (proInterventionId) {
    const intervention = await db.proIntervention.findFirst({
      where: {
        id: proInterventionId,
        proClientId,
        ...proInterventionAccessWhere(auth.access, auth.actorUserId),
      },
      select: { id: true },
    })
    if (!intervention) return NextResponse.json({ error: 'Intervention not found' }, { status: 404 })
  }

  try {
    const issueDate = parseOptionalCommercialDate(body.issueDate) ?? new Date().toISOString()
    const issue = new Date(issueDate)
    const linesInput = await resolveLines(auth.access.ownerUserId, body.lines)
    const totals = calculateCommercialLines(linesInput)
    const dueDate = type === 'invoice'
      ? parseOptionalCommercialDate(body.dueDate) ?? addDays(issue, 30)
      : null
    const validUntil = type === 'quote'
      ? parseOptionalCommercialDate(body.validUntil) ?? addDays(issue, 30)
      : null
    const document: ProCommercialDocument = {
      version: 'pro-commercial-v1',
      type,
      number: createCommercialNumber(type, issue),
      status: 'draft',
      currency: normalizeCurrency(body.currency),
      proClientId,
      proInterventionId,
      issueDate,
      dueDate,
      validUntil,
      subtotal: totals.subtotal,
      taxTotal: totals.taxTotal,
      total: totals.total,
      notes: text(body.notes, 4_000) || null,
      sentAt: null,
      acceptedAt: null,
      paidAt: null,
      reminderCount: 0,
      lastReminderAt: null,
      sourceQuoteActivityId: text(body.sourceQuoteActivityId, 120) || null,
      lines: totals.lines,
    }

    const activity = await db.proClientActivity.create({
      data: {
        proClientId,
        actorUserId: auth.actorUserId,
        type: `commercial_${type}`,
        title: document.number,
        details: serializeCommercialDocument(document),
        occurredAt: new Date(issueDate),
      },
      include: {
        client: {
          select: { firstName: true, lastName: true, companyName: true, email: true },
        },
      },
    })
    return NextResponse.json({ commercialDocument: present(activity) }, { status: 201 })
  } catch (error) {
    if (error instanceof ProCommercialError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 400 })
    }
    console.error('[pro/commercial/documents] POST error:', error)
    return NextResponse.json({ error: 'Unable to create commercial document' }, { status: 500 })
  }
}
