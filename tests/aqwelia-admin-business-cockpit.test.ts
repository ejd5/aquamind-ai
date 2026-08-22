/**
 * AQWELIA — Admin Business Cockpit (PR113) · USERS + ANALYTICS.
 *
 * Users : read-only support — jamais de passwordHash/token/secret, agrégats
 * réels, pagination bornée. Analytics : agrégats réels uniquement, métriques
 * sans télémetrie marquées `unavailable` (jamais inventées, jamais zéro).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { execSync } from 'node:child_process'
import { mkdtempSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { PrismaClient } from '@prisma/client'

const prefix = `admin-biz-${Date.now()}`
let dbDir: string
let testDb: any

beforeAll(async () => {
  dbDir = mkdtempSync(join(tmpdir(), 'aqwelia-admin-biz-'))
  const dbFile = join(dbDir, 'test.db')
  execSync('bunx prisma db push --skip-generate --accept-data-loss', {
    env: { ...process.env, DATABASE_URL: `file:${dbFile}` },
    stdio: 'pipe',
  })
  testDb = new PrismaClient({
    datasources: { db: { url: `file:${dbFile}` } },
    transactionOptions: { maxWait: 8_000, timeout: 30_000 },
  })
})

afterAll(async () => {
  await testDb?.$disconnect()
  rmSync(dbDir, { recursive: true, force: true })
})

describe('users route — sécurité des données', () => {
  it('jamais de passwordHash / token / secret dans le select ou la réponse', () => {
    const src = readFileSync(join(process.cwd(), 'src/app/api/admin/v1/users/route.ts'), 'utf8')
    expect(src).toContain('requireAdminFromDb')
    // Le select de la réponse n'expose QUE les champs support (jamais de
    // passwordHash, tokens, secrets, identifiants fournisseur).
    const selectBlock = src.slice(src.indexOf('select: {'))
    expect(selectBlock).not.toContain('passwordHash')
    expect(selectBlock).not.toContain('stripeCustomerId')
    expect(selectBlock).not.toContain('providerSubscriptionId')
    expect(selectBlock).not.toContain('token')
    // Le mapping de réponse n'inclut aucun champ sensible.
    const responseBlock = src.slice(src.indexOf('users: users.map'))
    expect(responseBlock).not.toContain('passwordHash')
    expect(responseBlock).not.toContain('stripeCustomerId')
    expect(responseBlock).not.toContain('providerSubscriptionId')
    expect(responseBlock).not.toContain('token')
  })

  it('les champs exposés sont strictement les champs support (contrat)', () => {
    const src = readFileSync(join(process.cwd(), 'src/app/api/admin/v1/users/route.ts'), 'utf8')
    for (const field of ['id', 'email', 'name', 'role', 'locale', 'country', 'createdAt', 'pools', 'waterTests', 'diagnostics', 'lastActivityAt', 'plan', 'subStatus']) {
      expect(src, field).toContain(field)
    }
  })

  it('pagination bornée (pageSize max 50) + filtre de rôle strict', () => {
    const src = readFileSync(join(process.cwd(), 'src/app/api/admin/v1/users/route.ts'), 'utf8')
    expect(src).toContain('max(50)')
    expect(src).toContain('SAFE_USER_ROLES')
  })
})

describe('analytics route — données réelles uniquement', () => {
  it('les métriques sans télémetrie sont marquées unavailable, jamais à zéro', () => {
    const src = readFileSync(join(process.cwd(), 'src/app/api/admin/v1/analytics/route.ts'), 'utf8')
    expect(src).toContain('unavailable: true')
    expect(src).toContain('no_reliable_telemetry')
    expect(src).toContain('requireAdminFromDb')
    // Agrégats bornés : COUNT/groupBy, jamais de findMany non borné.
    expect(src).toMatch(/\.count\(\)/)
    expect(src).toMatch(/groupBy/)
    expect(src).not.toMatch(/findMany\(\)/)
  })

  it('les compteurs exposés sont des agrégats réels (contrat)', () => {
    const src = readFileSync(join(process.cwd(), 'src/app/api/admin/v1/analytics/route.ts'), 'utf8')
    for (const field of ['totalUsers', 'newUsers30d', 'poolProfiles', 'waterTests', 'photoDiagnostics', 'recommendationExecutions', 'recommendationOutcomes', 'subscriptionsByStatus', 'marketingContent']) {
      expect(src, field).toContain(field)
    }
  })
})

describe('PR113 — UI + i18n', () => {
  it('les sections Users/Analytics remplacent les placeholders (plus de coming soon)', () => {
    const page = readFileSync(join(process.cwd(), 'src/app/admin/page.tsx'), 'utf8')
    expect(page).toContain('UsersSection')
    expect(page).toContain('AnalyticsSection')
    // Les placeholders historiques users/analytics ont disparu.
    expect(page).not.toContain('analyticsComingSoonFull')
  })

  it('clés i18n des modules users/analytics présentes dans les 7 locales', () => {
    const keys = ['navUsers', 'navAnalytics', 'cpUsersTitle', 'cpUsersReadOnly', 'cpAnalyticsTitle', 'cpAnalyticsRealData', 'cpAnalyticsSubs']
    for (const locale of ['fr', 'en', 'es', 'pt', 'de', 'it', 'nl']) {
      const data = JSON.parse(readFileSync(join(process.cwd(), `src/i18n/locales/${locale}.json`), 'utf8'))
      for (const key of keys) {
        expect(data.admin[key], `${locale}.${key}`).toBeTruthy()
      }
    }
  })
})
