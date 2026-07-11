import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { GUIDES, CATEGORIES, recommendGuides } from '@/lib/pool/guides-data'
import { db } from '@/lib/db'
import { pickLocale, translate } from '@/lib/i18n-api'
import { requireFeatureAccess } from '@/lib/billing/gate'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const locale = pickLocale(req)
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  const category = searchParams.get('category')
  const recommend = searchParams.get('recommend')

  // Auth optional — catalog is public, but GuideView tracking requires userId.
  const session = await getServerSession(authOptions).catch(() => null)
  const userId = session?.user?.id

  if (id) {
    const guide = GUIDES.find((g) => g.id === id)
    if (!guide) {
      const msg = await translate(locale, 'common.errors.guideNotFound', 'Guide introuvable')
      return NextResponse.json({ error: msg }, { status: 404 })
    }
    // P0-B: Feature gate — only premium guides are gated.
    // Basic guides (first 5) remain accessible to all users.
    const isPremium = guide.level === 'expert' || guide.level === 'intermediate'
    if (isPremium) {
      const gate = await requireFeatureAccess(req, 'guides_premium')
      if (gate.denied) return gate.response!
    }
    // Track view only if user is authenticated
    if (userId) {
      await db.guideView.create({ data: { userId, guideId: id } }).catch(() => null)
    }
    return NextResponse.json({ guide })
  }

  if (recommend) {
    // recommendation context from query params
    const ctx = {
      problemDetected: searchParams.get('problem') || undefined,
      photoType: searchParams.get('photo') || undefined,
      weatherAlerts: searchParams.get('weather')?.split(',').filter(Boolean) || [],
      isNewUser: searchParams.get('new') === '1',
      hasSaltSystem: searchParams.get('salt') === '1',
      isSpa: searchParams.get('spa') === '1',
      season: searchParams.get('season') || undefined,
    }
    return NextResponse.json({ guides: recommendGuides(ctx) })
  }

  let guides = GUIDES
  if (category) guides = guides.filter((g) => g.category === category)

  return NextResponse.json({ guides, categories: CATEGORIES })
}
