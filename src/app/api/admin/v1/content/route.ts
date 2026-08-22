/**
 * AQWELIA — Admin Product Control (PR112) · CONTENT (allowlist stricte).
 * GET = liste des blocs ; POST = création/mise à jour d'un BROUILLON.
 * POST /[id] = transitions humaines (APPROVED/PUBLISHED/ARCHIVED + raison).
 * Aucun HTML brut, aucune clé hors allowlist, workflow humain uniquement.
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdminFromDb } from '@/lib/admin-auth'
import { listContentBlocks, upsertContentDraft, transitionContentStatus } from '@/lib/admin-control/product-service'
import { z } from 'zod'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const upsertSchema = z
  .object({
    contentKey: z.string().min(3).max(120),
    translations: z.record(z.string(), z.unknown()).optional(),
  })
  .strict()

const transitionSchema = z
  .object({
    status: z.enum(['APPROVED', 'PUBLISHED', 'ARCHIVED']),
    reason: z.string().min(3).max(300),
  })
  .strict()

export async function GET() {
  const auth = await requireAdminFromDb()
  if (!auth.authorized) return NextResponse.json({ error: auth.reason === 'no-session' ? 'Unauthorized' : 'Forbidden' }, { status: auth.reason === 'no-session' ? 401 : 403 })
  const blocks = await listContentBlocks()
  return NextResponse.json({ blocks }, { status: 200 })
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminFromDb()
  if (!auth.authorized) return NextResponse.json({ error: auth.reason === 'no-session' ? 'Unauthorized' : 'Forbidden' }, { status: auth.reason === 'no-session' ? 401 : 403 })

  const body = await req.json().catch(() => null)
  const parsed = upsertSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'invalid_payload' }, { status: 400 })

  const result = await upsertContentDraft(parsed.data.contentKey, { translations: parsed.data.translations }, { id: auth.userId, email: auth.email })
  if (!result.ok) {
    const status = result.error === 'key_not_allowed' ? 403 : 400
    return NextResponse.json({ error: result.error }, { status })
  }
  return NextResponse.json({ block: result.block }, { status: 200 })
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdminFromDb()
  if (!auth.authorized) return NextResponse.json({ error: auth.reason === 'no-session' ? 'Unauthorized' : 'Forbidden' }, { status: auth.reason === 'no-session' ? 401 : 403 })

  const body = await req.json().catch(() => null)
  const parsed = transitionSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'invalid_payload' }, { status: 400 })
  const { searchParams } = new URL(req.url)
  const contentKey = searchParams.get('contentKey')
  if (!contentKey) return NextResponse.json({ error: 'contentKey_required' }, { status: 400 })

  const result = await transitionContentStatus(contentKey, parsed.data.status, parsed.data.reason, { id: auth.userId, email: auth.email })
  if (!result.ok) {
    const status = result.error === 'key_not_allowed' ? 403 : result.error === 'not_found' ? 404 : 400
    return NextResponse.json({ error: result.error }, { status })
  }
  return NextResponse.json({ block: result.block }, { status: 200 })
}
