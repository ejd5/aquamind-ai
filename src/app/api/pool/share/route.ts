/**
 * AQWELIA Family — Pool share API.
 *
 * URL: /api/pool/share
 *
 * GET    ?poolId=xxx            → list shares granted on the pool owned by the
 *                                 authenticated user. Returns `{ shares, owner }`
 *                                 where each share exposes `{ id, role, createdAt,
 *                                 sharedWith: { id, name, email } }`.
 * POST   { poolId, email, role } → invite a user by email. If the email matches
 *                                 an existing AQWELIA account, the share is
 *                                 created immediately. Otherwise we return a
 *                                 404 (USER_NOT_FOUND) so the UI can prompt the
 *                                 owner to invite the person to create an account.
 * DELETE ?id=xxx                 → revoke a share (owner only, or self-leave).
 *
 * Auth: NextAuth session required. The caller must be the owner of the pool
 * (PoolProfile.userId === session.user.id) to invite/revoke. Co-managers and
 * viewers may read the share list. Roles: owner | co_manager | viewer.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { pickLocale, translate } from '@/lib/i18n-api'

export const runtime = 'nodejs'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const ALLOWED_ROLES = new Set(['co_manager', 'viewer'])

export async function GET(req: NextRequest) {
  const locale = pickLocale(req)
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    const msg = await translate(locale, 'common.errors.unauthorized', 'Non autorisé')
    return NextResponse.json({ error: msg }, { status: 401 })
  }
  const userId = session.user.id

  const url = new URL(req.url)
  const poolId = url.searchParams.get('poolId')
  if (!poolId) {
    const msg = await translate(locale, 'common.errors.idRequired', 'id requis')
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  // Caller must own the pool OR be a co_manager/viewer on it.
  const pool = await db.poolProfile.findFirst({ where: { id: poolId } })
  if (!pool) {
    const msg = await translate(locale, 'common.errors.notFound', 'Non trouvé')
    return NextResponse.json({ error: msg }, { status: 404 })
  }
  if (pool.userId !== userId) {
    const share = await db.poolShare.findFirst({
      where: { poolId, sharedWithId: userId },
    })
    if (!share) {
      const msg = await translate(locale, 'common.errors.unauthorized', 'Non autorisé')
      return NextResponse.json({ error: msg }, { status: 403 })
    }
  }

  const shares = await db.poolShare.findMany({
    where: { poolId },
    include: {
      sharedWith: { select: { id: true, name: true, email: true } },
      invitedByUser: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: 'asc' },
  })

  const owner = await db.user.findUnique({
    where: { id: pool.userId },
    select: { id: true, name: true, email: true },
  })

  return NextResponse.json({ shares, owner })
}

export async function POST(req: NextRequest) {
  const locale = pickLocale(req)
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    const msg = await translate(locale, 'common.errors.unauthorized', 'Non autorisé')
    return NextResponse.json({ error: msg }, { status: 401 })
  }
  const userId = session.user.id

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const poolId = typeof body?.poolId === 'string' ? body.poolId : null
  const email =
    typeof body?.email === 'string' ? body.email.toLowerCase().trim() : ''
  const role =
    typeof body?.role === 'string' && ALLOWED_ROLES.has(body.role)
      ? body.role
      : 'viewer'

  if (!poolId) {
    const msg = await translate(locale, 'common.errors.idRequired', 'id requis')
    return NextResponse.json({ error: msg }, { status: 400 })
  }
  if (!EMAIL_RE.test(email)) {
    const msg = await translate(locale, 'family.errors.invalidEmail', 'Email invalide')
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  const pool = await db.poolProfile.findFirst({ where: { id: poolId } })
  if (!pool || pool.userId !== userId) {
    const msg = await translate(locale, 'common.errors.unauthorized', 'Non autorisé')
    return NextResponse.json({ error: msg }, { status: 403 })
  }

  const invitee = await db.user.findUnique({ where: { email } })
  if (!invitee) {
    const msg = await translate(
      locale,
      'family.errors.userNotFound',
      'Utilisateur introuvable. Invitez-le à créer un compte AQWELIA d\'abord.'
    )
    return NextResponse.json({ error: msg, code: 'USER_NOT_FOUND' }, { status: 404 })
  }
  if (invitee.id === userId) {
    const msg = await translate(
      locale,
      'family.errors.selfShare',
      'Vous ne pouvez pas partager avec vous-même'
    )
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  // Idempotent: if a share already exists, update its role instead of failing.
  const existing = await db.poolShare.findFirst({
    where: { poolId, sharedWithId: invitee.id },
  })
  if (existing) {
    const updated = await db.poolShare.update({
      where: { id: existing.id },
      data: { role },
      include: { sharedWith: { select: { id: true, name: true, email: true } } },
    })
    return NextResponse.json({ share: updated })
  }

  const share = await db.poolShare.create({
    data: { poolId, sharedWithId: invitee.id, role, invitedBy: userId },
    include: { sharedWith: { select: { id: true, name: true, email: true } } },
  })

  return NextResponse.json({ share }, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const locale = pickLocale(req)
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    const msg = await translate(locale, 'common.errors.unauthorized', 'Non autorisé')
    return NextResponse.json({ error: msg }, { status: 401 })
  }
  const userId = session.user.id

  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  if (!id) {
    const msg = await translate(locale, 'common.errors.idRequired', 'id requis')
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  const share = await db.poolShare.findUnique({
    where: { id },
    include: { pool: { select: { userId: true } } },
  })
  if (!share) {
    const msg = await translate(locale, 'common.errors.notFound', 'Non trouvé')
    return NextResponse.json({ error: msg }, { status: 404 })
  }
  // The pool owner may revoke any share; the share recipient may "leave" on their own.
  if (share.pool.userId !== userId && share.sharedWithId !== userId) {
    const msg = await translate(locale, 'common.errors.unauthorized', 'Non autorisé')
    return NextResponse.json({ error: msg }, { status: 403 })
  }

  await db.poolShare.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
