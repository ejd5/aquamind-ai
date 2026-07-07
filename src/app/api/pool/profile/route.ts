import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { pickLocale, translate } from '@/lib/i18n-api'

export const runtime = 'nodejs'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    // TODO: i18n — return a translation key for the client to localise.
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }
  const userId = session.user.id

  const profile = await db.poolProfile.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } })
  return NextResponse.json({ profile })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    // TODO: i18n — return a translation key for the client to localise.
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }
  const userId = session.user.id

  try {
    const body = await req.json()
    const existing = await db.poolProfile.findFirst({ where: { userId } })
    // Localised default pool name ("Ma piscine" / "My pool" / "Mi piscina" …)
    // based on the user's UI language at creation time. The middleware has
    // already resolved Accept-Language to a 2-letter code on the request.
    const locale = pickLocale(req)
    const defaultPoolName = await translate(
      locale,
      'common.defaultPoolName',
      'Ma piscine'
    )
    const data = {
      userId,
      name: body.name || defaultPoolName,
      volume: Number(body.volume) || 40,
      unit: body.unit === 'gal' ? 'gal' : 'm3',
      shape: body.shape || 'rectangular',
      surfaceType: body.surfaceType || 'liner',
      treatmentType: body.treatmentType || 'chlorine',
      filterType: body.filterType || 'sand',
      pumpType: body.pumpType || null,
      saltSystem: !!body.saltSystem,
      region: body.region || null,
      sunExposure: body.sunExposure || 'medium',
      covered: !!body.covered,
      usageLevel: body.usageLevel || 'medium',
    }
    let profile
    if (existing) {
      profile = await db.poolProfile.update({ where: { id: existing.id }, data })
    } else {
      profile = await db.poolProfile.create({ data })
    }
    return NextResponse.json({ profile })
  } catch (e) {
    // TODO: i18n — return a translation key for the client to localise.
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur' }, { status: 500 })
  }
}
