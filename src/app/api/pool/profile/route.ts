import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { pickLocale, translate } from '@/lib/i18n-api'
import { PLANS, DEFAULT_PLAN, canAccess, type PlanId } from '@/lib/pool/freemium'
import {
  validateProfileBody,
  deriveConfirmedFields,
  parseConfirmedFields,
} from '@/lib/pool/onboarding-form'

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

async function getUserPlanInfo(userId: string): Promise<{ planId: PlanId; status: import('@/lib/billing/plans').SubscriptionStatus; expiresAt: Date | null }> {
  const sub = await db.subscription.findFirst({
    where: { userId, active: true },
    orderBy: { startedAt: 'desc' },
  })
  return {
    planId: (sub?.plan as PlanId) || DEFAULT_PLAN,
    status: (sub?.status as import('@/lib/billing/plans').SubscriptionStatus) || 'inactive',
    expiresAt: sub?.expiresAt || null,
  }
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

    // ── Business validation (mirrors client controls; never trust client) ─
    const validationErrors = validateProfileBody(body, { partial: false })
    if (validationErrors.length) {
      const msg = await translate(
        locale,
        'pool.invalidField',
        'Valeur invalide pour le champ {field}'
      )
      return NextResponse.json(
        {
          error: msg.replace('{field}', validationErrors.map((e) => e.field).join(', ')),
          code: 'INVALID_PROFILE',
          errors: validationErrors,
        },
        { status: 400 }
      )
    }

    // ── Plan limit check ────────────────────────────────────────────────
    // Découverte = 1 pool max, Oasis/Wellness = 3 pools max.
    const { planId, status, expiresAt } = await getUserPlanInfo(userId)
    const plan = PLANS.find((p) => p.id === planId) || PLANS[0]
    const existingCount = await db.poolProfile.count({ where: { userId } })

    // If the user already has at least 1 pool and the plan does not allow
    // multi-pool, OR they've reached the maxPools ceiling → 403.
    const multiPoolGate = canAccess(planId, status, 'multi_pool', undefined, expiresAt)
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

    // P0-B: Feature gate — spa_support (block spa creation without Wellness/Spa365)
    const waterBodyType = body.waterBodyType || 'pool'
    if (waterBodyType === 'spa' || waterBodyType === 'both') {
      const spaGate = canAccess(planId, status, 'spa_support', undefined, expiresAt)
      if (!spaGate.allowed) {
        const msg = await translate(locale, 'gates.spa_support', 'Support spa requis')
        return NextResponse.json(
          { error: msg, code: 'SPA_NOT_SUPPORTED', ctaPlan: spaGate.ctaPlan },
          { status: 403 }
        )
      }
    }

    // Normalise spa fields (onboarding uses long names, schema uses short)
    const spaTempTarget =
      body.spaTempTarget != null
        ? Number(body.spaTempTarget)
        : body.spaTemperature != null
          ? Number(body.spaTemperature)
          : null
    const spaUsageFreq = body.spaUsageFreq ?? body.spaUsageFrequency ?? null
    const manufacturerSaltMin = optionalNonNegative(body.manufacturerSaltMin)
    const manufacturerSaltMax = optionalPositive(body.manufacturerSaltMax)
    const manufacturerChlorineMax = optionalPositive(body.manufacturerChlorineMax)
    const limitError = validateManufacturerLimits(
      manufacturerSaltMin,
      manufacturerSaltMax,
      manufacturerChlorineMax,
    )
    if (limitError) return NextResponse.json(limitError, { status: 400 })

    // ── Build the create payload ────────────────────────────────────────
    // P0-1: only persist fields the client explicitly sent. Fields that were
    // not confirmed are left to the DB technical defaults, and `confirmedFields`
    // records exactly which business values are user-confirmed truth. The
    // recommendation engine must consult confirmedFields before treating a
    // stored value as user input.
    const confirmedFields = deriveConfirmedFields(body)
    const data: {
      userId: string
      name?: string
      volume?: number
      unit?: string
      waterBodyType?: string
      shape?: string
      surfaceType?: string
      treatmentType?: string
      filterType?: string
      pumpType?: string | null
      saltSystem?: boolean
      region?: string | null
      sunExposure?: string
      covered?: boolean
      usageLevel?: string
      spaSeats?: number
      spaTempTarget?: number | null
      spaUsageFreq?: string | null
      spaBrand?: string | null
      manufacturerSaltMin?: number | null
      manufacturerSaltMax?: number | null
      manufacturerChlorineMax?: number | null
      confirmedFields: string | null
    } = {
      userId,
      confirmedFields: confirmedFields.length ? JSON.stringify(confirmedFields) : null,
    }

    if (body.name !== undefined) data.name = typeof body.name === 'string' ? body.name.trim() : body.name
    if (body.volume !== undefined) data.volume = Number(body.volume)
    if (body.unit !== undefined) data.unit = body.unit === 'gal' ? 'gal' : 'm3'
    if (body.waterBodyType !== undefined) data.waterBodyType = body.waterBodyType
    if (body.shape !== undefined) data.shape = body.shape
    if (body.surfaceType !== undefined) data.surfaceType = body.surfaceType
    if (body.treatmentType !== undefined) data.treatmentType = body.treatmentType
    if (body.filterType !== undefined) data.filterType = body.filterType
    if (body.pumpType !== undefined) data.pumpType = body.pumpType || null
    if (typeof body.saltSystem === 'boolean') {
      data.saltSystem = body.saltSystem
    } else if (body.treatmentType !== undefined) {
      // Keep saltSystem consistent with the confirmed treatment type.
      data.saltSystem = body.treatmentType === 'salt'
    }
    if (body.region !== undefined) data.region = body.region || null
    if (body.sunExposure !== undefined) data.sunExposure = body.sunExposure
    if (typeof body.covered === 'boolean') data.covered = body.covered
    if (body.usageLevel !== undefined) data.usageLevel = body.usageLevel
    if (body.spaSeats != null && body.spaSeats !== '') data.spaSeats = Number(body.spaSeats)
    if (Number.isFinite(spaTempTarget)) data.spaTempTarget = spaTempTarget
    if (spaUsageFreq) data.spaUsageFreq = spaUsageFreq
    if (body.spaBrand != null) data.spaBrand = body.spaBrand
    if (manufacturerSaltMin !== null) data.manufacturerSaltMin = manufacturerSaltMin
    if (manufacturerSaltMax !== null) data.manufacturerSaltMax = manufacturerSaltMax
    if (manufacturerChlorineMax !== null) data.manufacturerChlorineMax = manufacturerChlorineMax

    // Legacy default for the pool display name (safe: only used when the client
    // didn't send a name — the onboarding always sends one).
    if (data.name === undefined) data.name = defaultPoolName
    // volume is NOT NULL in the schema with no default: validation (partial:false)
    // above guarantees body.volume is present and finite — assert for Prisma.
    const createData = data as unknown as { volume: number } & typeof data
    const profile = await db.poolProfile.create({ data: createData })
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

    // ── Business validation (mirrors client controls; never trust client) ─
    const validationErrors = validateProfileBody(body, { partial: true })
    if (validationErrors.length) {
      const msg = await translate(
        locale,
        'pool.invalidField',
        'Valeur invalide pour le champ {field}'
      )
      return NextResponse.json(
        {
          error: msg.replace('{field}', validationErrors.map((e) => e.field).join(', ')),
          code: 'INVALID_PROFILE',
          errors: validationErrors,
        },
        { status: 400 }
      )
    }

    // ── Feature gate — spa_support on transition (P0-3) ─────────────────
    // Any transition toward waterBodyType spa|both must re-run the same
    // spa_support authorization as creation. Otherwise a user could create a
    // pool then PATCH waterBodyType='spa' to bypass the gate.
    const nextWaterBodyType = body.waterBodyType ?? existing.waterBodyType
    if (nextWaterBodyType === 'spa' || nextWaterBodyType === 'both') {
      const { planId, status, expiresAt } = await getUserPlanInfo(userId)
      const spaGate = canAccess(planId, status, 'spa_support', undefined, expiresAt)
      if (!spaGate.allowed) {
        const msg = await translate(locale, 'gates.spa_support', 'Support spa requis')
        return NextResponse.json(
          { error: msg, code: 'SPA_NOT_SUPPORTED', ctaPlan: spaGate.ctaPlan },
          { status: 403 }
        )
      }
    }

    const spaTempTarget =
      body.spaTempTarget != null
        ? Number(body.spaTempTarget)
        : body.spaTemperature != null
          ? Number(body.spaTemperature)
          : undefined
    const spaUsageFreq = body.spaUsageFreq ?? body.spaUsageFrequency ?? undefined

    const data: Record<string, unknown> = {}
    if (typeof body.name === 'string') data.name = body.name.trim()
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
    // Transition spa/both → pool : les champs spa perdent leur sens — on les
    // réinitialise plutôt que de laisser des valeurs orphelines.
    if (body.waterBodyType === 'pool') {
      data.spaSeats = null
      data.spaTempTarget = null
      data.spaUsageFreq = null
      data.spaBrand = null
    }
    if (body.spaSeats != null && body.spaSeats !== '')
      data.spaSeats = Number(body.spaSeats)
    if (spaTempTarget !== undefined && Number.isFinite(spaTempTarget))
      data.spaTempTarget = spaTempTarget
    if (spaUsageFreq !== undefined) data.spaUsageFreq = spaUsageFreq
    if (body.spaBrand != null) data.spaBrand = body.spaBrand

    // P0-1: keep the union of previously confirmed fields + newly provided ones.
    const mergedConfirmed = new Set(parseConfirmedFields(existing))
    for (const field of deriveConfirmedFields(body)) mergedConfirmed.add(field)
    data.confirmedFields = mergedConfirmed.size ? JSON.stringify([...mergedConfirmed]) : null

    const nextSaltMin = Object.prototype.hasOwnProperty.call(body, 'manufacturerSaltMin')
      ? optionalNonNegative(body.manufacturerSaltMin)
      : existing.manufacturerSaltMin
    const nextSaltMax = Object.prototype.hasOwnProperty.call(body, 'manufacturerSaltMax')
      ? optionalPositive(body.manufacturerSaltMax)
      : existing.manufacturerSaltMax
    const nextChlorineMax = Object.prototype.hasOwnProperty.call(body, 'manufacturerChlorineMax')
      ? optionalPositive(body.manufacturerChlorineMax)
      : existing.manufacturerChlorineMax
    const limitError = validateManufacturerLimits(nextSaltMin, nextSaltMax, nextChlorineMax)
    if (limitError) return NextResponse.json(limitError, { status: 400 })

    if (Object.prototype.hasOwnProperty.call(body, 'manufacturerSaltMin')) {
      data.manufacturerSaltMin = nextSaltMin
    }
    if (Object.prototype.hasOwnProperty.call(body, 'manufacturerSaltMax')) {
      data.manufacturerSaltMax = nextSaltMax
    }
    if (Object.prototype.hasOwnProperty.call(body, 'manufacturerChlorineMax')) {
      data.manufacturerChlorineMax = nextChlorineMax
    }

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

function optionalNonNegative(value: unknown): number | null {
  if (value === '' || value === null || value === undefined) return null
  const numeric = Number(value)
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : Number.NaN
}

function optionalPositive(value: unknown): number | null {
  if (value === '' || value === null || value === undefined) return null
  const numeric = Number(value)
  return Number.isFinite(numeric) && numeric > 0 ? numeric : Number.NaN
}

function validateManufacturerLimits(
  saltMin: number | null,
  saltMax: number | null,
  chlorineMax: number | null,
): { error: string; code: string } | null {
  if (Number.isNaN(saltMin) || Number.isNaN(saltMax) || Number.isNaN(chlorineMax)) {
    return { error: 'Invalid manufacturer limit', code: 'INVALID_MANUFACTURER_LIMIT' }
  }
  if ((saltMin == null) !== (saltMax == null)) {
    return { error: 'Both manufacturer salt limits are required', code: 'INCOMPLETE_SALT_RANGE' }
  }
  if (saltMin != null && saltMax != null && saltMax <= saltMin) {
    return { error: 'Manufacturer salt maximum must exceed minimum', code: 'INVALID_SALT_RANGE' }
  }
  return null
}
