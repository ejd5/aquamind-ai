import { describe, expect, it } from 'vitest'
import {
  getBillingAccessEnvironment,
  resolveBillingRuntimeContext,
} from '@/lib/billing/identity'

describe('Launch R1 — staging billing runtime inference', () => {
  it('infers sandbox only for a verified aqwelia-staging Vercel Preview', () => {
    const context = resolveBillingRuntimeContext({
      deploymentEnv: '',
      allowSandbox: false,
      vercelEnv: 'preview',
      vercelUrl: 'aqwelia-staging-abc123-ejd5s-projects.vercel.app',
      vercelProjectProductionUrl: 'aqwelia-staging.vercel.app',
    })

    expect(context).toEqual({
      deploymentEnvironment: 'staging',
      sandboxAllowed: true,
      billingAccessEnvironment: 'sandbox',
      inferredFromVercel: true,
    })
  })

  it('Vercel Production can never be overridden into sandbox', () => {
    const context = resolveBillingRuntimeContext({
      deploymentEnv: 'staging',
      allowSandbox: true,
      vercelEnv: 'production',
      vercelUrl: 'aqwelia-staging-abc123-ejd5s-projects.vercel.app',
      vercelProjectProductionUrl: 'aqwelia-staging.vercel.app',
    })

    expect(context.deploymentEnvironment).toBe('production')
    expect(context.sandboxAllowed).toBe(false)
    expect(context.billingAccessEnvironment).toBe('production')
  })

  it('an unrelated Vercel Preview fails closed to production billing', () => {
    const context = resolveBillingRuntimeContext({
      deploymentEnv: '',
      allowSandbox: false,
      vercelEnv: 'preview',
      vercelUrl: 'aqwelia-production-git-some-branch-ejd5s-projects.vercel.app',
      vercelProjectProductionUrl: 'aqwelia-production.vercel.app',
    })

    expect(context.deploymentEnvironment).toBe('unknown')
    expect(context.sandboxAllowed).toBe(false)
    expect(context.billingAccessEnvironment).toBe('production')
  })

  it('explicit staging still requires sandbox permission outside the verified staging Preview', () => {
    expect(getBillingAccessEnvironment({
      deploymentEnv: 'staging',
      allowSandbox: false,
      vercelEnv: '',
      vercelUrl: '',
      vercelProjectProductionUrl: '',
    })).toBe('production')

    expect(getBillingAccessEnvironment({
      deploymentEnv: 'staging',
      allowSandbox: true,
      vercelEnv: '',
      vercelUrl: '',
      vercelProjectProductionUrl: '',
    })).toBe('sandbox')
  })

  it('invalid or missing configuration remains fail-closed', () => {
    expect(getBillingAccessEnvironment({
      deploymentEnv: 'invalid',
      allowSandbox: true,
      vercelEnv: 'preview',
      vercelUrl: 'some-other-project.vercel.app',
      vercelProjectProductionUrl: 'some-other-project.vercel.app',
    })).toBe('production')
  })
})
