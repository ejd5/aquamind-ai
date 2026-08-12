/**
 * AQWELIA Launch offers — P1 #1 : autorisation des administrateurs.
 *
 * Vérifie que `requireAdminFromDb` / `isUserAdmin` :
 *  - autorisent un utilisateur dont le rôle en base est `admin` ;
 *  - refusent un utilisateur authentifié mais non admin ;
 *  - refusent une session absente/invalide ;
 *  - ignorent tout rôle fourni côté client (champ de session falsifié ou corps
 *    de requête) : le rôle est relu en base au moment du contrôle.
 *
 * (Le mapping 401/403/200 de la route est couvert par
 * `aqwelia-launch-offers-admin-route.test.ts`.)
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { execSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { PrismaClient } from '@prisma/client'
import { requireAdminFromDb, isUserAdmin } from '@/lib/admin-auth'

process.env.AQWELIA_LAUNCH_OFFERS_ENABLED = 'true'
process.env.AQWELIA_LAUNCH_TOKEN_SECRET = 'admin-test-token-secret'

// Session NextAuth contrôlable par test (vi.mock est hoisté).
const sessionHolder: { current: any } = { current: null }
vi.mock('next-auth', () => ({
  getServerSession: () => sessionHolder.current,
}))

const prefix = `launch-admin-${Date.now()}`
let dbDir: string
let dbFile: string
let testDb: any

beforeAll(async () => {
  dbDir = mkdtempSync(join(tmpdir(), 'aqwelia-launch-admin-'))
  dbFile = join(dbDir, 'test.db')
  execSync(`bunx prisma db push --skip-generate --accept-data-loss`, {
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

describe('requireAdminFromDb — rôle lu en base, jamais de la session', () => {
  it('autorise un administrateur réel (rôle admin en base)', async () => {
    const admin = await testDb.user.create({ data: { email: `${prefix}-a1@aqwelia.test`, passwordHash: 'x', role: 'admin' } })
    try {
      sessionHolder.current = { user: { id: admin.id, email: admin.email } }
      const res = await requireAdminFromDb(testDb)
      expect(res.authorized).toBe(true)
      if (res.authorized) expect(res.userId).toBe(admin.id)
    } finally {
      await testDb.user.deleteMany({ where: { id: admin.id } })
      sessionHolder.current = null
    }
  })

  it('refuse un utilisateur non administrateur', async () => {
    const user = await testDb.user.create({ data: { email: `${prefix}-u1@aqwelia.test`, passwordHash: 'x', role: 'user' } })
    try {
      sessionHolder.current = { user: { id: user.id, email: user.email } }
      const res = await requireAdminFromDb(testDb)
      expect(res.authorized).toBe(false)
      if (!res.authorized) expect(res.reason).toBe('not-admin')
    } finally {
      await testDb.user.deleteMany({ where: { id: user.id } })
      sessionHolder.current = null
    }
  })

  it('refuse une session absente ou invalide', async () => {
    sessionHolder.current = null
    const res = await requireAdminFromDb(testDb)
    expect(res.authorized).toBe(false)
    if (!res.authorized) expect(res.reason).toBe('no-session')
  })

  it('ignore un rôle falsifié côté client (champ session/body)', async () => {
    // L'utilisateur est un simple « user » en base, mais la session (telle que
    // manipulée par le client) prétend être « admin ». Le rôle en base prime.
    const user = await testDb.user.create({ data: { email: `${prefix}-f@aqwelia.test`, passwordHash: 'x', role: 'user' } })
    try {
      sessionHolder.current = { user: { id: user.id, email: user.email, role: 'admin' } }
      const res = await requireAdminFromDb(testDb)
      expect(res.authorized).toBe(false)
      if (!res.authorized) expect(res.reason).toBe('not-admin')
      expect(await isUserAdmin(user.id, testDb)).toBe(false)
    } finally {
      await testDb.user.deleteMany({ where: { id: user.id } })
      sessionHolder.current = null
    }
  })

  it('isUserAdmin ne dépend que de la base (aucun paramètre client)', async () => {
    const admin = await testDb.user.create({ data: { email: `${prefix}-a2@aqwelia.test`, passwordHash: 'x', role: 'admin' } })
    const user = await testDb.user.create({ data: { email: `${prefix}-u2@aqwelia.test`, passwordHash: 'x', role: 'user' } })
    try {
      expect(await isUserAdmin(admin.id, testDb)).toBe(true)
      expect(await isUserAdmin(user.id, testDb)).toBe(false)
    } finally {
      await testDb.user.deleteMany({ where: { id: { in: [admin.id, user.id] } } })
    }
  })
})
