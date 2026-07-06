import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

export async function GET() {
  const profile = await db.poolProfile.findFirst({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json({ profile })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const existing = await db.poolProfile.findFirst()
    const data = {
      name: body.name || 'Ma piscine',
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
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur' }, { status: 500 })
  }
}
