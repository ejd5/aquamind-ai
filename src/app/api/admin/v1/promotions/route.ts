/**
 * AQWELIA — Admin Control Plane V1 · PROMOTIONS — ENDPOINT READ ONLY.
 *
 * GET /api/admin/v1/promotions
 *
 * Règles strictes (périmètre PR #108 : promotions = READ ONLY) :
 *   - requireAdminFromDb() avant tout (401 / 403) ;
 *   - STRICTEMENT GET : aucune méthode POST/PATCH/DELETE exposée ;
 *   - aucune écriture, aucune création de PromotionCampaign : lecture de
 *     l'existant uniquement (aucun amorçage implicite de campagne) ;
 *   - aucune action de pilotage (statut, réallocation, restauration) ;
 *   - le moteur commercial existant (PromotionCampaign/Variant/Allocation/
 *     Reservation/Redemption/AuditLog) reste la source de vérité — la
 *     gestion complète fera l'objet d'une PR dédiée.
 *
 * Réponse canonique :
 *   { campaigns: [{ code, name, status, totalQuota, confirmedCount,
 *                   startsAt, endsAt }] }
 */
import { NextResponse } from 'next/server'
import { requireAdminFromDb } from '@/lib/admin-auth'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await requireAdminFromDb()
  if (!auth.authorized) {
    return NextResponse.json(
      { error: auth.reason === 'no-session' ? 'Unauthorized' : 'Forbidden' },
      { status: auth.reason === 'no-session' ? 401 : 403 }
    )
  }

  // Lecture seule de TOUTES les campagnes existantes (y compris DRAFT).
  // Aucun seed, aucune mutation, aucune écriture.
  const campaigns = await db.promotionCampaign.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      code: true,
      name: true,
      status: true,
      totalQuota: true,
      confirmedCount: true,
      startsAt: true,
      endsAt: true,
    },
  })

  return NextResponse.json({ campaigns }, { status: 200 })
}
