import { NextRequest, NextResponse } from 'next/server'
import { GUIDES, CATEGORIES, recommendGuides } from '@/lib/pool/guides-data'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  const category = searchParams.get('category')
  const recommend = searchParams.get('recommend')

  if (id) {
    const guide = GUIDES.find((g) => g.id === id)
    if (!guide) return NextResponse.json({ error: 'Guide introuvable' }, { status: 404 })
    // Track view
    await db.guideView.create({ data: { guideId: id } })
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
