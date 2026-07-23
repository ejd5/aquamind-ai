from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

MODEL = r'''

// Offline replay ledger — prevents duplicate mutations after reconnect/retry.
model OfflineMutation {
  id             String   @id @default(cuid())
  userId         String
  idempotencyKey String
  method         String
  path           String
  requestHash    String
  state          String   @default("processing") // processing | completed
  statusCode     Int?
  contentType    String?
  responseBody   String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  expiresAt      DateTime

  @@unique([userId, idempotencyKey])
  @@index([expiresAt])
  @@index([state, createdAt])
}
'''

for schema_rel in ('prisma/schema.prisma', 'prisma/postgresql/schema.prisma'):
    schema_path = ROOT / schema_rel
    schema = schema_path.read_text(encoding='utf-8')
    if 'model OfflineMutation {' not in schema:
        schema_path.write_text(schema.rstrip() + MODEL + '\n', encoding='utf-8')

migration_name = '20260723223000_p0_d_offline_idempotency'
sqlite_dir = ROOT / 'prisma' / 'migrations' / migration_name
postgres_dir = ROOT / 'prisma' / 'postgresql' / 'migrations' / migration_name
sqlite_dir.mkdir(parents=True, exist_ok=True)
postgres_dir.mkdir(parents=True, exist_ok=True)

(sqlite_dir / 'migration.sql').write_text(r'''-- CreateTable
CREATE TABLE "OfflineMutation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'processing',
    "statusCode" INTEGER,
    "contentType" TEXT,
    "responseBody" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "expiresAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "OfflineMutation_userId_idempotencyKey_key"
ON "OfflineMutation"("userId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "OfflineMutation_expiresAt_idx" ON "OfflineMutation"("expiresAt");

-- CreateIndex
CREATE INDEX "OfflineMutation_state_createdAt_idx"
ON "OfflineMutation"("state", "createdAt");
''', encoding='utf-8')

(postgres_dir / 'migration.sql').write_text(r'''-- CreateTable
CREATE TABLE "OfflineMutation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'processing',
    "statusCode" INTEGER,
    "contentType" TEXT,
    "responseBody" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OfflineMutation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OfflineMutation_userId_idempotencyKey_key"
ON "OfflineMutation"("userId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "OfflineMutation_expiresAt_idx" ON "OfflineMutation"("expiresAt");

-- CreateIndex
CREATE INDEX "OfflineMutation_state_createdAt_idx"
ON "OfflineMutation"("state", "createdAt");
''', encoding='utf-8')

