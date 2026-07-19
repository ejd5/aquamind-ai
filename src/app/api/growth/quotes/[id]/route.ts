import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { getGrowthOrganization } from '@/lib/growth/access'
import { toolWorkspaceText } from '@/i18n/locales/tool-workspaces'

const STATUSES = new Set(['draft', 'sent', 'accepted', 'rejected', 'expired'])
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: toolWorkspaceText(req.headers.get('accept-language') ?? undefined, 'unauthorized') }, { status: 401 })
  const org = await getGrowthOrganization(session.user.id)
  if (!org) return NextResponse.json({ error: 'Organisation requise' }, { status: 409 })
  const { id } = await params
  const existing = await db.quote.findFirst({ where: { id, organizationId: org.id }, select: { id: true, leadId: true } })
  if (!existing) return NextResponse.json({ error: 'Devis introuvable' }, { status: 404 })
  const body = await req.json().catch(() => ({})); const status = String(body?.status || '')
  if (!STATUSES.has(status)) return NextResponse.json({ error: 'Statut invalide' }, { status: 400 })
  const now = new Date()
  const quote = await db.quote.update({ where: { id }, data: { status, sentAt: status === 'sent' ? now : undefined, acceptedAt: status === 'accepted' ? now : undefined } })
  await db.leadEvent.create({ data: { leadId: existing.leadId, type: 'quote_status_changed', actor: session.user.id, payload: JSON.stringify({ quoteId: id, status }) } })
  return NextResponse.json({ quote })
}
