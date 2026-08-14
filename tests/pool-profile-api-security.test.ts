/**
 * B2C PoolProfile API — security & validation tests (P5-MULTIPOOL-PDF).
 *
 * Verifies the /api/pool/profile route:
 *   - 401 without a session
 *   - POST plan-limit 403 and spa gate 403
 *   - POST enum validation (400) instead of silently persisting bad values
 *   - PATCH rejects invalid enums (400)
 *   - IDOR: PATCH/DELETE refuse pools that don't belong to the caller (404)
 *   - DELETE refuses to remove the last pool
 *
 * Uses the mocked `@/lib/db` + `next-auth` pattern used across the suite.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const dbMock = vi.hoisted(() => ({
  subscription: { findFirst: vi.fn() },
  poolProfile: {
    findMany: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
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

// freemium is real (pure plan logic) — provide a free-plan subscription.
vi.mock('@/lib/pool/freemium', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@/lib/pool/freemium')>()
  return { ...mod }
})

import { GET, POST, PATCH, DELETE } from '@/app/api/pool/profile/route'

function makeReq(method: string, url: string, body?: unknown): NextRequest {
  return new NextRequest(url, {
    method,
    headers: { 'Content-Type': 'application/json', 'accept-language': 'fr' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

const baseProfile = {
  id: 'pool-1',
  userId: 'user-1',
  name: 'Ma piscine',
  volume: 40,
  unit: 'm3',
  shape: 'rectangular',
  surfaceType: 'liner',
  treatmentType: 'chlorine',
  filterType: 'sand',
  pumpType: null,
  saltSystem: false,
  manufacturerSaltMin: null,
  manufacturerSaltMax: null,
  manufacturerChlorineMax: null,
  region: null,
  sunExposure: 'medium',
  covered: false,
  usageLevel: 'medium',
  waterBodyType: 'pool',
  spaSeats: null,
  spaTempTarget: null,
  spaUsageFreq: null,
  spaBrand: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('GET /api/pool/profile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSession.value = { user: { id: 'user-1' } }
  })

  it('returns 401 without a session', async () => {
    mockSession.value = {}
    const res = await GET(new Request('http://localhost/api/pool/profile'))
    expect(res.status).toBe(401)
  })

  it('returns the user profiles + active profile', async () => {
    dbMock.poolProfile.findMany.mockResolvedValue([baseProfile])
    const res = await GET(new Request('http://localhost/api/pool/profile'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.profiles).toHaveLength(1)
    expect(data.profile.id).toBe('pool-1')
  })
})

describe('POST /api/pool/profile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSession.value = { user: { id: 'user-1' } }
    dbMock.subscription.findFirst.mockResolvedValue(null) // free plan
    dbMock.poolProfile.count.mockResolvedValue(0)
    dbMock.poolProfile.create.mockResolvedValue(baseProfile)
  })

  it('returns 401 without a session', async () => {
    mockSession.value = {}
    const res = await POST(makeReq('POST', 'http://localhost/api/pool/profile', { name: 'X', volume: 40 }))
    expect(res.status).toBe(401)
  })

  it('returns 403 POOL_LIMIT_REACHED when at capacity on the free plan', async () => {
    dbMock.poolProfile.count.mockResolvedValue(1)
    const res = await POST(makeReq('POST', 'http://localhost/api/pool/profile', { name: 'X', volume: 40 }))
    expect(res.status).toBe(403)
    const data = await res.json()
    expect(data.code).toBe('POOL_LIMIT_REACHED')
  })

  it('returns 403 SPA_NOT_SUPPORTED without the spa gate', async () => {
    const res = await POST(makeReq('POST', 'http://localhost/api/pool/profile', {
      name: 'Spa', volume: 1.5, waterBodyType: 'spa',
    }))
    expect(res.status).toBe(403)
    const data = await res.json()
    expect(data.code).toBe('SPA_NOT_SUPPORTED')
  })

  it('rejects an out-of-range treatmentType with 400 (not silent persist)', async () => {
    const res = await POST(makeReq('POST', 'http://localhost/api/pool/profile', {
      name: 'Piscine', volume: 40, treatmentType: 'laser',
    }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.code).toBe('INVALID_PROFILE')
    expect(data.errors.some((e: { field: string }) => e.field === 'treatmentType')).toBe(true)
    expect(dbMock.poolProfile.create).not.toHaveBeenCalled()
  })

  it('server rejects invalid volume (0 / negative / NaN)', async () => {
    for (const volume of [0, -5, 'abc', NaN]) {
      const res = await POST(makeReq('POST', 'http://localhost/api/pool/profile', { name: 'Piscine', volume }))
      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.errors.some((e: { field: string }) => e.field === 'volume')).toBe(true)
    }
    expect(dbMock.poolProfile.create).not.toHaveBeenCalled()
  })

  it('server rejects invalid unit', async () => {
    const res = await POST(makeReq('POST', 'http://localhost/api/pool/profile', { name: 'Piscine', volume: 40, unit: 'litres' }))
    expect(res.status).toBe(400)
  })

  it('creates a pool from a scoped onboarding payload', async () => {
    const res = await POST(makeReq('POST', 'http://localhost/api/pool/profile', {
      name: 'Ma piscine', volume: 40, unit: 'm3', waterBodyType: 'pool',
      treatmentType: 'salt', saltSystem: true,
    }))
    expect(res.status).toBe(201)
    expect(dbMock.poolProfile.create).toHaveBeenCalledTimes(1)
    const arg = dbMock.poolProfile.create.mock.calls[0][0].data
    expect(arg.userId).toBe('user-1')
    expect(arg.treatmentType).toBe('salt')
    expect(arg.saltSystem).toBe(true)
  })

  it('P0-1 unconfirmed fields are NOT persisted as user truth (no server-side business defaults)', async () => {
    const res = await POST(makeReq('POST', 'http://localhost/api/pool/profile', {
      name: 'Ma piscine', volume: 40, unit: 'm3', waterBodyType: 'pool',
    }))
    expect(res.status).toBe(201)
    const arg = dbMock.poolProfile.create.mock.calls[0][0].data
    // The server must NOT inject business defaults for unconfirmed fields:
    expect(arg.treatmentType).toBeUndefined()
    expect(arg.filterType).toBeUndefined()
    expect(arg.sunExposure).toBeUndefined()
    expect(arg.usageLevel).toBeUndefined()
    expect(arg.shape).toBeUndefined()
    expect(arg.surfaceType).toBeUndefined()
    expect(arg.covered).toBeUndefined()
    // confirmedFields records ONLY what the user actually sent:
    const confirmed = JSON.parse(arg.confirmedFields)
    expect(confirmed).toContain('name')
    expect(confirmed).toContain('volume')
    expect(confirmed).not.toContain('treatmentType')
    expect(confirmed).not.toContain('filterType')
    expect(confirmed).not.toContain('sunExposure')
  })
})

describe('PATCH /api/pool/profile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSession.value = { user: { id: 'user-1' } }
    dbMock.poolProfile.findFirst.mockResolvedValue(baseProfile)
    dbMock.poolProfile.update.mockImplementation(async ({ data }) => ({ ...baseProfile, ...data }))
  })

  it('returns 401 without a session', async () => {
    mockSession.value = {}
    const res = await PATCH(makeReq('PATCH', 'http://localhost/api/pool/profile?id=pool-1', { name: 'X' }))
    expect(res.status).toBe(401)
  })

  it('returns 400 when id is missing', async () => {
    const res = await PATCH(makeReq('PATCH', 'http://localhost/api/pool/profile', { name: 'X' }))
    expect(res.status).toBe(400)
  })

  it('rejects editing a pool owned by another user (IDOR) with 404', async () => {
    dbMock.poolProfile.findFirst.mockResolvedValue(null)
    const res = await PATCH(makeReq('PATCH', 'http://localhost/api/pool/profile?id=pool-foreign', { name: 'X' }))
    expect(res.status).toBe(404)
    expect(dbMock.poolProfile.update).not.toHaveBeenCalled()
  })

  it('rejects an invalid filterType with 400', async () => {
    const res = await PATCH(makeReq('PATCH', 'http://localhost/api/pool/profile?id=pool-1', { filterType: 'plasma' }))
    expect(res.status).toBe(400)
    expect(dbMock.poolProfile.update).not.toHaveBeenCalled()
  })

  it('rejects invalid volume (0 / negative / non-numeric)', async () => {
    for (const volume of [0, -5, 'abc']) {
      const res = await PATCH(makeReq('PATCH', 'http://localhost/api/pool/profile?id=pool-1', { volume }))
      expect(res.status).toBe(400)
      expect(dbMock.poolProfile.update).not.toHaveBeenCalled()
    }
  })

  it('P0-3 pool → spa via PATCH without entitlement = 403 SPA_NOT_SUPPORTED', async () => {
    dbMock.subscription.findFirst.mockResolvedValue(null) // free plan
    const res = await PATCH(makeReq('PATCH', 'http://localhost/api/pool/profile?id=pool-1', {
      waterBodyType: 'spa',
    }))
    expect(res.status).toBe(403)
    const data = await res.json()
    expect(data.code).toBe('SPA_NOT_SUPPORTED')
    expect(dbMock.poolProfile.update).not.toHaveBeenCalled()
  })

  it('P0-3 pool → spa via PATCH WITH entitlement = allowed', async () => {
    dbMock.subscription.findFirst.mockResolvedValue({
      plan: 'spa365',
      status: 'active',
      expiresAt: new Date(Date.now() + 86400000),
    })
    const res = await PATCH(makeReq('PATCH', 'http://localhost/api/pool/profile?id=pool-1', {
      waterBodyType: 'spa', spaSeats: 4, spaTemperature: 37, spaUsageFrequency: 'high',
    }))
    expect(res.status).toBe(200)
    expect(dbMock.poolProfile.update).toHaveBeenCalledTimes(1)
  })

  it('P0-3 editing an existing spa pool requires entitlement too', async () => {
    dbMock.poolProfile.findFirst.mockResolvedValue({ ...baseProfile, waterBodyType: 'spa' })
    dbMock.subscription.findFirst.mockResolvedValue(null) // downgraded
    const res = await PATCH(makeReq('PATCH', 'http://localhost/api/pool/profile?id=pool-1', {
      name: 'Mon spa',
    }))
    expect(res.status).toBe(403)
    const data = await res.json()
    expect(data.code).toBe('SPA_NOT_SUPPORTED')
    expect(dbMock.poolProfile.update).not.toHaveBeenCalled()
  })

  it('P0-1 PATCH keeps confirmedFields union (existing + newly provided)', async () => {
    dbMock.poolProfile.findFirst.mockResolvedValue({
      ...baseProfile,
      confirmedFields: JSON.stringify(['name', 'volume', 'treatmentType']),
    })
    const res = await PATCH(makeReq('PATCH', 'http://localhost/api/pool/profile?id=pool-1', {
      filterType: 'glass',
    }))
    expect(res.status).toBe(200)
    const data = dbMock.poolProfile.update.mock.calls[0][0].data
    const confirmed = JSON.parse(data.confirmedFields)
    expect(confirmed).toContain('filterType')
    expect(confirmed).toContain('treatmentType') // preserved
  })

  it('P0-1 Round 3: PATCH du SEUL name ne confirme pas treatmentType/filterType/sunExposure', async () => {
    // Legacy profile: only name+volume confirmed; technical defaults stored.
    dbMock.poolProfile.findFirst.mockResolvedValue({
      ...baseProfile,
      treatmentType: 'chlorine',
      filterType: 'sand',
      sunExposure: 'medium',
      confirmedFields: JSON.stringify(['name', 'volume']),
    })
    const res = await PATCH(makeReq('PATCH', 'http://localhost/api/pool/profile?id=pool-1', {
      name: 'Ma piscine sud',
    }))
    expect(res.status).toBe(200)
    const data = dbMock.poolProfile.update.mock.calls[0][0].data
    const confirmed = JSON.parse(data.confirmedFields)
    expect(confirmed).toEqual(['name', 'volume'])
    expect(confirmed).not.toContain('treatmentType')
    expect(confirmed).not.toContain('filterType')
    expect(confirmed).not.toContain('sunExposure')
    expect(confirmed).not.toContain('usageLevel')
  })

  it('P0-1 Round 3: un champ non confirmé est confirmé explicitement par un PATCH ciblé', async () => {
    dbMock.poolProfile.findFirst.mockResolvedValue({
      ...baseProfile,
      confirmedFields: JSON.stringify(['name', 'volume']),
    })
    const res = await PATCH(makeReq('PATCH', 'http://localhost/api/pool/profile?id=pool-1', {
      treatmentType: 'salt',
      saltSystem: true,
    }))
    expect(res.status).toBe(200)
    const data = dbMock.poolProfile.update.mock.calls[0][0].data
    const confirmed = JSON.parse(data.confirmedFields)
    expect(confirmed).toContain('treatmentType')
    expect(confirmed).toContain('saltSystem')
    // still not the untouched ones
    expect(confirmed).not.toContain('filterType')
    expect(confirmed).not.toContain('sunExposure')
  })

  it('updates allowed fields and returns the refreshed profile', async () => {
    const res = await PATCH(makeReq('PATCH', 'http://localhost/api/pool/profile?id=pool-1', {
      name: 'Piscine sud', volume: 55, filterType: 'glass', sunExposure: 'high',
    }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.profile.name).toBe('Piscine sud')
    expect(data.profile.filterType).toBe('glass')
    expect(data.profile.sunExposure).toBe('high')
  })
})

describe('DELETE /api/pool/profile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSession.value = { user: { id: 'user-1' } }
    dbMock.poolProfile.findFirst.mockResolvedValue(baseProfile)
    dbMock.poolProfile.count.mockResolvedValue(2)
    dbMock.poolProfile.delete.mockResolvedValue(baseProfile)
    dbMock.poolProfile.findMany.mockResolvedValue([baseProfile])
  })

  it('returns 401 without a session', async () => {
    mockSession.value = {}
    const res = await DELETE(makeReq('DELETE', 'http://localhost/api/pool/profile?id=pool-1'))
    expect(res.status).toBe(401)
  })

  it('refuses deleting a foreign pool (IDOR) with 404', async () => {
    dbMock.poolProfile.findFirst.mockResolvedValue(null)
    const res = await DELETE(makeReq('DELETE', 'http://localhost/api/pool/profile?id=pool-foreign'))
    expect(res.status).toBe(404)
    expect(dbMock.poolProfile.delete).not.toHaveBeenCalled()
  })

  it('refuses deleting the last remaining pool', async () => {
    dbMock.poolProfile.count.mockResolvedValue(1)
    const res = await DELETE(makeReq('DELETE', 'http://localhost/api/pool/profile?id=pool-1'))
    expect(res.status).toBe(400)
    expect(dbMock.poolProfile.delete).not.toHaveBeenCalled()
  })
})
