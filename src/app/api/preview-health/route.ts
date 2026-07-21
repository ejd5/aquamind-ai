import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function sanitizeErrorMessage(error: unknown): string | null {
  if (!(error instanceof Error)) return null

  return error.message
    .replace(/postgres(?:ql)?:\/\/[^\s]+/gi, '[REDACTED_DATABASE_URL]')
    .replace(/file:[^\s]+/gi, '[REDACTED_SQLITE_URL]')
    .slice(0, 240)
}

export async function GET() {
  if (process.env.VERCEL_ENV !== 'preview') {
    return new NextResponse(null, { status: 404 })
  }

  const report: {
    environment: Record<string, string | boolean | null>
    database: {
      status: 'pending' | 'ok' | 'error'
      errorName?: string
      errorCode?: string | null
      errorMessage?: string | null
    }
  } = {
    environment: {
      vercelEnv: process.env.VERCEL_ENV ?? null,
      databaseProvider: process.env.DATABASE_PROVIDER ?? null,
      databaseUrlConfigured: Boolean(process.env.DATABASE_URL),
      nextAuthSecretConfigured: Boolean(
        process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET
      ),
      nextAuthUrlConfigured: Boolean(process.env.NEXTAUTH_URL),
      authTrustHost: process.env.AUTH_TRUST_HOST ?? null,
    },
    database: {
      status: 'pending',
    },
  }

  try {
    const { db } = await import('@/lib/db')
    await (db as any).$queryRawUnsafe('SELECT 1')
    report.database.status = 'ok'
  } catch (error) {
    const candidate = error as { name?: string; code?: string }
    report.database = {
      status: 'error',
      errorName: candidate?.name ?? 'UnknownError',
      errorCode: candidate?.code ?? null,
      errorMessage: sanitizeErrorMessage(error),
    }
  }

  return NextResponse.json(report, {
    status: report.database.status === 'ok' ? 200 : 503,
    headers: {
      'Cache-Control': 'no-store',
    },
  })
}
