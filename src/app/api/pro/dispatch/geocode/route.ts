import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { getProAccess } from '@/lib/pro/access'
import { geocodeAddress } from '@/lib/maps/google-geocoding'

export const runtime = 'nodejs'

function addressLine(input: { address: string | null; city: string | null; zipCode: string | null }): string {
  return [input.address, input.zipCode, input.city].filter(Boolean).join(', ')
}

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const access = await getProAccess(session.user.id)
  if (!access.canManage || !access.organizationId) return NextResponse.json({ error: 'Manager access required' }, { status: 403 })
  if (!process.env.GOOGLE_MAPS_SERVER_API_KEY) {
    return NextResponse.json({ error: 'GOOGLE_MAPS_SERVER_API_KEY is not configured' }, { status: 409 })
  }

  const [clients, pools] = await Promise.all([
    db.proClient.findMany({
      where: { proUserId: access.ownerUserId, latitude: null, address: { not: null } },
      select: { id: true, address: true, city: true, zipCode: true },
      take: 25,
    }),
    db.proPool.findMany({
      where: { client: { proUserId: access.ownerUserId }, latitude: null, address: { not: null } },
      select: { id: true, address: true, client: { select: { city: true, zipCode: true } } },
      take: 25,
    }),
  ])

  let clientsUpdated = 0
  let poolsUpdated = 0
  for (const client of clients) {
    const point = await geocodeAddress(addressLine(client))
    if (!point) continue
    await db.proClient.update({ where: { id: client.id }, data: { ...point, geocodedAt: new Date() } })
    clientsUpdated += 1
  }
  for (const pool of pools) {
    const point = await geocodeAddress(addressLine({
      address: pool.address,
      city: pool.client.city,
      zipCode: pool.client.zipCode,
    }))
    if (!point) continue
    await db.proPool.update({ where: { id: pool.id }, data: { ...point, geocodedAt: new Date() } })
    poolsUpdated += 1
  }

  await db.proLocationAccessLog.create({
    data: {
      organizationId: access.organizationId,
      actorUserId: session.user.id,
      action: 'geocode_dispatch_addresses',
      metadata: JSON.stringify({ clientsUpdated, poolsUpdated }),
    },
  })
  return NextResponse.json({ clientsUpdated, poolsUpdated })
}
