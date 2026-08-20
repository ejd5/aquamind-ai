/**
 * AQWELIA — Admin Control Plane V1 · bannière individuelle.
 * PATCH = mise à jour du brouillon (optimistic concurrency) ;
 * POST  = action humaine explicite (publish/schedule/pause/archive + raison).
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdminFromDb } from '@/lib/admin-auth'
import { updateBannerDraft, setBannerStatus } from '@/lib/admin-control/service'
import { bannerPatchSchema, bannerPublishSchema } from '@/lib/admin-control/schemas'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminFromDb()
  if (!auth.authorized) return NextResponse.json({ error: auth.reason === 'no-session' ? 'Unauthorized' : 'Forbidden' }, { status: auth.reason === 'no-session' ? 401 : 403 })

  const { id } = await params
  const body = await req.json().catch(() => null)
  const parsed = bannerPatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_payload', details: parsed.error.flatten().fieldErrors }, { status: 400 })
  }
  const result = await updateBannerDraft(id, parsed.data, { id: auth.userId, email: auth.email })
  if (!result.ok) {
    const status = result.error === 'not_found' ? 404 : result.error === 'stale_version' ? 409 : 400
    return NextResponse.json({ error: result.error }, { status })
  }
  return NextResponse.json({ banner: result.banner }, { status: 200 })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminFromDb()
  if (!auth.authorized) return NextResponse.json({ error: auth.reason === 'no-session' ? 'Unauthorized' : 'Forbidden' }, { status: auth.reason === 'no-session' ? 401 : 403 })

  const { id } = await params
  const body = await req.json().catch(() => null)
  const parsed = bannerPublishSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_payload', details: parsed.error.flatten().fieldErrors }, { status: 400 })
  }
  const result = await setBannerStatus(id, parsed.data, { id: auth.userId, email: auth.email })
  if (!result.ok) {
    const status = result.error === 'not_found' ? 404 : result.error === 'stale_version' ? 409 : 400
    return NextResponse.json({ error: result.error }, { status })
  }
  return NextResponse.json({ banner: result.banner }, { status: 200 })
}
