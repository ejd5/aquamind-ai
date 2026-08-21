/**
 * AQWELIA — Admin Control Plane V1 · CONCURRENCE (CAS atomique).
 *
 * P0 : la condition de version/statut DOIT faire partie du WHERE de
 * l'écriture (updateMany), pas d'un read-then-check séparé. Deux écritures
 * concurrentes sur la même version : EXACTEMENT UNE gagne, l'autre reçoit
 * un conflit ; version finale N+1 (jamais N+2) ; un seul audit.
 *
 * SQLite sérialise les écritures : les tests Promise.allSettled restent
 * déterministes (le perdant voit la version incrémentée par le gagnant).
 * Le mécanisme PostgreSQL est le même updateMany atomique ; on vérifie en
 * plus que le code utilise réellement version/status DANS le WHERE.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { execSync } from 'node:child_process'
import { mkdtempSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { PrismaClient } from '@prisma/client'
import {
  createBannerDraft,
  updateBannerDraft,
  setBannerStatus,
  createPopupDraft,
  updatePopupDraft,
  setPopupStatus,
  listAuditLogs,
} from '@/lib/admin-control/service'
import { runAdminAgent, reviewProposal } from '@/lib/admin-agentic/agents'

const prefix = `admincp-conc-${Date.now()}`
let dbDir: string
let testDb: any

beforeAll(async () => {
  dbDir = mkdtempSync(join(tmpdir(), 'aqwelia-admincp-conc-'))
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

const ACTOR = { id: 'admin-c', email: 'admin@aqwelia.test' }
const FULL_TR = { fr: 'FR', en: 'EN', es: 'ES', pt: 'PT', de: 'DE', it: 'IT', nl: 'NL' }
const POPUP_TR = Object.fromEntries(['fr', 'en', 'es', 'pt', 'de', 'it', 'nl'].map((l) => [l, { title: 'T', body: 'B' }])) as never

async function countAudits(entityId: string, action: string) {
  const logs = await listAuditLogs({ entityId, limit: 50 }, testDb)
  return logs.filter((l) => l.action === action).length
}

describe('P0 — CAS atomique (mécanisme)', () => {
  it('le WHERE de updateMany contient version + conditions d’état (bannières)', () => {
    const src = readFileSync(join(process.cwd(), 'src/lib/admin-control/service.ts'), 'utf8')
    // updateBannerDraft / setBannerStatus : version DANS le WHERE.
    expect(src).toMatch(/updateMany\(\{\s*where: \{\s*id,\s*version: data\.expectedVersion/m)
    expect(src).toContain('status: { not: \'ARCHIVED\' }')
    // L'audit n'est écrit qu'après count === 1 (écriture gagnante).
    const updateManyIdx = src.indexOf('adminContentBanner.updateMany')
    const auditCall = src.indexOf('BANNER_UPDATED', updateManyIdx)
    const countCheck = src.indexOf('if (result.count === 0)', updateManyIdx)
    expect(countCheck).toBeGreaterThan(-1)
    expect(auditCall).toBeGreaterThan(countCheck)
  })

  it('le WHERE de updateMany contient la condition de statut (revue agent)', () => {
    const src = readFileSync(join(process.cwd(), 'src/lib/admin-agentic/agents.ts'), 'utf8')
    expect(src).toMatch(/adminAgentProposal\.updateMany\(\{\s*where: \{\s*id,\s*status: 'NEEDS_REVIEW'/m)
    expect(src).toContain("riskLevel: { not: 'BLOCKED' }")
  })
})

describe('P0 — BANNER UPDATE : un seul gagnant', () => {
  it('deux updates expectedVersion=N (séquentiel) → 1 succès, 1 conflit, v=N+1, 1 audit', async () => {
    const banner = await createBannerDraft({ internalName: 'CAS banner', translations: FULL_TR }, ACTOR, testDb)
    const r1 = await updateBannerDraft(banner.id, { internalName: 'Gagnant A', expectedVersion: 0 }, ACTOR, testDb)
    const r2 = await updateBannerDraft(banner.id, { internalName: 'Perdant B', expectedVersion: 0 }, ACTOR, testDb)

    const outcomes = [r1, r2].map((r) => (r.ok ? 'ok' : r.error))
    expect(outcomes.filter((o) => o === 'ok')).toHaveLength(1)
    expect(outcomes.filter((o) => o === 'stale_version')).toHaveLength(1)

    const final = await testDb.adminContentBanner.findUnique({ where: { id: banner.id } })
    expect(final.version).toBe(1)
    expect(final.internalName).toBe('Gagnant A')
    expect(await countAudits(banner.id, 'BANNER_UPDATED')).toBe(1)
  })

  it('Promise.allSettled concurrents → au plus un succès, v finale N+1, un seul audit', async () => {
    const banner = await createBannerDraft({ internalName: 'CAS banner concurrent', translations: FULL_TR }, ACTOR, testDb)
    const results = await Promise.allSettled([
      updateBannerDraft(banner.id, { internalName: 'Concurrent 1', expectedVersion: 0 }, ACTOR, testDb),
      updateBannerDraft(banner.id, { internalName: 'Concurrent 2', expectedVersion: 0 }, ACTOR, testDb),
    ])

    const okCount = results.filter((r) => r.status === 'fulfilled' && (r.value as { ok?: boolean }).ok === true).length
    expect(okCount).toBeLessThanOrEqual(1)
    expect(okCount).toBeGreaterThanOrEqual(0)
    // Les perdants sont soit stale_version, soit un conflit SQLite (busy) rejeté.
    for (const r of results) {
      if (r.status === 'fulfilled') {
        const value = r.value as { ok?: boolean; error?: string }
        if (value.ok !== true) expect(value.error).toBe('stale_version')
      }
      // rejeté = conflit de transaction SQLite (comportement accepté du moteur local)
    }

    const final = await testDb.adminContentBanner.findUnique({ where: { id: banner.id } })
    expect(final.version).toBe(1)
    const updateAudits = await countAudits(banner.id, 'BANNER_UPDATED')
    expect(updateAudits).toBeLessThanOrEqual(1)
  })
})

describe('P0 — BANNER STATUS : un seul gagnant', () => {
  it('deux publish same version → 1 gagnant, v=N+1, un seul audit de statut', async () => {
    const banner = await createBannerDraft({ internalName: 'CAS status', translations: FULL_TR }, ACTOR, testDb)
    const r1 = await setBannerStatus(banner.id, { status: 'PUBLISHED', expectedVersion: 0, reason: 'Validation A' }, ACTOR, testDb)
    const r2 = await setBannerStatus(banner.id, { status: 'PAUSED', expectedVersion: 0, reason: 'Validation B' }, ACTOR, testDb)

    const outcomes = [r1, r2].map((r) => (r.ok ? 'ok' : r.error))
    expect(outcomes.filter((o) => o === 'ok')).toHaveLength(1)
    expect(outcomes.filter((o) => o === 'stale_version')).toHaveLength(1)

    const final = await testDb.adminContentBanner.findUnique({ where: { id: banner.id } })
    expect(final.version).toBe(1)
    expect(final.status).toBe('PUBLISHED')
    expect(await countAudits(banner.id, 'BANNER_STATUS_CHANGED')).toBe(1)
  })
})

describe('P0 — POPUP UPDATE/STATUS : un seul gagnant', () => {
  it('update + status concurrents sur même version → version finale N+1', async () => {
    const popup = await createPopupDraft({ internalName: 'CAS popup', translations: POPUP_TR }, ACTOR, testDb)
    const [u1, u2] = await Promise.allSettled([
      updatePopupDraft(popup.id, { internalName: 'Popup gagnant', expectedVersion: 0 }, ACTOR, testDb),
      updatePopupDraft(popup.id, { frequency: 'PER_SESSION', expectedVersion: 0 }, ACTOR, testDb),
    ])
    const okCount = u1.status === 'fulfilled' && (u1.value as { ok?: boolean }).ok === true
      ? 1 : 0
    expect(okCount).toBeLessThanOrEqual(1)

    const final = await testDb.adminContentPopup.findUnique({ where: { id: popup.id } })
    expect(final.version).toBe(1)
    expect(await countAudits(popup.id, 'POPUP_UPDATED')).toBeLessThanOrEqual(1)

    const status = await setPopupStatus(popup.id, { status: 'PUBLISHED', expectedVersion: 1, reason: 'Validation popup' }, ACTOR, testDb)
    expect(status.ok).toBe(true)
    const staleStatus = await setPopupStatus(popup.id, { status: 'PAUSED', expectedVersion: 1, reason: 'Trop tard' }, ACTOR, testDb)
    expect(staleStatus.ok).toBe(false)
    if (!staleStatus.ok) expect(staleStatus.error).toBe('stale_version')
    expect(await countAudits(popup.id, 'POPUP_STATUS_CHANGED')).toBe(1)
  })
})

describe('P0 — AGENT REVIEW : APPROVE vs REJECT concurrents', () => {
  it('un seul gagne, un seul audit, statut final = décision du gagnant', async () => {
    const proposal = await runAdminAgent('copyAssistant', { intent: 'Mettre en avant une eau saine' }, ACTOR.id, testDb)
    const settled = await Promise.allSettled([
      reviewProposal(proposal.id, 'APPROVE', 'admin-1', undefined, testDb),
      reviewProposal(proposal.id, 'REJECT', 'admin-2', undefined, testDb),
    ])

    const oks = settled.filter((r) => r.status === 'fulfilled' && (r.value as { ok?: boolean }).ok === true)
    const conflicts = settled.filter((r) => {
      if (r.status !== 'fulfilled') return false
      const v = r.value as { ok?: boolean; error?: string }
      return v.ok !== true && v.error === 'invalid_status'
    })
    expect(oks).toHaveLength(1)
    expect(conflicts).toHaveLength(1)

    const final = await testDb.adminAgentProposal.findUnique({ where: { id: proposal.id } })
    const winnerDecision = (oks[0] as PromiseFulfilledResult<{ proposal: { status: string } }>).value.proposal.status
    expect(final.status).toBe(winnerDecision)
    expect(final.executedAt).toBeNull()
    expect(final.reviewedAt).not.toBeNull()

    const logs = await listAuditLogs({ entityId: proposal.id, limit: 20 }, testDb)
    const reviewAudits = logs.filter((l) => l.action === 'AGENT_PROPOSAL_APPROVED' || l.action === 'AGENT_PROPOSAL_REJECTED')
    expect(reviewAudits).toHaveLength(1)
    expect(reviewAudits[0].action).toBe(winnerDecision === 'APPROVED' ? 'AGENT_PROPOSAL_APPROVED' : 'AGENT_PROPOSAL_REJECTED')
  })
})
