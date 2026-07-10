/**
 * AQWELIA — Monitoring & error tracking (P8-INFRA)
 *
 * Single entry point for observability hooks used across the app:
 *   1. `initMonitoring()` — called once on server boot (Next.js instrumentation
 *      file or root layout). Initialises Sentry when `SENTRY_DSN` is set, and
 *      is a no-op otherwise (so dev/preview never crash if Sentry isn't
 *      configured).
 *   2. `captureError(error, context?)` — server-side error capture. Routes to
 *      Sentry when active, otherwise logs to stderr with a structured payload
 *      that production log aggregators (Loki, Datadog, GCP Logging…) can parse.
 *   3. `captureMessage(message, level?)` — for non-error events (info/warning).
 *   4. `withSpan<T>(name, fn)` — performance timing helper. Returns the fn
 *      result; logs the duration in ms. Future: route to Sentry transactions.
 *   5. `reportClientError(error, context?)` — client-side error reporter
 *      (called from a React error boundary). POSTs to /api/health with the
 *      payload so the server can persist it server-side.
 *   6. `getHealthStatus()` — synchronously checks the runtime health (DB
 *      ping, env vars). Used by /api/health.
 *
 * Why a placeholder pattern:
 *   - Sentry SDK (`@sentry/node` + `@sentry/nextjs`) is intentionally NOT
 *     installed in this repo (zero-deps policy for the MVP). The functions
 *     below are typed and tested placeholders: they degrade gracefully to
 *     structured console logging, so the rest of the codebase can integrate
 *     them now and we only need to install Sentry + flip the implementation
 *     when we go to prod-scale.
 *
 * Usage:
 *   // instrumentation.ts (Next.js 15+ auto-loaded on boot)
 *   import { initMonitoring } from '@/lib/monitoring'
 *   export async function register() { initMonitoring() }
 *
 *   // any route handler / server component
 *   import { captureError } from '@/lib/monitoring'
 *   try { await risky() } catch (e) { captureError(e, { route: '/api/foo' }) }
 */

/** Severity level (subset of Sentry's SeverityLevel). */
export type Severity = 'fatal' | 'error' | 'warning' | 'info' | 'debug'

/** True when SENTRY_DSN is set in the environment. */
export function isSentryEnabled(): boolean {
  return Boolean(process.env.SENTRY_DSN)
}

/** True when the runtime is the browser (not Node). */
function isBrowser(): boolean {
  return typeof window !== 'undefined'
}

/**
 * Initialise monitoring on server boot. Sentry is loaded lazily only if its
 * DSN is configured — otherwise we no-op. Future Sentry integration would
 * `import * as Sentry from '@sentry/nextjs'` here.
 */
export function initMonitoring(): void {
  if (isBrowser()) {
    // Client-side init would go here (Sentry.init with browserTracingIntegration).
    return
  }
  if (isSentryEnabled()) {
    // TODO: when @sentry/nextjs is installed, call Sentry.init here with:
    //   dsn: process.env.SENTRY_DSN,
    //   tracesSampleRate: 0.1,
    //   environment: process.env.NODE_ENV,
    //   release: process.env.NEXT_PUBLIC_APP_VERSION,
    console.info('[monitoring] SENTRY_DSN detected — Sentry init placeholder (SDK not installed yet).')
  } else {
    console.info('[monitoring] No SENTRY_DSN — running in log-only mode.')
  }
}

/**
 * Capture an unexpected error server-side. Adds structured context (route,
 * userId, request id…) for log aggregators. Future: forward to Sentry.
 */
export function captureError(error: unknown, context: Record<string, unknown> = {}): void {
  const payload = {
    level: 'error' as Severity,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    error:
      error instanceof Error
        ? { name: error.name, message: error.message, stack: error.stack }
        : { name: 'UnknownError', message: String(error) },
    context,
  }

  if (isBrowser()) {
    // Client-side: forward to the server via the /api/health endpoint.
    void reportClientError(payload).catch(() => {
      // Never throw from the error reporter itself.
    })
    return
  }

  // Server-side: structured log + (future) Sentry captureException.
  console.error('[monitoring.captureError]', JSON.stringify(payload))
  // TODO: Sentry.captureException(error, { extra: context }) when SDK is installed.
}

/** Capture a non-error message (info/warning). */
export function captureMessage(message: string, level: Severity = 'info', context: Record<string, unknown> = {}): void {
  const payload = {
    level,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    message,
    context,
  }
  if (level === 'error' || level === 'fatal') {
    console.error('[monitoring.captureMessage]', JSON.stringify(payload))
  } else if (level === 'warning') {
    console.warn('[monitoring.captureMessage]', JSON.stringify(payload))
  } else {
    console.info('[monitoring.captureMessage]', JSON.stringify(payload))
  }
}

/**
 * Performance timing helper. Wraps an async fn, logs the duration, returns
 * the result. Future: route to Sentry transactions / OpenTelemetry spans.
 *
 * Usage:
 *   const user = await withSpan('db.user.findUnique', () => db.user.findUnique(...))
 */
export async function withSpan<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const start = Date.now()
  try {
    const result = await fn()
    const durationMs = Date.now() - start
    console.info(`[monitoring.span] ${name} ${durationMs}ms`)
    return result
  } catch (err) {
    const durationMs = Date.now() - start
    console.error(`[monitoring.span] ${name} FAILED ${durationMs}ms`, err)
    throw err
  }
}

/**
 * Client-side error reporter. POSTs the payload to /api/health so the server
 * can persist it (or forward to Sentry server-side, avoiding CORS / DSN
 * leakage in the browser bundle). Fire-and-forget, never throws.
 */
export async function reportClientError(payload: unknown): Promise<void> {
  if (!isBrowser()) return
  try {
    await fetch('/api/health', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'client_error', payload }),
      // Use keepalive so the report survives page unload.
      keepalive: true,
    })
  } catch {
    // Network down, /api/health 500, etc. — swallow silently.
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Health check
// ──────────────────────────────────────────────────────────────────────────

export interface HealthStatus {
  status: 'ok' | 'degraded' | 'down'
  timestamp: string
  environment: string
  version: string
  checks: {
    database: 'ok' | 'fail'
    sentry: 'enabled' | 'disabled'
  }
  uptimeMs: number
}

/** Server boot timestamp — used to compute uptime. */
const BOOT_TIME = Date.now()

/**
 * Compute the current runtime health status. Pings the DB with a trivial
 * `$queryRaw` and reports Sentry status. Used by /api/health.
 *
 * Returns a `HealthStatus` object — never throws (errors → `status: 'down'`).
 */
export async function getHealthStatus(dbPing: () => Promise<unknown>): Promise<HealthStatus> {
  let database: 'ok' | 'fail' = 'ok'
  try {
    await dbPing()
  } catch {
    database = 'fail'
  }

  const status: HealthStatus['status'] = database === 'ok' ? 'ok' : 'degraded'

  return {
    status,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.NEXT_PUBLIC_APP_VERSION || '0.0.0',
    checks: {
      database,
      sentry: isSentryEnabled() ? 'enabled' : 'disabled',
    },
    uptimeMs: Date.now() - BOOT_TIME,
  }
}
