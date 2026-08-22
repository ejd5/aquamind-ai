/**
 * AQWELIA — Admin Control Plane V1 · journal d'audit (lecture seule).
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdminFromDb } from '@/lib/admin-auth'
import { listAuditLogs } from '@/lib/admin-control/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await requireAdminFromDb()
  if (!auth.authorized) return NextResponse.json({ error: auth.reason === 'no-session' ? 'Unauthorized' : 'Forbidden' }, { status: auth.reason === 'no-session' ? 401 : 403 })

  const url = new URL(req.url)
  const logs = await listAuditLogs({
    entityType: url.searchParams.get('entityType') ?? undefined,
    entityId: url.searchParams.get('entityId') ?? undefined,
    limit: url.searchParams.get('limit') ? Number(url.searchParams.get('limit')) : undefined,
  })
  return NextResponse.json({ logs }, { status: 200 })
}
