import React from 'react'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { renderToBuffer } from '@react-pdf/renderer'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { ProInterventionPdf } from '@/lib/pro/pdf-reports'
import { getProAccess } from '@/lib/pro/access'
import { toolWorkspaceText } from '@/i18n/locales/tool-workspaces'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  const locale = req.headers.get('accept-language') ?? undefined
  if (!session?.user?.id) return NextResponse.json({ error: toolWorkspaceText(locale, 'unauthorized') }, { status: 401 })
  const { id } = await params
  const access = await getProAccess(session.user.id)
  const intervention = await db.proIntervention.findFirst({
    where: { id, client: { proUserId: access.ownerUserId } },
    include: { client: true, pool: true },
  })
  if (!intervention) return NextResponse.json({ error: 'Intervention introuvable' }, { status: 404 })
  const buffer = await renderToBuffer(<ProInterventionPdf intervention={intervention} locale={locale} />)
  const filename = `AQWELIA-intervention-${new Date(intervention.scheduledAt).toISOString().slice(0, 10)}.pdf`
  return new NextResponse(buffer as unknown as BodyInit, { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${filename}"`, 'Cache-Control': 'no-store' } })
}
