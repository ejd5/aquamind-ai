/**
 * AQWELIA — Admin Control Plane · ANNOUNCEMENTS (PR111).
 * GET = liste ; POST = création d'un BROUILLON (jamais de publish ici).
 * Mêmes garanties que bannières/popups : requireAdminFromDb, Zod, audit.
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdminFromDb } from '@/lib/admin-auth'
import { listAnnouncements, createAnnouncementDraft } from '@/lib/admin-control/service'
import { announcementPayloadSchema } from '@/lib/admin-control/schemas'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await requireAdminFromDb()
  if (!auth.authorized) return NextResponse.json({ error: auth.reason === 'no-session' ? 'Unauthorized' : 'Forbidden' }, { status: auth.reason === 'no-session' ? 401 : 403 })
  const announcements = await listAnnouncements()
  return NextResponse.json({ announcements }, { status: 200 })
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminFromDb()
  if (!auth.authorized) return NextResponse.json({ error: auth.reason === 'no-session' ? 'Unauthorized' : 'Forbidden' }, { status: auth.reason === 'no-session' ? 401 : 403 })

  const body = await req.json().catch(() => null)
  const parsed = announcementPayloadSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_payload', details: parsed.error.flatten().fieldErrors }, { status: 400 })
  }
  const announcement = await createAnnouncementDraft(parsed.data, { id: auth.userId, email: auth.email })
  return NextResponse.json({ announcement }, { status: 201 })
}
