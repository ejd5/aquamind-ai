import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import {
  hashOfflineMutation,
  normalizeOfflineTarget,
  OfflineReplayValidationError,
  shouldReleaseReplayReservation,
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
      'Idempotency-Body-Cached': record.responseBody === null ? 'false' : 'true',
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
  let targetMutationSucceeded = false

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
    const contentType = targetResponse.headers.get('content-type') || 'application/json'

    if (shouldReleaseReplayReservation(targetResponse.status)) {
      await db.offlineMutation.delete({ where: { id: reservationId } }).catch(() => undefined)
      reservationId = null
      return new NextResponse(responseBody, {
        status: targetResponse.status,
        headers: { 'Content-Type': contentType },
      })
    }

    // The target has accepted the mutation. From this point onward the
    // reservation must never be deleted: reopening the key could duplicate a
    // water test, reminder or inventory movement if the ledger update fails.
    targetMutationSucceeded = true

    const responseBodyBytes = Buffer.byteLength(responseBody, 'utf8')
    const cachedBody = responseBodyBytes <= MAX_CACHED_RESPONSE_BYTES ? responseBody : null

    await db.offlineMutation.update({
      where: { id: reservationId },
      data: {
        state: 'completed',
        statusCode: targetResponse.status,
        contentType,
        responseBody: cachedBody,
      },
    })

    void db.offlineMutation
      .deleteMany({ where: { expiresAt: { lt: new Date() } } })
      .catch(() => undefined)

    return new NextResponse(responseBody, {
      status: targetResponse.status,
      headers: {
        'Content-Type': contentType,
        'Idempotency-Replayed': 'false',
        'Idempotency-Body-Cached': cachedBody === null ? 'false' : 'true',
      },
    })
  } catch (error) {
    if (reservationId && !targetMutationSucceeded) {
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
