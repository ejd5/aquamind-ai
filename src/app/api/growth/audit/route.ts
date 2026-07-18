import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { toolWorkspaceText } from '@/i18n/locales/tool-workspaces'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: toolWorkspaceText(req.headers.get('accept-language') ?? undefined, 'unauthorized') }, { status: 401 })
  const owned = await db.organization.findFirst({ where: { ownerId: session.user.id }, orderBy: { createdAt: 'asc' } })
  const membership = owned ? null : await db.organizationMember.findFirst({ where: { userId: session.user.id, status: 'active' }, include: { organization: true } })
  const org = owned ?? membership?.organization
  if (!org) return NextResponse.json({ runs: [], total: 0 })
  const runs = await db.agentRun.findMany({
    where: { organizationId: org.id }, orderBy: { startedAt: 'desc' }, take: 200,
    include: { lead: { select: { id: true, firstName: true, lastName: true } }, actions: { orderBy: { createdAt: 'asc' } } },
  })
  return NextResponse.json({ runs, total: runs.length })
}
