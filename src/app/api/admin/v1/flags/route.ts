/**
 * AQWELIA — Admin Control Plane V1 · feature flags SÛRS (lecture seule).
 * Seule l'allowlist produit explicite est exposée ; les flags critiques
 * (sécurité/paiement/auth/infra) ne sont jamais listés ni modifiables.
 */
import { NextResponse } from 'next/server'
import { requireAdminFromDb } from '@/lib/admin-auth'
import { getSafeFlagsView, isCriticalFlagKey } from '@/lib/admin-control/safe-flags'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await requireAdminFromDb()
  if (!auth.authorized) return NextResponse.json({ error: auth.reason === 'no-session' ? 'Unauthorized' : 'Forbidden' }, { status: auth.reason === 'no-session' ? 401 : 403 })

  const flags = getSafeFlagsView().filter((f) => !isCriticalFlagKey(f.key))
  return NextResponse.json({ flags, criticalPatterns: [], readOnly: true }, { status: 200 })
}
