import { NextResponse } from 'next/server'
import { resolveBillingRuntimeContext } from '@/lib/billing/identity'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Preview/Staging-only readiness probe for native sandbox builds.
 *
 * It deliberately exposes no secret values and is unavailable on Production.
 * The mobile sandbox workflow uses it to fail fast when Staging is not actually
 * configured to accept RevenueCat sandbox events.
 */
export async function GET() {
  const vercelEnvironment = (process.env.VERCEL_ENV || '').trim().toLowerCase()
  const runtimeContext = resolveBillingRuntimeContext()

  if (
    vercelEnvironment === 'production' ||
    runtimeContext.deploymentEnvironment === 'production'
  ) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  const ok =
    runtimeContext.deploymentEnvironment === 'staging' &&
    runtimeContext.sandboxAllowed &&
    runtimeContext.billingAccessEnvironment === 'sandbox'

  return NextResponse.json(
    {
      ok,
      vercelEnvironment: vercelEnvironment || 'unknown',
      deploymentEnvironment: runtimeContext.deploymentEnvironment,
      sandboxAllowed: runtimeContext.sandboxAllowed,
      billingAccessEnvironment: runtimeContext.billingAccessEnvironment,
      inferredFromVercel: runtimeContext.inferredFromVercel,
    },
    { status: ok ? 200 : 503 },
  )
}
