import { NextRequest, NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { retryDueBillingEvents } from '@/lib/billing/retry'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function authorized(req: NextRequest): boolean {
  const secret = process.env.BILLING_RETRY_CRON_SECRET
  if (!secret) return false
  const authorization = req.headers.get('authorization') || ''
  const expected = `Bearer ${secret}`
  const left = Buffer.from(authorization)
  const right = Buffer.from(expected)
  return left.length === right.length && crypto.timingSafeEqual(left, right)
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const summary = await retryDueBillingEvents(25)
  return NextResponse.json({ ok: true, ...summary })
}

export async function GET(req: NextRequest) {
  return POST(req)
}
