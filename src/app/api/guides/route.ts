import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { GUIDES, CATEGORIES, recommendGuides } from '@/lib/pool/guides-data'
import { db } from '@/lib/db'
import { pickLocale, translate } from '@/lib/i18n-api'
import { requireFeatureAccess } from '@/lib/billing/gate'

export const runtime = 'nodejs'

// P0-B correctif 6: Explicit, stable list of 5 free guides
const FREE_GUIDE_IDS = new Set([
  'green-water',
  'cloudy-water',
  'chlorine-shock',
  'combined-chlorine',
  'filter-backwash',
])

function isPremiumGuide(guideId: string): boolean {
  return !FREE_GUIDE_IDS.has(guideId)
}

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
    // Free guides (explicit list) remain accessible to all users.
    if (isPremiumGuide(id)) {
      const gate = await requireFeatureAccess(req, 'guides_premium')
      if (gate.denied) {
        // Return guide metadata WITHOUT steps (locked preview)
        return NextResponse.json({
          guide: {
            ...guide,
            steps: [], // Don't expose premium steps
            locked: true,
          },
        })
      }
    }
    // Track view only if user is authenticated
    if (userId) {
      await db.guideView.create({ data: { userId, guideId: id } }).catch(() => null)
    }
    return NextResponse.json({ guide })
  }

  if (recommend) {
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

  // Catalog: return all guides, but mark premium ones as locked (no steps)
  let guides = GUIDES
  if (category) guides = guides.filter((g) => g.category === category)

  // For unauthenticated or free users: return premium guides without steps
  const publicGuides = guides.map(g => {
    if (isPremiumGuide(g.id)) {
      return { ...g, steps: [], locked: true }
    }
    return g
  })

  return NextResponse.json({ guides: publicGuides, categories: CATEGORIES })
}
