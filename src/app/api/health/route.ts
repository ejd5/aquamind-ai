/**
 * AQWELIA — Health check endpoint (P8-INFRA)
 *
 * GET /api/health
 *   Returns the runtime health status (DB ping + Sentry flag + uptime).
 *   Used by:
 *     - Container orchestrators (k8s liveness/readiness probes)
 *     - Uptime monitors (UptimeRobot, BetterStack…)
 *     - The client-side `reportClientError()` reporter (POST).
 *
 * POST /api/health
 *   Accepts a client-side error report (sent by `reportClientError` in
 *   `src/lib/monitoring.ts`). Logs it server-side (future: forward to Sentry).
 *   Always returns 204 (no content) so the client never blocks on the report.
 *
 * Auth: none (the GET endpoint is intentionally public — it leaks no PII,
 * only the high-level `status` and `checks` flags). The POST endpoint is
 * rate-limited in production by the edge layer (Caddy / Cloudflare).
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getHealthStatus, captureError } from '@/lib/monitoring'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** GET — health probe. */
export async function GET() {
  const status = await getHealthStatus(async () => {
    // Trivial DB ping — `SELECT 1` on SQLite, no table scan.
    await db.$queryRaw`SELECT 1`
  })

  // 200 when ok/degraded, 503 when fully down.
  const httpStatus = status.status === 'down' ? 503 : 200
  return NextResponse.json(status, { status: httpStatus })
}

/** POST — client-side error report. */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    if (body?.type !== 'client_error' || !body?.payload) {
      return NextResponse.json({ error: 'invalid_payload' }, { status: 400 })
    }
    // Forward to the monitoring pipeline (logs + future Sentry server-side).
    captureError(new Error('client_error_report'), {
      source: 'client',
      payload: body.payload,
    })
    return new NextResponse(null, { status: 204 })
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }
}
