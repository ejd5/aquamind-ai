import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

async function ownedOrganization(userId: string) {
  return db.organization.findFirst({ where: { ownerId: userId, type: 'pro' }, orderBy: { createdAt: 'asc' } })
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const organization = await ownedOrganization(session.user.id)
  if (!organization) return NextResponse.json({ organization: null, members: [] })
  const members = await db.organizationMember.findMany({
    where: { organizationId: organization.id, status: 'active' },
    orderBy: { createdAt: 'asc' },
    include: { user: { select: { id: true, name: true, email: true } } },
  })
  return NextResponse.json({ organization, members })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const action = String(body?.action || 'save_company')
  let organization = await ownedOrganization(session.user.id)

  if (action === 'save_company') {
    const name = String(body?.name || '').trim()
    if (!name) return NextResponse.json({ error: 'Nom de société requis' }, { status: 400 })
    const data = {
      name,
      legalName: clean(body?.legalName), siret: clean(body?.siret), vatNumber: clean(body?.vatNumber),
      address: clean(body?.address), city: clean(body?.city), zipCode: clean(body?.zipCode),
      phone: clean(body?.phone), email: clean(body?.email), website: clean(body?.website),
    }
    organization = organization
      ? await db.organization.update({ where: { id: organization.id }, data })
      : await db.organization.create({ data: { ...data, ownerId: session.user.id, type: 'pro', plan: 'growth_starter', status: 'trial' } })
    await db.organizationMember.upsert({
      where: { organizationId_userId: { organizationId: organization.id, userId: session.user.id } },
      create: { organizationId: organization.id, userId: session.user.id, role: 'owner', status: 'active' },
      update: { role: 'owner', status: 'active' },
    })
    return NextResponse.json({ organization })
  }

  if (!organization) return NextResponse.json({ error: 'Configurez d’abord votre société' }, { status: 409 })

  if (action === 'add_member') {
    const email = String(body?.email || '').trim().toLowerCase()
    const role = ['admin', 'manager', 'technician', 'viewer'].includes(body?.role) ? body.role : 'technician'
    const user = await db.user.findUnique({ where: { email }, select: { id: true, email: true, name: true } })
    if (!user) return NextResponse.json({ error: 'Ce collaborateur doit d’abord créer son compte AQWELIA' }, { status: 404 })
    const member = await db.organizationMember.upsert({
      where: { organizationId_userId: { organizationId: organization.id, userId: user.id } },
      create: { organizationId: organization.id, userId: user.id, role, status: 'active' },
      update: { role, status: 'active' },
    })
    return NextResponse.json({ member, user }, { status: 201 })
  }

  if (action === 'remove_member') {
    const memberId = String(body?.memberId || '')
    const member = await db.organizationMember.findFirst({ where: { id: memberId, organizationId: organization.id } })
    if (!member || member.userId === session.user.id) return NextResponse.json({ error: 'Membre introuvable' }, { status: 404 })
    await db.organizationMember.delete({ where: { id: member.id } })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Action inconnue' }, { status: 400 })
}

function clean(value: unknown): string | null { const text = typeof value === 'string' ? value.trim() : ''; return text || null }
