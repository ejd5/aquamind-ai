import { describe, expect, it } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const file = (path: string) => readFileSync(join(root, path), 'utf8')

describe('P0-L2 launch compliance contracts', () => {
  it('gates PostHog browser loading behind explicit consent and supports re-consent', () => {
    const source = file('src/app/posthog-provider.tsx')
    expect(source).toContain("await import('posthog-js')")
    expect(source).toContain('analyticsConsentGranted()')
    expect(source).not.toContain("import posthog from 'posthog-js'")
    expect(source).toContain('client.opt_out_capturing?.()')
    expect(source).toContain('client.opt_in_capturing?.()')
    expect(source).toContain('__setPostHogClient(client)')
  })

  it('persists consent server-side before enabling optional analytics', () => {
    const source = file('src/lib/privacy/consent.ts')
    const requestIndex = source.indexOf("fetch('/api/privacy/consent'")
    const writeIndex = source.indexOf('writeConsentPreference(preference)')
    expect(requestIndex).toBeGreaterThan(-1)
    expect(writeIndex).toBeGreaterThan(requestIndex)
    expect(source).toContain("throw new Error('consent_not_saved')")
    expect(source).toContain("throw new Error('invalid_consent_response')")

    const banner = file('src/components/privacy/cookie-consent.tsx')
    expect(banner).toContain('setSaveError(copy.saveError)')
    expect(banner).toContain('disabled={saving}')
    expect(banner).toContain('border border-border bg-background')
  })

  it('keeps server analytics opt-in and disables GeoIP', () => {
    const source = file('src/lib/analytics-server.ts')
    expect(source).toContain("POSTHOG_SERVER_ENABLED !== 'true'")
    expect(source).toContain('consentAnalytics')
    expect(source).toContain('disableGeoip: true')
  })

  it('publishes truthful legal, AI and deletion resources', () => {
    for (const path of [
      'src/app/legal/mentions-legales/page.tsx',
      'src/app/legal/sous-traitants/page.tsx',
      'src/app/legal/ia/page.tsx',
      'src/app/legal/suppression-compte/page.tsx',
    ]) expect(existsSync(join(root, path))).toBe(true)
    expect(file('src/app/legal/cookies/page.tsx')).not.toContain('_ga')
    expect(file('src/i18n/locales/compliance-copy.ts')).not.toContain('Google Analytics 4')
  })

  it('localizes legal dates and privacy navigation in every supported locale', () => {
    const legalDocument = file('src/components/legal/legal-document.tsx')
    expect(legalDocument).toContain('Intl.DateTimeFormat(locale')
    expect(legalDocument).toContain('locale: string')
    expect(legalDocument).toContain('translationWarning')
    const privacy = file('src/app/legal/privacy/page.tsx')
    expect(privacy).toContain('root.common.processorsLink')
    expect(privacy).toContain('root.common.aiTransparencyLink')
    expect(privacy).toContain('root.common.deleteAccountLink')
    const copy = file('src/i18n/locales/compliance-copy.ts')
    for (const locale of ['fr', 'en', 'es', 'de', 'it', 'pt', 'nl']) {
      expect(copy).toContain(`  "${locale}": {`)
    }
    for (const key of ['processorsLink', 'aiTransparencyLink', 'deleteAccountLink', 'saveError', 'legalTranslationWarning', 'cancelSubscriptionBeforeDeletion', 'transferOrganizationBeforeDeletion']) {
      expect(copy.match(new RegExp(`"${key}"`, 'g'))?.length).toBe(7)
    }
  })

  it('marks AI output and explains it visibly', () => {
    expect(file('src/components/aquamind/module-assistant.tsx')).toContain('data-ai-generated')
    expect(file('src/components/aquamind/module-diagnostic.tsx')).toContain('AITransparencyNotice')
    expect(file('src/components/ai/ai-transparency-notice.tsx')).toContain('/legal/ia')
  })

  it('handles account deletion outside Prisma cascades without orphaning Pro data', () => {
    const source = file('src/app/api/account/delete/route.ts')
    for (const model of ['proLocationPoint', 'proTrackingSession', 'proTrackingDevice', 'proLocationAccessLog', 'offlineMutation', 'cart', 'certification', 'agentRun', 'billingEvent', 'consentRecord', 'order']) {
      expect(source).toContain(model)
    }
    expect(source).toContain('active_subscription_requires_cancellation')
    expect(source).toContain('owned_organization_requires_transfer')
    expect(source).toContain('organizationIds')
    expect(source).toContain('currentPeriodEnd: { gt: now }')
    expect(source).toContain('randomUUID()')
    expect(source).toContain('deletedIdentity')
    expect(source).toContain('actorUserId: null')
  })

  it('exports personal support, consent and professional location records without provider secrets', () => {
    const source = file('src/app/api/account/export/route.ts')
    for (const model of ['consentRecord', 'proTrackingDevice', 'proLocationAccessLog', 'contactMessage']) {
      expect(source).toContain(model)
    }
    expect(source).toContain("'OAuth access/refresh/id tokens'")
    expect(source).toContain("'IoT apiKey'")
    expect(source).not.toContain('tokenHash: true')
  })

  it('defaults every new account creation path to no analytics consent', () => {
    expect(file('src/app/api/auth/register/route.ts')).toContain('consentAnalytics: false')
    expect(file('src/lib/auth.ts')).toContain('consentAnalytics: false')
    expect(file('prisma/schema.prisma')).toContain('consentAnalytics Boolean  @default(false)')
    expect(file('prisma/postgresql/schema.prisma')).toContain('consentAnalytics Boolean  @default(false)')
  })
})
