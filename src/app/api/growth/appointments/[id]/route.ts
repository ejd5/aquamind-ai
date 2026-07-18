import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { getGrowthOrganization } from '@/lib/growth/access'

const STATUSES = new Set(['proposed', 'confirmed', 'completed', 'cancelled', 'no_show'])
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const org = await getGrowthOrganization(session.user.id)
  if (!org) return NextResponse.json({ error: 'Organisation requise' }, { status: 409 })
  const { id } = await params
  const existing = await db.appointment.findFirst({ where: { id, organizationId: org.id }, select: { id: true, leadId: true } })
  if (!existing) return NextResponse.json({ error: 'Rendez-vous introuvable' }, { status: 404 })
  const body = await req.json().catch(() => ({})); const status = String(body?.status || '')
  if (!STATUSES.has(status)) return NextResponse.json({ error: 'Statut invalide' }, { status: 400 })
  const appointment = await db.appointment.update({ where: { id }, data: { status } })
  await db.leadEvent.create({ data: { leadId: existing.leadId, type: 'appointment_status_changed', actor: session.user.id, payload: JSON.stringify({ appointmentId: id, status }) } })
  return NextResponse.json({ appointment })
}
