import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
const file = (path: string) => readFileSync(join(root, path), 'utf8')

describe('P0-L launch security baseline', () => {
  it('hides and blocks paused GPS surfaces behind one disabled-by-default flag', () => {
    const features = file('src/lib/features.ts')
    const layout = file('src/app/pro/app/layout.tsx')
    const mobile = file('src/components/pro/pro-mobile-shell.tsx')
    const dispatch = file('src/app/pro/app/dispatch/page.tsx')
    const middleware = file('src/middleware.ts')
    expect(features).toContain("NEXT_PUBLIC_PRO_GPS_ENABLED === 'true'")
    expect(layout).toContain('PRO_GPS_ENABLED && access.canManage')
    expect(mobile).toContain('gpsEnabled')
    expect(dispatch).toContain('if (!PRO_GPS_ENABLED) notFound()')
    expect(middleware).toContain('PAUSED_GPS_API_PATTERNS')
    expect(middleware).toContain('!PRO_GPS_ENABLED')
  })

  it('never enables dangerous OAuth e-mail linking and blocks collisions', () => {
    const auth = file('src/lib/auth.ts')
    expect(auth).not.toContain('allowDangerousEmailAccountLinking')
    expect(auth).toContain('Blocked automatic OAuth account linking')
    expect(auth).toContain("return '/auth/signin?error=OAuthAccountNotLinked'")
    expect(auth).toContain('OAuth provider did not return an e-mail for an unlinked identity')
  })

  it('creates Stripe portal sessions only from stored customer IDs', () => {
    const portal = file('src/app/api/stripe/portal/route.ts')
    expect(portal).toContain('stripeCustomerId: { not: null }')
    expect(portal).toContain('customer: stripeCustomerId')
    expect(portal).not.toContain('stripe.customers.list')
  })

  it('enforces server-side Turnstile validation when configured', () => {
    const register = file('src/app/api/auth/register/route.ts')
    const verifier = file('src/lib/security/turnstile.ts')
    expect(register).toContain('verifyTurnstileToken')
    expect(verifier).toContain('turnstile/v0/siteverify')
    expect(verifier).toContain('TURNSTILE_REQUIRED')
    expect(verifier).toContain('idempotency_key')
    const authPage = file('src/app/auth/signin/page.tsx')
    const copy = file('src/i18n/locales/auth-security-copy.ts')
    expect(authPage).toContain('turnstileVersion')
    for (const locale of ['fr', 'en', 'es', 'de', 'it', 'pt', 'nl']) expect(copy).toContain(`  ${locale}: {`)
  })

  it('retries due billing events with capped idempotent processing', () => {
    const retry = file('src/lib/billing/retry.ts')
    const idempotency = file('src/lib/billing/idempotency.ts')
    const cron = file('src/app/api/cron/billing-retries/route.ts')
    expect(idempotency).toContain('export const MAX_BILLING_RETRIES = 3')
    expect(retry).toContain('processEventIdempotently')
    expect(retry).toContain('billing_retry_exhausted')
    expect(retry).toContain("@/lib/billing/providers/stripe-event")
    expect(retry).toContain("@/lib/billing/providers/revenuecat-event")
    expect(cron).toContain('timingSafeEqual')
  })
})
