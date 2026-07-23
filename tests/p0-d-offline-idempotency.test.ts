import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { db } from '@/lib/db'
import {
  hashOfflineMutation,
  normalizeOfflineTarget,
  validateIdempotencyKey,
} from '@/lib/offline/idempotency'

const userId = `p0-d-${Date.now()}`

afterAll(async () => {
  await db.offlineMutation.deleteMany({ where: { userId } })
})

describe('P0-D offline idempotency', () => {
  it('allows only the six offline mutation APIs', () => {
    expect(normalizeOfflineTarget('https://aqwelia.test', '/api/pool/water-test', 'POST').url.pathname)
      .toBe('/api/pool/water-test')
    expect(normalizeOfflineTarget('https://aqwelia.test', '/api/pool/equipment?id=1', 'DELETE').method)
      .toBe('DELETE')
    expect(() => normalizeOfflineTarget('https://aqwelia.test', '/api/admin/users', 'POST'))
      .toThrow('not allowlisted')
    expect(() => normalizeOfflineTarget('https://aqwelia.test', 'https://evil.test/api/chat', 'POST'))
      .toThrow('External replay target denied')
  })

  it('validates stable idempotency keys', () => {
    expect(validateIdempotencyKey('018f8ca1-7d2e-7b5f-a18b-010203040506'))
      .toBe('018f8ca1-7d2e-7b5f-a18b-010203040506')
    expect(() => validateIdempotencyKey('short')).toThrow('Invalid Idempotency-Key')
  })

  it('hashes semantically identical object bodies identically', () => {
    const first = hashOfflineMutation('POST', '/api/pool/water-test', { ph: 7.2, poolId: 'p1' })
    const second = hashOfflineMutation('POST', '/api/pool/water-test', { poolId: 'p1', ph: 7.2 })
    expect(first).toBe(second)
  })

  it('enforces one ledger row per user and key', async () => {
    const key = '018f8ca1-7d2e-7b5f-a18b-010203040507'
    const data = {
      userId,
      idempotencyKey: key,
      method: 'POST',
      path: '/api/pool/water-test',
      requestHash: 'a'.repeat(64),
      expiresAt: new Date(Date.now() + 60_000),
    }
    await db.offlineMutation.create({ data })
    await expect(db.offlineMutation.create({ data })).rejects.toMatchObject({ code: 'P2002' })
  })

  it('routes every queued retry through the replay ledger', () => {
    const store = readFileSync(join(process.cwd(), 'src/lib/offline/offline-store.ts'), 'utf8')
    expect(store).toContain("'/api/offline/replay'")
    expect(store).toContain("'Idempotency-Key': idempotencyKey")
    expect(store).not.toContain('await api.post(action.path')
  })
})