route_path = ROOT / 'src' / 'app' / 'api' / 'offline' / 'replay' / 'route.ts'
route_path.parent.mkdir(parents=True, exist_ok=True)
route_path.write_text(r'''import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import {
  hashOfflineMutation,
  isRetryableReplayStatus,
  normalizeOfflineTarget,
  OfflineReplayValidationError,
  validateIdempotencyKey,
} from '@/lib/offline/idempotency'

export const runtime = 'nodejs'

const LEDGER_TTL_MS = 7 * 24 * 60 * 60 * 1000
const MAX_CACHED_RESPONSE_BYTES = 1_000_000

type ReplayBody = {
  method?: string
  path?: string
  body?: unknown
}

function replayedResponse(record: {
  statusCode: number | null
  contentType: string | null
  responseBody: string | null
}) {
  return new NextResponse(record.responseBody || '', {
    status: record.statusCode || 200,
    headers: {
      'Content-Type': record.contentType || 'application/json',
      'Idempotency-Replayed': 'true',
    },
  })
}

async function loadExisting(userId: string, idempotencyKey: string, requestHash: string) {
  const existing = await db.offlineMutation.findUnique({
    where: { userId_idempotencyKey: { userId, idempotencyKey } },
  })
  if (!existing) return null

  if (existing.requestHash !== requestHash) {
    throw new OfflineReplayValidationError(
      'Idempotency key reused with a different mutation',
      409,
      'idempotency_key_conflict',
    )
  }
  if (existing.state === 'completed') return replayedResponse(existing)

  throw new OfflineReplayValidationError(
    'Mutation is already being processed',
    409,
    'idempotency_in_progress',
  )
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = session.user.id

  let reservationId: string | null = null
  try {
    const idempotencyKey = validateIdempotencyKey(req.headers.get('idempotency-key'))
    const payload = (await req.json()) as ReplayBody
    if (!payload?.path || !payload?.method) {
      return NextResponse.json({ error: 'Mutation method and path are required' }, { status: 400 })
    }

    const target = normalizeOfflineTarget(req.nextUrl.origin, payload.path, payload.method)
    const canonicalPath = `${target.url.pathname}${target.url.search}`
    const requestHash = hashOfflineMutation(target.method, canonicalPath, payload.body)

    const cached = await loadExisting(userId, idempotencyKey, requestHash)
    if (cached) return cached

    try {
      const reservation = await db.offlineMutation.create({
        data: {
          userId,
          idempotencyKey,
          method: target.method,
          path: canonicalPath,
          requestHash,
          expiresAt: new Date(Date.now() + LEDGER_TTL_MS),
        },
      })
      reservationId = reservation.id
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const concurrent = await loadExisting(userId, idempotencyKey, requestHash)
        if (concurrent) return concurrent
      }
      throw error
    }

    const headers = new Headers({
      Accept: req.headers.get('accept') || 'application/json',
      'Accept-Language': req.headers.get('accept-language') || 'fr',
      'Content-Type': 'application/json',
    })
    const cookie = req.headers.get('cookie')
    if (cookie) headers.set('Cookie', cookie)

    const targetResponse = await fetch(target.url, {
      method: target.method,
      headers,
      body: target.method === 'DELETE' ? undefined : JSON.stringify(payload.body ?? {}),
      redirect: 'manual',
      cache: 'no-store',
    })
    const responseBody = await targetResponse.text()

    if (isRetryableReplayStatus(targetResponse.status)) {
      await db.offlineMutation.delete({ where: { id: reservationId } }).catch(() => undefined)
      reservationId = null
      return new NextResponse(responseBody, {
        status: targetResponse.status,
        headers: { 'Content-Type': targetResponse.headers.get('content-type') || 'application/json' },
      })
    }

    if (Buffer.byteLength(responseBody, 'utf8') > MAX_CACHED_RESPONSE_BYTES) {
      await db.offlineMutation.delete({ where: { id: reservationId } }).catch(() => undefined)
      reservationId = null
      return NextResponse.json({ error: 'Replay response too large' }, { status: 502 })
    }

    const contentType = targetResponse.headers.get('content-type') || 'application/json'
    await db.offlineMutation.update({
      where: { id: reservationId },
      data: {
        state: 'completed',
        statusCode: targetResponse.status,
        contentType,
        responseBody,
      },
    })

    void db.offlineMutation.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    }).catch(() => undefined)

    return new NextResponse(responseBody, {
      status: targetResponse.status,
      headers: {
        'Content-Type': contentType,
        'Idempotency-Replayed': 'false',
      },
    })
  } catch (error) {
    if (reservationId) {
      await db.offlineMutation.delete({ where: { id: reservationId } }).catch(() => undefined)
    }
    if (error instanceof OfflineReplayValidationError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode },
      )
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Offline replay failed' },
      { status: 500 },
    )
  }
}
''', encoding='utf-8')

store_path = ROOT / 'src' / 'lib' / 'offline' / 'offline-store.ts'
store = store_path.read_text(encoding='utf-8')
old = r'''            const options = { headers: { 'Idempotency-Key': idempotencyKey } }
            try {
              if (action.method === 'POST') {
                await api.post(action.path, action.body, options)
              } else if (action.method === 'PATCH') {
                await api.patch(action.path, action.body, options)
              } else if (action.method === 'DELETE') {
                await api.delete(action.path, options)
              }

              set((state) => ({
'''
new = r'''            const options = { headers: { 'Idempotency-Key': idempotencyKey } }
            try {
              await api.post(
                '/api/offline/replay',
                { method: action.method, path: action.path, body: action.body },
                options,
              )

              set((state) => ({
'''
if old not in store:
    raise RuntimeError('offline replay block not found')
store_path.write_text(store.replace(old, new, 1), encoding='utf-8')

test_path = ROOT / 'tests' / 'p0-d-offline-idempotency.test.ts'
test_path.write_text(r'''import { readFileSync } from 'node:fs'
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
''', encoding='utf-8')
