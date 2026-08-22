/**
 * AQWELIA — Admin Business Cockpit (PR113) · USERS + ANALYTICS — READ ONLY.
 *
 * USERS : cockpit support sûr — identité, dates, agrégats d'activité réels,
 * résumé d'abonnement canonique. JAMAIS : passwordHash, tokens, secrets,
 * données de paiement sensibles. Aucune mutation (V1 = read-only).
 *
 * ANALYTICS : agrégats réels uniquement (COUNT/groupBy bornés, pas de scan
 * non borné). Les métriques sans donnée fiable sont marquées `unavailable`,
 * jamais inventées ni affichées à zéro.
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdminFromDb } from '@/lib/admin-auth'
import { db } from '@/lib/db'
import { z } from 'zod'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/* ────────────────────────────────────────────────────────────────────────────
   USERS — liste paginée + recherche + agrégats
   ──────────────────────────────────────────────────────────────────────────── */

const usersQuerySchema = z.object({
  q: z.string().max(120).optional(),
  role: z.string().max(20).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
})

const SAFE_USER_ROLES = new Set(['user', 'pro', 'business', 'admin'])

export async function GET(req: NextRequest) {
  const auth = await requireAdminFromDb()
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.reason === 'no-session' ? 'Unauthorized' : 'Forbidden' }, { status: auth.reason === 'no-session' ? 401 : 403 })
  }

  const url = new URL(req.url)
  const parsed = usersQuerySchema.safeParse({
    q: url.searchParams.get('q') ?? undefined,
    role: url.searchParams.get('role') ?? undefined,
    page: url.searchParams.get('page') ?? 1,
    pageSize: url.searchParams.get('pageSize') ?? 20,
  })
  if (!parsed.success) return NextResponse.json({ error: 'invalid_query' }, { status: 400 })

  const { q, role, page, pageSize } = parsed.data
  if (role && !SAFE_USER_ROLES.has(role)) return NextResponse.json({ error: 'invalid_role' }, { status: 400 })

  const where: Record<string, unknown> = {}
  if (q) {
    where.OR = [
      { email: { contains: q } },
      { name: { contains: q } },
    ]
  }
  if (role) where.role = role

  // La page d'abord (bornée), puis les agrégats groupBy sur les IDs de la page.
  const [total, users] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        locale: true,
        country: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
  ])

  const ids = users.map((u) => u.id)
  let aggregates: Record<string, { pools: number; waterTests: number; diagnostics: number; lastActivityAt: string | null; plan: string | null; subStatus: string | null }> = {}
  if (ids.length > 0) {
    const [pools, waterTests, diagnostics, subscriptions] = await Promise.all([
      db.poolProfile.groupBy({ by: ['userId'], where: { userId: { in: ids } }, _count: { _all: true } }),
      db.waterTest.groupBy({ by: ['userId'], where: { userId: { in: ids } }, _count: { _all: true }, _max: { createdAt: true } }),
      db.photoDiagnostic.groupBy({ by: ['userId'], where: { userId: { in: ids } }, _count: { _all: true }, _max: { createdAt: true } }),
      db.subscription.findMany({
        where: { userId: { in: ids } },
        orderBy: { startedAt: 'desc' },
        select: { userId: true, plan: true, status: true },
      }),
    ])
    const subByUser = new Map<string, { plan: string; status: string }>()
    for (const sub of subscriptions) {
      if (!subByUser.has(sub.userId)) subByUser.set(sub.userId, { plan: sub.plan ?? 'unknown', status: sub.status })
    }
    aggregates = Object.fromEntries(
      ids.map((id) => {
        const wt = waterTests.find((w) => w.userId === id)
        const diag = diagnostics.find((d) => d.userId === id)
        const last = [wt?._max.createdAt, diag?._max.createdAt].filter(Boolean).sort().reverse()[0]
        return [
          id,
          {
            pools: pools.find((p) => p.userId === id)?._count._all ?? 0,
            waterTests: wt?._count._all ?? 0,
            diagnostics: diag?._count._all ?? 0,
            lastActivityAt: last ? (last as Date).toISOString() : null,
            plan: subByUser.get(id)?.plan ?? null,
            subStatus: subByUser.get(id)?.status ?? null,
          },
        ]
      })
    )
  }

  return NextResponse.json(
    {
      users: users.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        locale: u.locale,
        country: u.country,
        createdAt: u.createdAt,
        ...(aggregates[u.id] ?? { pools: 0, waterTests: 0, diagnostics: 0, lastActivityAt: null, plan: null, subStatus: null }),
      })),
      pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
    },
    { status: 200, headers: { 'Cache-Control': 'private, no-store, max-age=0' } }
  )
}
