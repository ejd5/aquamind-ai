import { createHash } from 'node:crypto'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { checkRateLimit, rateLimitedResponse } from '@/lib/rate-limit'
import {
  CONSENT_COOKIE_NAME,
  CONSENT_MAX_AGE_SECONDS,
  CONSENT_WORDING_VERSION,
} from '@/lib/privacy/consent'

export const runtime = 'nodejs'

function hashIp(ip: string | null): string | null {
  const salt = process.env.CONSENT_PROOF_SALT || process.env.NEXTAUTH_SECRET
  if (!ip || !salt) return null
  return createHash('sha256').update(`${salt}:${ip}`).digest('hex')
}

export async function POST(req: Request) {
  const rateLimit = checkRateLimit(req, 'privacy-consent', 30, 60 * 60 * 1000)
  if (!rateLimit.allowed) return rateLimitedResponse(rateLimit)

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const data = body as Record<string, unknown>
  if (typeof data.analytics !== 'boolean') {
    return NextResponse.json({ error: 'analytics_required' }, { status: 400 })
  }

  const analytics = data.analytics
  const wordingVersion =
    typeof data.wordingVersion === 'string' && data.wordingVersion === CONSENT_WORDING_VERSION
      ? data.wordingVersion
      : CONSENT_WORDING_VERSION
  const source = typeof data.source === 'string' ? data.source.slice(0, 120) : 'cookie_banner'
  const session = await getServerSession(authOptions).catch(() => null)
  const userId = session?.user?.id ?? null
  const forwardedFor = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null
  const proof = JSON.stringify({
    timestamp: new Date().toISOString(),
    ipHash: hashIp(forwardedFor),
    userAgent: (req.headers.get('user-agent') || '').slice(0, 400),
  })

  try {
    await (db as any).$transaction(async (tx: any) => {
      await tx.consentRecord.create({
        data: {
          userId,
          purpose: 'analytics',
          channel: 'web',
          source,
          wordingVersion,
          grantedAt: analytics ? new Date() : null,
          withdrawnAt: analytics ? null : new Date(),
          proof,
        },
      })
      if (userId) {
        await tx.user.update({ where: { id: userId }, data: { consentAnalytics: analytics } })
      }
    })
  } catch (error) {
    console.error('[privacy/consent] audit ledger failed:', error)
    return NextResponse.json({ error: 'consent_not_saved' }, { status: 500 })
  }

  const preference = { version: wordingVersion, analytics, updatedAt: new Date().toISOString() }
  const response = NextResponse.json({ ok: true, preference })
  response.cookies.set(CONSENT_COOKIE_NAME, JSON.stringify(preference), {
    path: '/',
    maxAge: CONSENT_MAX_AGE_SECONDS,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })
  return response
}
