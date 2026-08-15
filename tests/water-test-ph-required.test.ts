/**
 * AQWELIA PR #95 — LAUNCH BLOCKER: a missing/empty pH must NEVER produce a
 * WaterTest / ActionPlan.
 *
 * `Number('') === 0`, `Number(null) === 0`, `Number('   ') === 0` all pass a
 * bare `isNaN()` check. The server must reject the RAW value before conversion.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const dbMock = vi.hoisted(() => ({
  waterTest: {
    findMany: vi.fn(),
    create: vi.fn(),
  },
  actionPlan: { create: vi.fn() },
}))

vi.mock('@/lib/db', () => ({ db: dbMock }))

const mockSession = vi.hoisted(() => ({
  value: { user: { id: 'user-1' } } as { user?: { id?: string } },
}))
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(async () => mockSession.value),
}))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))

vi.mock('@/lib/i18n-api', () => ({
  pickLocale: () => 'fr',
  translate: vi.fn(async (_l: string, _k: string, fallback: string) => fallback),
}))

vi.mock('@/lib/brain/access', () => ({
  findOwnedPool: vi.fn(async (_uid: string, poolId?: string | null) =>
    poolId ? { id: 'pool-1', userId: 'user-1' } : null,
  ),
}))
vi.mock('@/lib/brain/record-followup', () => ({
  recordAutomaticFollowup: vi.fn(async () => null),
}))
vi.mock('@/lib/analytics-server', () => ({
  trackEventServer: vi.fn(async () => {}),
}))

// Feature gate used only for the pro_mode LSI response; grant access so the
// route completes for valid input.
vi.mock('@/lib/billing/gate', () => ({
  requireFeatureAccess: vi.fn(async () => ({
    denied: false,
    userId: 'user-1',
    planId: 'wellness',
    status: 'active',
    grantedPlans: ['wellness'],
  })),
  getUserPlan: vi.fn(async () => null),
}))

import { POST } from '@/app/api/pool/water-test/route'

function makeReq(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/pool/water-test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'accept-language': 'fr' },
    body: JSON.stringify(body),
  })
}

const validProfile = {
  id: 'pool-1',
  userId: 'user-1',
  name: 'Ma piscine',
  volume: 40,
  unit: 'm3',
  treatmentType: 'chlorine',
  saltSystem: false,
  waterBodyType: 'pool',
  filterType: 'sand',
  manufacturerSaltMin: null,
  manufacturerSaltMax: null,
  manufacturerChlorineMax: null,
  confirmedFields: JSON.stringify(['name', 'volume', 'unit', 'treatmentType', 'filterType']),
}

const createdTest = {
  id: 'wt-1',
  userId: 'user-1',
  poolId: 'pool-1',
  ph: 7.2,
  status: 'ok',
  createdAt: new Date(),
  clearWaterIndex: 90,
  swimSafety: 'allowed',
}

describe('POST /api/pool/water-test — pH est REQUIS (PR #95)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSession.value = { user: { id: 'user-1' } }
    dbMock.waterTest.create.mockResolvedValue(createdTest)
    dbMock.actionPlan.create.mockResolvedValue({ id: 'plan-1' })
  })

  it('retourne 401 sans session', async () => {
    mockSession.value = {}
    const res = await POST(makeReq({ ph: '7.2' }))
    expect(res.status).toBe(401)
  })

  const invalidBodies: [string, unknown][] = [
    ['objet vide {}', {}],
    ['ph "" (chaîne vide)', { ph: '' }],
    ['ph "   " (espaces uniquement)', { ph: '   ' }],
    ['ph null', { ph: null }],
    ['ph "abc" (non numérique)', { ph: 'abc' }],
    ['ph absent', { freeChlorine: '2.0' }],
    // PR #95 Round 2 — non-scalar / coercible types must never become a pH.
    ['ph false', { ph: false }],
    ['ph true', { ph: true }],
    ['ph []', { ph: [] }],
    ['ph [7.2]', { ph: [7.2] }],
    ['ph {}', { ph: {} }],
  ]

  for (const [label, body] of invalidBodies) {
    it(`${label} => 400 et AUCUN WaterTest créé`, async () => {
      const res = await POST(makeReq(body))
      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toBeTruthy()
      // The launch-blocker guarantee: no WaterTest row is ever created.
      expect(dbMock.waterTest.create).not.toHaveBeenCalled()
      expect(dbMock.actionPlan.create).not.toHaveBeenCalled()
    })
  }

  it('ph "7.2" => accepté (validation passe, création tentée)', async () => {
    // findOwnedPool is mocked to return the user's pool for poolId.
    vi.mocked(await import('@/lib/brain/access')).findOwnedPool.mockResolvedValue(validProfile as never)
    const res = await POST(makeReq({ ph: '7.2', poolId: 'pool-1' }))
    // 200 (route completes; actionPlan present) or at least proceeds to create.
    expect(res.status).toBe(200)
    expect(dbMock.waterTest.create).toHaveBeenCalled()
    const arg = dbMock.waterTest.create.mock.calls[0][0].data
    expect(arg.ph).toBe(7.2)
  })

  it('ph 7.2 numérique brut => accepté', async () => {
    vi.mocked(await import('@/lib/brain/access')).findOwnedPool.mockResolvedValue(validProfile as never)
    const res = await POST(makeReq({ ph: 7.2, poolId: 'pool-1' }))
    expect(res.status).toBe(200)
    const arg = dbMock.waterTest.create.mock.calls[0][0].data
    expect(arg.ph).toBe(7.2)
  })

  // PR #95 Round 2 — scalar values (incl. 0) remain accepted; no range gate.
  for (const value of [0, '0']) {
    it(`ph ${JSON.stringify(value)} (scalaire) => accepté`, async () => {
      vi.mocked(await import('@/lib/brain/access')).findOwnedPool.mockResolvedValue(validProfile as never)
      const res = await POST(makeReq({ ph: value, poolId: 'pool-1' }))
      expect(res.status).toBe(200)
      const arg = dbMock.waterTest.create.mock.calls[0][0].data
      expect(arg.ph).toBe(0)
    })
  }
})
