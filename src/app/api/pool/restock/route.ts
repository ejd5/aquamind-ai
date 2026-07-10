/**
 * AQWELIA AutoRestock™ — restock API.
 *
 * URL: /api/pool/restock
 *
 * GET  ?poolId=xxx  → returns the restock assessment for the active pool:
 *   {
 *     items: RestockItem[],
 *     lowStockCount: number,
 *     hasInventory: boolean
 *   }
 *
 * Auth: NextAuth session required. Reads the user's ProductInventory + last 10
 * WaterTests + active PoolProfile, then runs calculateRestockNeeds().
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { pickLocale, translate } from '@/lib/i18n-api'
import { calculateRestockNeeds } from '@/lib/pool/restock-engine'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const locale = pickLocale(req)
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    const msg = await translate(locale, 'common.errors.unauthorized', 'Non autorisé')
    return NextResponse.json({ error: msg }, { status: 401 })
  }
  const userId = session.user.id

  const url = new URL(req.url)
  const poolId = url.searchParams.get('poolId')

  // Resolve the active pool (explicit ?poolId, else the most recently created).
  const profile = poolId
    ? await db.poolProfile.findFirst({ where: { id: poolId, userId } })
    : await db.poolProfile.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } })

  if (!profile) {
    const msg = await translate(locale, 'common.errors.notFound', 'Non trouvé')
    return NextResponse.json({ error: msg }, { status: 404 })
  }

  const [inventory, tests] = await Promise.all([
    db.productInventory.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
    db.waterTest.findMany({ where: { userId }, take: 10, orderBy: { createdAt: 'desc' } }),
  ])

  const assessment = calculateRestockNeeds(
    inventory.map((p) => ({
      id: p.id,
      productName: p.productName,
      category: p.category,
      quantity: p.quantity,
      unit: p.unit,
      concentration: p.concentration,
    })),
    tests.map((t) => ({
      ph: t.ph,
      freeChlorine: t.freeChlorine,
      alkalinity: t.alkalinity,
      cyanuricAcid: t.cyanuricAcid,
      salt: t.salt,
      temperature: t.temperature,
      createdAt: t.createdAt,
    })),
    {
      volume: profile.volume,
      unit: profile.unit,
      treatmentType: profile.treatmentType,
      saltSystem: profile.saltSystem,
    },
  )

  return NextResponse.json(assessment)
}
