import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { pickLocale, translate } from '@/lib/i18n-api'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  const locale = pickLocale(req)
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    const msg = await translate(locale, 'common.errors.unauthorized', 'Non autorisé')
    return NextResponse.json({ error: msg }, { status: 401 })
  }
  const userId = session.user.id

  const profile = await db.poolProfile.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } })
  return NextResponse.json({ profile })
}

export async function POST(req: NextRequest) {
  const locale = pickLocale(req)
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    const msg = await translate(locale, 'common.errors.unauthorized', 'Non autorisé')
    return NextResponse.json({ error: msg }, { status: 401 })
  }
  const userId = session.user.id

  try {
    const body = await req.json()
    const existing = await db.poolProfile.findFirst({ where: { userId } })
    // Localised default pool name ("Ma piscine" / "My pool" / "Mi piscina" …)
    // based on the user's UI language at creation time. The middleware has
    // already resolved Accept-Language to a 2-letter code on the request.
    const defaultPoolName = await translate(
      locale,
      'common.defaultPoolName',
      'Ma piscine'
    )
    // P0-FIX Bug 4: previously the POST handler rebuilt `data` from a strict
    // whitelist that silently dropped the 5 spa fields sent by the onboarding
    // form (`onboarding.tsx` line 221 sends `...form`, which includes
    // waterBodyType, spaSeats, spaTemperature, spaUsageFrequency, spaBrand).
    // The Prisma schema has `spaTempTarget` / `spaUsageFreq` — the onboarding
    // form uses the longer `spaTemperature` / `spaUsageFrequency` names, so
    // we accept both and normalise into the schema column names.
    const spaTempTarget =
      body.spaTempTarget != null
        ? Number(body.spaTempTarget)
        : body.spaTemperature != null
          ? Number(body.spaTemperature)
          : null
    const spaUsageFreq =
      body.spaUsageFreq ?? body.spaUsageFrequency ?? null

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
      // ── Spa-specific fields (Premium+). Persisted even when the user
      //    selected `waterBodyType: 'pool'` — they simply stay null/empty
      //    until the user later switches to spa/both in onboarding or
      //    settings. Schema defaults: waterBodyType='pool', others nullable.
      waterBodyType: body.waterBodyType || 'pool',
      spaSeats:
        body.spaSeats != null && body.spaSeats !== ''
          ? Number(body.spaSeats)
          : null,
      spaTempTarget: Number.isFinite(spaTempTarget) ? spaTempTarget : null,
      spaUsageFreq: spaUsageFreq || null,
      spaBrand: body.spaBrand || null,
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
