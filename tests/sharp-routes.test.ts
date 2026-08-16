/**
 * AQWELIA PR #97 — strip-scan / photo-diagnostic must load sharp (native
 * libvips) and return a real analysis — never a 500 caused by a missing sharp
 * runtime. External layers (NVIDIA VLM, DB, billing) are mocked; the image
 * normalization runs through the REAL sharp pipeline.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import sharp from 'sharp'
import { NextRequest } from 'next/server'

const dbMock = vi.hoisted(() => ({
  subscription: { findFirst: vi.fn() },
  photoDiagnostic: { count: vi.fn(), create: vi.fn() },
  waterTest: { count: vi.fn(), create: vi.fn() },
  poolProfile: { findFirst: vi.fn() },
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
  findOwnedPool: vi.fn(async () => ({ id: 'pool-1', userId: 'user-1' })),
}))
vi.mock('@/lib/analytics-server', () => ({
  trackEventServer: vi.fn(async () => {}),
}))

// NVIDIA VLM mocked: returns a deterministic strip/photo analysis.
vi.mock('@/lib/ai/nvidia', () => ({
  nvidiaVision: vi.fn(async () => ({
    content: JSON.stringify({
      parameters: [
        { name: 'pH', value: 7.2, confidence: 95 },
        { name: 'Free Chlorine', value: 2.0, unit: 'mg/L', confidence: 90 },
      ],
      stripBrand: 'e2e-brand',
      overallConfidence: 88,
      imageQuality: 'good',
    }),
  })),
}))

import { POST as stripPost } from '@/app/api/pool/strip-scan/route'
import { POST as photoPost } from '@/app/api/pool/photo-diagnostic/route'

async function validImage(): Promise<string> {
  const buf = await sharp({
    create: { width: 600, height: 400, channels: 3, background: { r: 200, g: 150, b: 80 } },
  }).jpeg({ quality: 90 }).toBuffer()
  return `data:image/jpeg;base64,${buf.toString('base64')}`
}

function makeReq(url: string, body: unknown): NextRequest {
  return new NextRequest(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'accept-language': 'fr' },
    body: JSON.stringify(body),
  })
}

const baseProfile = {
  id: 'pool-1',
  userId: 'user-1',
  name: 'Ma piscine',
  volume: 48,
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

describe('PR #97 — strip-scan route loads sharp (no 500)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSession.value = { user: { id: 'user-1' } }
    dbMock.subscription.findFirst.mockResolvedValue(null)
    dbMock.photoDiagnostic.count.mockResolvedValue(0)
    dbMock.waterTest.count.mockResolvedValue(0)
    dbMock.poolProfile.findFirst.mockResolvedValue(baseProfile)
    dbMock.waterTest.create.mockResolvedValue({ id: 'wt-1', userId: 'user-1', ph: 7.2 })
    dbMock.actionPlan.create.mockResolvedValue({ id: 'ap-1' })
  })

  it('analyzes a valid image (real sharp normalization) and returns the VLM result', async () => {
    const res = await stripPost(makeReq('http://localhost/api/pool/strip-scan', {
      image: await validImage(),
      save: false,
    }))
    expect(res.status).not.toBe(500)
    const data = await res.json()
    expect(data.analysis.parameters.some((p: { name: string }) => p.name === 'pH')).toBe(true)
  })

  it('returns 400 for a missing image (no sharp call)', async () => {
    const res = await stripPost(makeReq('http://localhost/api/pool/strip-scan', {}))
    expect(res.status).toBe(400)
  })
})

describe('PR #97 — photo-diagnostic route loads sharp (no 500)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSession.value = { user: { id: 'user-1' } }
    dbMock.subscription.findFirst.mockResolvedValue(null)
    dbMock.photoDiagnostic.count.mockResolvedValue(0)
    dbMock.photoDiagnostic.create.mockResolvedValue({
      id: 'pd-1',
      userId: 'user-1',
      imageUrl: 'redacted://sha256/abc',
    })
    dbMock.poolProfile.findFirst.mockResolvedValue(baseProfile)
  })

  it('diagnoses a valid image (real sharp normalization) without a sharp 500', async () => {
    const res = await photoPost(makeReq('http://localhost/api/pool/photo-diagnostic', {
      image: await validImage(),
      typeHint: 'water',
    }))
    expect(res.status).not.toBe(500)
    const data = await res.json()
    expect(data.diagnostic).toBeTruthy()
  })

  it('returns 400 for a missing image', async () => {
    const res = await photoPost(makeReq('http://localhost/api/pool/photo-diagnostic', {}))
    expect(res.status).toBe(400)
  })
})
