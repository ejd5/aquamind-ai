/**
 * AQWELIA — Admin Control Plane · SYSTEM STATUS (PR111) — READ ONLY.
 *
 * GET /api/admin/v1/system
 *
 * Informations opérationnelles SÛRES uniquement. JAMAIS :
 *   - chaînes de connexion ;
 *   - clés API / tokens / mots de passe ;
 *   - valeurs d'environnement brutes ;
 *   - secrets de toute nature.
 *
 * Les health checks ont un timeout borné et ne peuvent jamais faire crasher
 * l'admin (try/catch + Promise.race). Statuts : HEALTHY / DEGRADED /
 * UNAVAILABLE / UNKNOWN. Aucun contrôle de mutation.
 */
import { NextResponse } from 'next/server'
import { requireAdminFromDb } from '@/lib/admin-auth'
import { db } from '@/lib/db'
import { resolveDatabaseProvider } from '@/lib/database-provider'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const HEALTH_TIMEOUT_MS = 3000

async function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      promise,
      new Promise<T>((resolve) => {
        timer = setTimeout(() => resolve(fallback), ms)
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

type Health = 'HEALTHY' | 'DEGRADED' | 'UNAVAILABLE' | 'UNKNOWN'

function providerName(): string {
  try {
    return resolveDatabaseProvider(process.env.DATABASE_PROVIDER, process.env.DATABASE_URL)
  } catch {
    return 'unknown'
  }
}

export async function GET() {
  const auth = await requireAdminFromDb()
  if (!auth.authorized) {
    return NextResponse.json(
      { error: auth.reason === 'no-session' ? 'Unauthorized' : 'Forbidden' },
      { status: auth.reason === 'no-session' ? 401 : 403 }
    )
  }

  // ── Base de données : ping borné, ne crashe jamais ──
  let dbHealth: Health = 'UNKNOWN'
  let migrationCount: number | null = null
  let adminTablesOk = false
  try {
    await withTimeout(db.$queryRaw`SELECT 1`, HEALTH_TIMEOUT_MS, null)
    dbHealth = 'HEALTHY'
  } catch {
    dbHealth = 'UNAVAILABLE'
  }

  if (dbHealth === 'HEALTHY') {
    // État des migrations Prisma (métadonnées sûres, agrégat uniquement).
    try {
      const rows = (await withTimeout(
        db.$queryRaw`SELECT COUNT(*) AS count FROM "_prisma_migrations"`,
        HEALTH_TIMEOUT_MS,
        null
      )) as unknown as Array<{ count: number | bigint }> | null
      migrationCount = rows && rows.length > 0 ? Number(rows[0].count) : null
    } catch {
      migrationCount = null
    }

    // Disponibilité des tables du Control Plane (agrégats bornés).
    try {
      const checks = await withTimeout(
        Promise.all([
          db.adminContentBanner.count().catch(() => -1),
          db.adminContentPopup.count().catch(() => -1),
          db.adminContentAnnouncement.count().catch(() => -1),
          db.adminAgentProposal.count().catch(() => -1),
        ]),
        HEALTH_TIMEOUT_MS,
        null
      )
      adminTablesOk = checks !== null && checks.every((c) => c >= 0)
    } catch {
      adminTablesOk = false
    }
  }

  // ── Présence de configuration fournisseur : BOOLÉENS uniquement ──
  const providerPresence = {
    stripe: Boolean(process.env.STRIPE_SECRET_KEY),
    revenuecat: Boolean(process.env.REVENUECAT_API_KEY),
    storage: false,
  }

  const gitSha =
    process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ??
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ??
    null

  let appVersion: string | null = null
  try {
    const { readFileSync } = await import('node:fs')
    const { join } = await import('node:path')
    const raw = readFileSync(join(process.cwd(), 'package.json'), 'utf8')
    appVersion = (JSON.parse(raw) as { version?: string }).version ?? null
  } catch {
    appVersion = null
  }

  const overall: Health =
    dbHealth === 'UNAVAILABLE' ? 'DEGRADED' : dbHealth === 'HEALTHY' && adminTablesOk ? 'HEALTHY' : dbHealth

  return NextResponse.json(
    {
      status: overall,
      runtime: new Date().toISOString(),
      environment: process.env.NODE_ENV ?? 'unknown',
      appVersion,
      gitSha,
      database: {
        provider: providerName(),
        connectivity: dbHealth,
        prismaMigrationsApplied: migrationCount,
      },
      adminControlPlane: {
        tablesAvailable: adminTablesOk,
      },
      providerConfigurationPresence: providerPresence,
    },
    { status: 200, headers: { 'Cache-Control': 'private, no-store, max-age=0' } }
  )
}
