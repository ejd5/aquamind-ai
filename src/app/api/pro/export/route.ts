import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { getProAccess } from '@/lib/pro/access'

export const runtime = 'nodejs'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const access = await getProAccess(session.user.id)
  const clients = await db.proClient.findMany({
    where: { proUserId: access.ownerUserId }, orderBy: { lastName: 'asc' },
    include: { pools: true, interventions: { orderBy: { scheduledAt: 'desc' } } },
  })
  const rows = [['Client','Email','Téléphone','Ville','Bassin','Type bassin','Volume','Dernière intervention','Statut']]
  for (const client of clients) {
    const pools = client.pools.length ? client.pools : [null]
    for (const pool of pools) {
      const last = client.interventions.find((iv) => !pool || iv.proPoolId === pool.id)
      rows.push([
        `${client.firstName} ${client.lastName}`, client.email || '', client.phone || '', client.city || '',
        pool?.name || '', pool?.type || '', pool?.volume ? `${pool.volume} ${pool.unit}` : '',
        last ? last.scheduledAt.toISOString() : '', last?.status || '',
      ])
    }
  }
  const csv = '\uFEFF' + rows.map((row) => row.map(csvCell).join(';')).join('\n')
  return new NextResponse(csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="AQWELIA-Pro-export.csv"', 'Cache-Control': 'no-store' } })
}
function csvCell(value: string) { return `"${value.replace(/"/g, '""')}"` }
