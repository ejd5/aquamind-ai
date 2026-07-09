import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { pickLocale, translate } from '@/lib/i18n-api'
import { PLANS, DEFAULT_PLAN, canAccess, type PlanId } from '@/lib/pool/freemium'

export const runtime = 'nodejs'

/**
 * Multi-piscine API (P5-MULTIPOOL-PDF).
 *
 * GET    /api/pool/profile         → { profiles: [...], profile: <active|first> }
 * GET    /api/pool/profile?id=xxx  → { profiles: [...], profile: <by id> }
 * POST   /api/pool/profile         → create a NEW pool (enforces plan limit)
 * PATCH  /api/pool/profile?id=xxx  → update an existing pool
 * DELETE /api/pool/profile?id=xxx  → delete a pool (must keep ≥ 1)
 *
 * The `profile` field is kept for backward compat with the existing
 * client code (Header, Onboarding, …) which expects a single object.
 */

async function getUserPlanId(userId: string): Promise<PlanId> {
  const sub = await db.subscription.findFirst({
    where: { userId, active: true },
    orderBy: { startedAt: 'desc' },
  })
  return (sub?.plan as PlanId) || DEFAULT_PLAN
}

export async function GET(req: Request) {
  const locale = pickLocale(req)
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    const msg = await translate(locale, 'common.errors.unauthorized', 'Non autorisé')
    return NextResponse.json({ error: msg }, { status: 401 })
  }
  const userId = session.user.id

  const url = new URL(req.url)
  const requestedId = url.searchParams.get('id')

  const profiles = await db.poolProfile.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
  })

  // Resolve the "active" profile:
  //   1. If ?id=xxx is provided and matches → use it
  //   2. Else fall back to the most recently created
  const profile =
    (requestedId ? profiles.find((p) => p.id === requestedId) : null) ||
    profiles[profiles.length - 1] ||
    null

  return NextResponse.json({ profiles, profile })
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
    const defaultPoolName = await translate(
      locale,
      'common.defaultPoolName',
      'Ma piscine'
    )

    // ── Plan limit check ────────────────────────────────────────────────
    // Découverte = 1 pool max, Oasis/Wellness = 3 pools max.
    const planId = await getUserPlanId(userId)
    const plan = PLANS.find((p) => p.id === planId) || PLANS[0]
    const existingCount = await db.poolProfile.count({ where: { userId } })

    // If the user already has at least 1 pool and the plan does not allow
    // multi-pool, OR they've reached the maxPools ceiling → 403.
    const multiPoolGate = canAccess(planId, 'multi_pool')
    const atCapacity = existingCount >= plan.limits.maxPools
    if (atCapacity || (existingCount >= 1 && !multiPoolGate.allowed)) {
      const template = await translate(
        locale,
        'pool.limitReached',
        'Limite atteinte : votre plan autorise {max} piscine(s).'
      )
      const msg = template.replace('{max}', String(plan.limits.maxPools))
      return NextResponse.json(
        {
          error: msg,
          code: 'POOL_LIMIT_REACHED',
          maxPools: plan.limits.maxPools,
          currentCount: existingCount,
          ctaPlan: multiPoolGate.ctaPlan,
        },
        { status: 403 }
      )
    }

    // Normalise spa fields (onboarding uses long names, schema uses short)
    const spaTempTarget =
      body.spaTempTarget != null
        ? Number(body.spaTempTarget)
        : body.spaTemperature != null
          ? Number(body.spaTemperature)
          : null
    const spaUsageFreq = body.spaUsageFreq ?? body.spaUsageFrequency ?? null

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
      waterBodyType: body.waterBodyType || 'pool',
      spaSeats:
        body.spaSeats != null && body.spaSeats !== ''
          ? Number(body.spaSeats)
          : null,
      spaTempTarget: Number.isFinite(spaTempTarget) ? spaTempTarget : null,
      spaUsageFreq: spaUsageFreq || null,
      spaBrand: body.spaBrand || null,
    }

    const profile = await db.poolProfile.create({ data })
    return NextResponse.json({ profile, profiles: [profile] }, { status: 201 })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Erreur' },
      { status: 500 }
    )
  }
}

