/**
 * AQWELIA — Admin Control Plane V1 · route bannières.
 * GET = liste ; POST = création d'un BROUILLON (jamais de publish ici).
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdminFromDb } from '@/lib/admin-auth'
import { listBanners, createBannerDraft } from '@/lib/admin-control/service'
import { bannerPayloadSchema } from '@/lib/admin-control/schemas'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await requireAdminFromDb()
  if (!auth.authorized) return NextResponse.json({ error: auth.reason === 'no-session' ? 'Unauthorized' : 'Forbidden' }, { status: auth.reason === 'no-session' ? 401 : 403 })
  const banners = await listBanners()
  return NextResponse.json({ banners }, { status: 200 })
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminFromDb()
  if (!auth.authorized) return NextResponse.json({ error: auth.reason === 'no-session' ? 'Unauthorized' : 'Forbidden' }, { status: auth.reason === 'no-session' ? 401 : 403 })

  const body = await req.json().catch(() => null)
  const parsed = bannerPayloadSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_payload', details: parsed.error.flatten().fieldErrors }, { status: 400 })
  }
  const banner = await createBannerDraft(parsed.data, { id: auth.userId, email: auth.email })
  return NextResponse.json({ banner }, { status: 201 })
}
