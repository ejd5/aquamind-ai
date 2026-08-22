/**
 * AQWELIA — Admin Product Control (PR112) · FEATURE FLAGS SÛRS.
 * GET = vue (env + override + effective) ; PATCH = mutation d'un flag PRODUIT
 * SÛR uniquement (allowlist stricte, raison obligatoire, audit, CAS).
 * Jamais de mutation sur sécurité/paiement/auth/infra/scientifique.
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdminFromDb } from '@/lib/admin-auth'
import { listProductFlags, setProductFlag } from '@/lib/admin-control/product-service'
import { getSafeFlagsView, isCriticalFlagKey } from '@/lib/admin-control/safe-flags'
import { z } from 'zod'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const patchSchema = z
  .object({
    key: z.string().min(3).max(120),
    enabled: z.boolean(),
    reason: z.string().min(3).max(300),
  })
  .strict()

export async function GET() {
  const auth = await requireAdminFromDb()
  if (!auth.authorized) return NextResponse.json({ error: auth.reason === 'no-session' ? 'Unauthorized' : 'Forbidden' }, { status: auth.reason === 'no-session' ? 401 : 403 })

  const flags = await listProductFlags()
  return NextResponse.json({ flags, readOnly: false, envFlags: getSafeFlagsView().filter((f) => !isCriticalFlagKey(f.key)) }, { status: 200 })
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdminFromDb()
  if (!auth.authorized) return NextResponse.json({ error: auth.reason === 'no-session' ? 'Unauthorized' : 'Forbidden' }, { status: auth.reason === 'no-session' ? 401 : 403 })

  const body = await req.json().catch(() => null)
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'invalid_payload' }, { status: 400 })

  const result = await setProductFlag(parsed.data.key, parsed.data.enabled, parsed.data.reason, { id: auth.userId, email: auth.email })
  if (!result.ok) {
    const status = result.error === 'flag_not_allowed' ? 403 : 400
    return NextResponse.json({ error: result.error }, { status })
  }
  const flags = await listProductFlags()
  return NextResponse.json({ ok: true, flags }, { status: 200 })
}
