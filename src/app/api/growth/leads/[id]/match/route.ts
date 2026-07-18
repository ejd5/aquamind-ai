/**
 * AQWELIA Growth OS — Lead matching API.
 *
 * URL: /api/growth/leads/[id]/match
 *
 * POST — run the matching agent. Body:
 *        `{ organizations: [{ id, name, city?, zipCode?, specialties[], capacity, rating, distanceKm? }] }`.
 *        If no organizations are provided, the API discovers eligible
 *        organizations but never invents capacity, rating or specialties.
 *
 * Auth: NextAuth session required.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { pickLocale, translate } from '@/lib/i18n-api'
import { matching, type MatchingInput } from '@/lib/growth/agents'

export const runtime = 'nodejs'

type Ctx = { params: Promise<{ id: string }> }

async function getUserOrganization(userId: string) {
  const owned = await db.organization.findFirst({
    where: { ownerId: userId },
    orderBy: { createdAt: 'asc' },
  })
  if (owned) return owned
  const membership = await db.organizationMember.findFirst({
    where: { userId, status: 'active' },
    orderBy: { createdAt: 'asc' },
    include: { organization: true },
  })
  return membership?.organization ?? null
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const locale = pickLocale(req)
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    const msg = await translate(locale, 'common.errors.unauthorized', 'Non autorisé')
    return NextResponse.json({ error: msg }, { status: 401 })
  }

  const { id } = await ctx.params
  const org = await getUserOrganization(session.user.id)
  if (!org) return NextResponse.json({ error: 'Organisation requise' }, { status: 409 })

  const lead = await db.lead.findFirst({
    where: { id, organizationId: org.id },
    select: { id: true, country: true, city: true, zipCode: true, serviceType: true },
  })
  if (!lead) {
    const msg = await translate(locale, 'common.errors.notFound', 'Non trouvé')
    return NextResponse.json({ error: msg }, { status: 404 })
  }

  let body: any = {}
  try {
    body = await req.json()
  } catch {
    // empty body is OK — we'll auto-discover organizations.
  }

  let organizations: MatchingInput['organizations'] = Array.isArray(body?.organizations)
    ? body.organizations.map((o: any) => ({
        id: String(o?.id ?? ''),
        name: String(o?.name ?? ''),
        city: o?.city,
        zipCode: o?.zipCode,
        specialties: Array.isArray(o?.specialties) ? o.specialties : [],
        capacity: typeof o?.capacity === 'number' ? o.capacity : 0,
        rating: typeof o?.rating === 'number' ? o.rating : 0,
        distanceKm: typeof o?.distanceKm === 'number' ? o.distanceKm : undefined,
      }))
    : []

  // Auto-discover organizations in the same country if none provided.
  if (organizations.length === 0) {
    const candidates = await db.organization.findMany({
      where: {
        status: 'active',
        country: lead.country,
      },
      take: 20,
      orderBy: { createdAt: 'asc' },
    })
    organizations = candidates.map((o) => ({
      id: o.id,
      name: o.name,
      city: o.city ?? undefined,
      zipCode: o.zipCode ?? undefined,
      specialties: [],
      capacity: 0,
      rating: 0,
    }))
  }

  try {
    const result = await matching(
      {
        organizationId: org?.id,
        userId: session.user.id,
        leadId: id,
        objective: 'Match lead to best professional',
        tools: ['matching_scorer', 'lead_assign'],
        budget: 0.2,
        maxActions: 5,
      },
      { leadId: id, organizations }
    )
    return NextResponse.json({ result })
  } catch (err) {
    console.error('[growth/match] error:', err)
    const msg = await translate(
      locale,
      'growth.errors.generic',
      'Une erreur est survenue.'
    )
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
