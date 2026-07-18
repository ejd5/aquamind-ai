import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { toolWorkspaceText } from '@/i18n/locales/tool-workspaces'

export const runtime = 'nodejs'

async function organizationForOwner(userId: string) {
  return db.organization.findFirst({ where: { ownerId: userId }, orderBy: { createdAt: 'asc' } })
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: toolWorkspaceText(req.headers.get('accept-language') ?? undefined, 'unauthorized') }, { status: 401 })
  const organization = await organizationForOwner(session.user.id)
  const members = organization
    ? await db.organizationMember.findMany({
        where: { organizationId: organization.id, status: 'active' },
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'asc' },
      })
    : []
  return NextResponse.json({ organization, members })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: toolWorkspaceText(req.headers.get('accept-language') ?? undefined, 'unauthorized') }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const name = text(body?.name)
  if (!name) return NextResponse.json({ error: 'Nom de l’organisation requis' }, { status: 400 })
  const existing = await organizationForOwner(session.user.id)
  const data = {
    name, legalName: text(body?.legalName), siret: text(body?.siret), address: text(body?.address),
    city: text(body?.city), zipCode: text(body?.zipCode), country: text(body?.country) || 'FR',
    phone: text(body?.phone), email: text(body?.email), website: text(body?.website), type: 'pro',
  }
  const organization = existing
    ? await db.organization.update({ where: { id: existing.id }, data })
    : await db.organization.create({ data: { ...data, ownerId: session.user.id, plan: 'growth_starter', status: 'trial' } })
  await db.organizationMember.upsert({
    where: { organizationId_userId: { organizationId: organization.id, userId: session.user.id } },
    create: { organizationId: organization.id, userId: session.user.id, role: 'owner', status: 'active' },
    update: { role: 'owner', status: 'active' },
  })
  return NextResponse.json({ organization })
}

function text(value: unknown): string | null { const v = typeof value === 'string' ? value.trim() : ''; return v || null }
