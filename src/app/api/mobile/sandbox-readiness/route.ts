import { NextResponse } from 'next/server'
import { getBillingAccessEnvironment } from '@/lib/billing/identity'

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
  const deploymentEnvironment = (process.env.AQWELIA_DEPLOYMENT_ENV || '').trim().toLowerCase()

  if (vercelEnvironment === 'production' || deploymentEnvironment === 'production') {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  const sandboxAllowed = process.env.BILLING_ALLOW_SANDBOX === 'true'
  const billingAccessEnvironment = getBillingAccessEnvironment()
  const ok =
    deploymentEnvironment === 'staging' &&
    sandboxAllowed &&
    billingAccessEnvironment === 'sandbox'

  return NextResponse.json(
    {
      ok,
      vercelEnvironment: vercelEnvironment || 'unknown',
      deploymentEnvironment: deploymentEnvironment || 'unset',
      sandboxAllowed,
      billingAccessEnvironment,
    },
    { status: ok ? 200 : 503 },
  )
}