export async function PATCH(req: NextRequest) {
  const locale = pickLocale(req)
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    const msg = await translate(locale, 'common.errors.unauthorized', 'Non autorisé')
    return NextResponse.json({ error: msg }, { status: 401 })
  }
  const userId = session.user.id

  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  if (!id) {
    const msg = await translate(locale, 'common.errors.idRequired', 'id requis')
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  // Make sure the pool belongs to the user
  const existing = await db.poolProfile.findFirst({ where: { id, userId } })
  if (!existing) {
    const msg = await translate(locale, 'common.errors.notFound', 'Non trouvé')
    return NextResponse.json({ error: msg }, { status: 404 })
  }

  try {
    const body = await req.json()
    const spaTempTarget =
      body.spaTempTarget != null
        ? Number(body.spaTempTarget)
        : body.spaTemperature != null
          ? Number(body.spaTemperature)
          : undefined
    const spaUsageFreq = body.spaUsageFreq ?? body.spaUsageFrequency ?? undefined

    const data: Record<string, unknown> = {}
    if (typeof body.name === 'string') data.name = body.name
    if (body.volume != null) data.volume = Number(body.volume)
    if (body.unit === 'gal' || body.unit === 'm3') data.unit = body.unit
    if (body.shape) data.shape = body.shape
    if (body.surfaceType) data.surfaceType = body.surfaceType
    if (body.treatmentType) data.treatmentType = body.treatmentType
    if (body.filterType) data.filterType = body.filterType
    if (body.pumpType != null) data.pumpType = body.pumpType
    if (typeof body.saltSystem === 'boolean') data.saltSystem = body.saltSystem
    if (body.region != null) data.region = body.region
    if (body.sunExposure) data.sunExposure = body.sunExposure
    if (typeof body.covered === 'boolean') data.covered = body.covered
    if (body.usageLevel) data.usageLevel = body.usageLevel
    if (body.waterBodyType) data.waterBodyType = body.waterBodyType
    if (body.spaSeats != null && body.spaSeats !== '')
      data.spaSeats = Number(body.spaSeats)
    if (spaTempTarget !== undefined && Number.isFinite(spaTempTarget))
      data.spaTempTarget = spaTempTarget
    if (spaUsageFreq !== undefined) data.spaUsageFreq = spaUsageFreq
    if (body.spaBrand != null) data.spaBrand = body.spaBrand

    const profile = await db.poolProfile.update({ where: { id }, data })
    return NextResponse.json({ profile })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Erreur' },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest) {
  const locale = pickLocale(req)
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    const msg = await translate(locale, 'common.errors.unauthorized', 'Non autorisé')
    return NextResponse.json({ error: msg }, { status: 401 })
  }
  const userId = session.user.id

  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  if (!id) {
    const msg = await translate(locale, 'common.errors.idRequired', 'id requis')
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  const existing = await db.poolProfile.findFirst({ where: { id, userId } })
  if (!existing) {
    const msg = await translate(locale, 'common.errors.notFound', 'Non trouvé')
    return NextResponse.json({ error: msg }, { status: 404 })
  }

  // Refuse to delete the last remaining pool — onboarding expects ≥ 1.
  const count = await db.poolProfile.count({ where: { userId } })
  if (count <= 1) {
    const msg = await translate(
      locale,
      'pool.cannotDeleteLast',
      'Vous devez conserver au moins une piscine.'
    )
    return NextResponse.json({ error: msg, code: 'CANNOT_DELETE_LAST' }, { status: 400 })
  }

  await db.poolProfile.delete({ where: { id } })
  // Return the new "active" profile (the most recent remaining)
  const remaining = await db.poolProfile.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
  })
  const profile = remaining[remaining.length - 1] || null
  return NextResponse.json({ profile, profiles: remaining })
}
