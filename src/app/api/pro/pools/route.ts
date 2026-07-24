import { Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { pickLocale, translate } from '@/lib/i18n-api'
import { getProAccess } from '@/lib/pro/access'
import { proNestedInterventionWhere, proPoolAccessWhere } from '@/lib/pro/intervention-scope'
import {
  cleanOptionalText,
  isOneOf,
  parseOptionalDate,
  PRO_POOL_STATUSES,
} from '@/lib/pro/crm'
import { toolWorkspaceText } from '@/i18n/locales/tool-workspaces'

export const runtime = 'nodejs'

const ALLOWED_TYPES = ['pool', 'spa', 'both'] as const
const SERVICE_FILTERS = new Set(['overdue', 'upcoming', 'none'])

export async function GET(req: NextRequest) {
  const locale = pickLocale(req)
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    const msg = await translate(locale, 'common.errors.unauthorized', 'Non autorisé')
    return NextResponse.json({ error: msg }, { status: 401 })
  }

  const access = await getProAccess(session.user.id)
  const url = new URL(req.url)
  const q = (url.searchParams.get('q') || '').trim()
  const type = url.searchParams.get('type')
  const status = url.searchParams.get('status')
  const service = url.searchParams.get('service')
  const now = new Date()
  const interventionWhere = proNestedInterventionWhere(access, session.user.id)

  const where: Prisma.ProPoolWhereInput = proPoolAccessWhere(access, session.user.id)
  if (isOneOf(ALLOWED_TYPES, type)) where.type = type
  if (isOneOf(PRO_POOL_STATUSES, status)) where.status = status
  if (q) {
    where.OR = [
      { name: { contains: q } },
      { brand: { contains: q } },
      { model: { contains: q } },
      { serialNumber: { contains: q } },
      { client: { firstName: { contains: q } } },
      { client: { lastName: { contains: q } } },
      { client: { companyName: { contains: q } } },
      { client: { city: { contains: q } } },
    ]
  }
  if (service && SERVICE_FILTERS.has(service)) {
    if (service === 'overdue') where.nextServiceAt = { lte: now }
    if (service === 'upcoming') where.nextServiceAt = { gt: now }
    if (service === 'none') where.nextServiceAt = null
  }

  const overdueScope: Prisma.ProPoolWhereInput = {
    ...proPoolAccessWhere(access, session.user.id),
    status: { not: 'inactive' },
    nextServiceAt: { lte: now },
  }

  const [pools, overdueServices] = await Promise.all([
    db.proPool.findMany({
      where,
      orderBy: [{ nextServiceAt: 'asc' }, { updatedAt: 'desc' }],
      take: 300,
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            companyName: true,
            city: true,
            phone: true,
          },
        },
        waterTests: { orderBy: { testedAt: 'desc' }, take: 1 },
        interventions: {
          where: interventionWhere,
          orderBy: { scheduledAt: 'desc' },
          take: 1,
          select: { id: true, scheduledAt: true, completedAt: true, status: true, type: true },
        },
        _count: {
          select: {
            interventions: interventionWhere ? { where: interventionWhere } : true,
            waterTests: true,
          },
        },
      },
    }),
    db.proPool.count({ where: overdueScope }),
  ])

  return NextResponse.json({ pools, total: pools.length, summary: { overdueServices } })
}

export async function POST(req: NextRequest) {
  const locale = pickLocale(req)
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    const msg = await translate(locale, 'common.errors.unauthorized', 'Non autorisé')
    return NextResponse.json({ error: msg }, { status: 401 })
  }

  const access = await getProAccess(session.user.id)
  if (!access.canWrite) {
    return NextResponse.json({ error: toolWorkspaceText(locale, 'readonly') }, { status: 403 })
  }

  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const proClientId = typeof body.proClientId === 'string' ? body.proClientId : ''
  if (!proClientId) {
    const msg = await translate(locale, 'pro.errors.clientIdRequired', 'Client requis')
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  const client = await db.proClient.findFirst({
    where: { id: proClientId, proUserId: access.ownerUserId },
    select: { id: true },
  })
  if (!client) {
    const msg = await translate(locale, 'common.errors.notFound', 'Non trouvé')
    return NextResponse.json({ error: msg }, { status: 404 })
  }

  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 200) : ''
  if (!name) {
    const msg = await translate(locale, 'pro.errors.poolNameRequired', 'Nom du bassin requis')
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  const installedAt = parseOptionalDate(body.installedAt)
  const lastServiceAt = parseOptionalDate(body.lastServiceAt)
  const nextServiceAt = parseOptionalDate(body.nextServiceAt)
  if (!installedAt.valid || !lastServiceAt.valid || !nextServiceAt.valid) {
    return NextResponse.json({ error: 'Invalid pool service date' }, { status: 400 })
  }

  const volume = body.volume === null || body.volume === ''
    ? null
    : Number.isFinite(Number(body.volume)) && Number(body.volume) >= 0
      ? Number(body.volume)
      : null

  try {
    const pool = await db.proPool.create({
      data: {
        proClientId,
        name,
        type: isOneOf(ALLOWED_TYPES, body.type) ? body.type : 'pool',
        status: isOneOf(PRO_POOL_STATUSES, body.status) ? body.status : 'active',
        volume,
        unit: body.unit === 'gal' ? 'gal' : 'm3',
        shape: cleanOptionalText(body.shape, 80),
        surface: cleanOptionalText(body.surface, 80),
        treatmentType: cleanOptionalText(body.treatmentType, 80),
        saltSystem: body.saltSystem === true,
        filterType: cleanOptionalText(body.filterType, 80),
        brand: cleanOptionalText(body.brand, 160),
        model: cleanOptionalText(body.model, 160),
        serialNumber: cleanOptionalText(body.serialNumber, 160),
        installedAt: installedAt.value,
        address: cleanOptionalText(body.address, 500),
        accessInstructions: cleanOptionalText(body.accessInstructions),
        equipmentNotes: cleanOptionalText(body.equipmentNotes),
        lastServiceAt: lastServiceAt.value,
        nextServiceAt: nextServiceAt.value,
        notes: cleanOptionalText(body.notes),
      },
    })
    return NextResponse.json({ pool }, { status: 201 })
  } catch (error) {
    console.error('[pro/pools] POST error:', error)
    const msg = await translate(locale, 'pro.errors.generic', 'Une erreur est survenue.')
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
