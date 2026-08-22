/**
 * AQWELIA — Admin Control Plane · ANNOUNCEMENT individuelle (PR111).
 * PATCH = brouillon (CAS) ; POST = action humaine explicite (raison requise).
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdminFromDb } from '@/lib/admin-auth'
import { updateAnnouncementDraft, setAnnouncementStatus } from '@/lib/admin-control/service'
import { announcementPatchSchema, announcementPublishSchema } from '@/lib/admin-control/schemas'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminFromDb()
  if (!auth.authorized) return NextResponse.json({ error: auth.reason === 'no-session' ? 'Unauthorized' : 'Forbidden' }, { status: auth.reason === 'no-session' ? 401 : 403 })

  const { id } = await params
  const body = await req.json().catch(() => null)
  const parsed = announcementPatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_payload', details: parsed.error.flatten().fieldErrors }, { status: 400 })
  }
  const result = await updateAnnouncementDraft(id, parsed.data, { id: auth.userId, email: auth.email })
  if (!result.ok) {
    const status = result.error === 'not_found' ? 404 : result.error === 'stale_version' ? 409 : 400
    return NextResponse.json({ error: result.error }, { status })
  }
  return NextResponse.json({ announcement: result.announcement }, { status: 200 })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminFromDb()
  if (!auth.authorized) return NextResponse.json({ error: auth.reason === 'no-session' ? 'Unauthorized' : 'Forbidden' }, { status: auth.reason === 'no-session' ? 401 : 403 })

  const { id } = await params
  const body = await req.json().catch(() => null)
  const parsed = announcementPublishSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_payload', details: parsed.error.flatten().fieldErrors }, { status: 400 })
  }
  const result = await setAnnouncementStatus(id, parsed.data, { id: auth.userId, email: auth.email })
  if (!result.ok) {
    const status = result.error === 'not_found' ? 404 : result.error === 'stale_version' ? 409 : 400
    return NextResponse.json({ error: result.error }, { status })
  }
  return NextResponse.json({ announcement: result.announcement }, { status: 200 })
}
