/**
 * AQWELIA Growth OS — Leads API.
 *
 * URL: /api/growth/leads
 *
 * GET  — list leads for the authenticated pro's organization, with optional
 *        filters: status, source, q (search), assignedTo. Returns
 *        `{ leads, total, page, pageSize }`.
 * POST — capture a new lead by invoking the `lead_capture` agent. Body:
 *        `{ source, firstName, lastName, email, phone?, city?, ... consent }`.
 *
 * Auth: NextAuth session required. Lead is scoped to the user's primary
 * organization (first owned organization, or first membership).
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { pickLocale, translate } from '@/lib/i18n-api'
import { leadCapture, type LeadCaptureInput } from '@/lib/growth/agents'
import { getGrowthOrganization } from '@/lib/growth/access'
import { toolWorkspaceText } from '@/i18n/locales/tool-workspaces'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const locale = pickLocale(req)
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    const msg = await translate(locale, 'common.errors.unauthorized', 'Non autorisé')
    return NextResponse.json({ error: msg }, { status: 401 })
  }

  const org = await getGrowthOrganization(session.user.id)
  if (!org) {
    return NextResponse.json(
      { error: toolWorkspaceText(locale, 'organizationRequired') },
      { status: 409 }
    )
  }
  const url = new URL(req.url)
  const status = url.searchParams.get('status')
  const source = url.searchParams.get('source')
  const assignedTo = url.searchParams.get('assignedTo')
  const q = (url.searchParams.get('q') || '').trim()
  const page = Math.max(1, Number(url.searchParams.get('page')) || 1)
  const pageSize = Math.min(
    100,
    Math.max(1, Number(url.searchParams.get('pageSize')) || 20)
  )

  const where: {
    organizationId: string
    status?: string
    source?: string
    assignedTo?: string
    OR?: Array<Record<string, unknown>>
  } = { organizationId: org.id }
  if (status) where.status = status
  if (source) where.source = source
  if (assignedTo) where.assignedTo = assignedTo
  if (q) {
    where.OR = [
      { firstName: { contains: q } },
      { lastName: { contains: q } },
      { email: { contains: q } },
      { phone: { contains: q } },
      { city: { contains: q } },
    ]
  }

  const [total, leads] = await Promise.all([
    db.lead.count({ where }),
    db.lead.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        _count: {
          select: { events: true, appointments: true, quotes: true },
        },
      },
    }),
  ])

  return NextResponse.json({ leads, total, page, pageSize })
}

export async function POST(req: NextRequest) {
  const locale = pickLocale(req)
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    const msg = await translate(locale, 'common.errors.unauthorized', 'Non autorisé')
    return NextResponse.json({ error: msg }, { status: 401 })
  }

  const org = await getGrowthOrganization(session.user.id)
  if (!org) {
    return NextResponse.json(
      { error: toolWorkspaceText(locale, 'organizationRequired') },
      { status: 409 }
    )
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const input: LeadCaptureInput = {
    source: body?.source ?? 'website',
    firstName: String(body?.firstName ?? '').trim(),
    lastName: String(body?.lastName ?? '').trim(),
    email: String(body?.email ?? '').trim(),
    phone: body?.phone ? String(body.phone).trim() : undefined,
    address: body?.address ? String(body.address).trim() : undefined,
    city: body?.city ? String(body.city).trim() : undefined,
    zipCode: body?.zipCode ? String(body.zipCode).trim() : undefined,
    country: body?.country ?? 'FR',
    serviceType: body?.serviceType,
    poolType: body?.poolType,
    poolVolume: typeof body?.poolVolume === 'number' ? body.poolVolume : undefined,
    problem: body?.problem,
    urgency: body?.urgency ?? 'normal',
    budget: body?.budget,
    consent: Boolean(body?.consent),
    consentSource: body?.consentSource ?? body?.source,
    notes: body?.notes,
  }

  if (!input.firstName || !input.lastName || !input.email) {
    const msg = await translate(
      locale,
      'growth.errors.missingFields',
      'Champs requis manquants'
    )
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  try {
    const result = await leadCapture(
      {
        organizationId: org.id,
        userId: session.user.id,
        objective: 'Capture lead from source ' + input.source,
        tools: ['consent_check', 'initial_scoring', 'lead_create'],
        budget: 0.1,
        maxActions: 5,
      },
      input
    )

    if (result.status === 'failed') {
      return NextResponse.json({ error: result.reason }, { status: 400 })
    }
    if (result.status === 'escalated') {
      return NextResponse.json(
        { warning: result.reason, result },
        { status: 202 }
      )
    }

    return NextResponse.json({ result, leadId: result.output.leadId }, { status: 201 })
  } catch (err) {
    console.error('[growth/leads] POST error:', err)
    const msg = await translate(
      locale,
      'growth.errors.generic',
      'Une erreur est survenue.'
    )
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
