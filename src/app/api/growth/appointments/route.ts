/**
 * AQWELIA Growth OS — Appointments API.
 *
 * URL: /api/growth/appointments
 *
 * GET  — list appointments for the authenticated pro's organization.
 * POST — create a new appointment (proposed/confirmed) for a lead.
 *
 * Auth: NextAuth session required.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { pickLocale, translate } from '@/lib/i18n-api'

export const runtime = 'nodejs'

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

export async function GET(req: NextRequest) {
  const locale = pickLocale(req)
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    const msg = await translate(locale, 'common.errors.unauthorized', 'Non autorisé')
    return NextResponse.json({ error: msg }, { status: 401 })
  }

  const org = await getUserOrganization(session.user.id)
  if (!org) return NextResponse.json({ error: 'Organisation requise' }, { status: 409 })
  if (!org) {
    return NextResponse.json({ appointments: [], total: 0 })
  }

  const url = new URL(req.url)
  const status = url.searchParams.get('status')
  const leadId = url.searchParams.get('leadId')

  const where: {
    organizationId: string
    status?: string
    leadId?: string
  } = { organizationId: org.id }
  if (status) where.status = status
  if (leadId) where.leadId = leadId

  const [total, appointments] = await Promise.all([
    db.appointment.count({ where }),
    db.appointment.findMany({
      where,
      orderBy: { startTime: 'asc' },
      take: 100,
      include: {
        lead: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            city: true,
          },
        },
      },
    }),
  ])

  return NextResponse.json({ appointments, total })
}

export async function POST(req: NextRequest) {
  const locale = pickLocale(req)
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    const msg = await translate(locale, 'common.errors.unauthorized', 'Non autorisé')
    return NextResponse.json({ error: msg }, { status: 401 })
  }

  const org = await getUserOrganization(session.user.id)
  if (!org) return NextResponse.json({ error: 'Organisation requise' }, { status: 409 })

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const leadId = String(body?.leadId ?? '').trim()
  const startTimeStr = String(body?.startTime ?? '').trim()
  const endTimeStr = String(body?.endTime ?? '').trim()
  if (!leadId || !startTimeStr || !endTimeStr) {
    const msg = await translate(
      locale,
      'growth.errors.missingFields',
      'Champs requis manquants'
    )
    return NextResponse.json({ error: msg }, { status: 400 })
  }
  const ownedLead = await db.lead.findFirst({ where: { id: leadId, organizationId: org.id }, select: { id: true } })
  if (!ownedLead) return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 })

  let startTime: Date
  let endTime: Date
  try {
    startTime = new Date(startTimeStr)
    endTime = new Date(endTimeStr)
    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) throw new Error()
  } catch {
    const msg = await translate(
      locale,
      'growth.errors.invalidDate',
      'Date invalide'
    )
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  try {
    const appt = await db.appointment.create({
      data: {
        leadId,
        organizationId: org.id,
        assignedTo: body?.assignedTo ? String(body.assignedTo) : null,
        startTime,
        endTime,
        status: body?.status ?? 'proposed',
        notes: body?.notes ?? null,
      },
    })
    await db.leadEvent.create({
      data: {
        leadId,
        type: 'appointment_scheduled',
        actor: session.user.id,
        payload: JSON.stringify({ appointmentId: appt.id, startTime, endTime }),
      },
    })
    return NextResponse.json({ appointment: appt }, { status: 201 })
  } catch (err) {
    console.error('[growth/appointments] POST error:', err)
    const msg = await translate(
      locale,
      'growth.errors.generic',
      'Une erreur est survenue.'
    )
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
