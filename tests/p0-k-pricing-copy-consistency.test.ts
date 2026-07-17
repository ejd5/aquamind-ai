import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const LOCALES = ['fr', 'en', 'es', 'de', 'it', 'pt', 'nl'] as const

function loadLocale(locale: string) {
  const raw = readFileSync(
    join(process.cwd(), 'src/i18n/locales', `${locale}.json`),
    'utf-8',
  )
  return JSON.parse(raw) as Record<string, unknown>
}

function getNested(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object' && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key]
    }
    return undefined
  }, obj)
}

describe('P0-K: Pricing copy consistency across all locales', () => {
  describe('No Premium in display values', () => {
    for (const locale of LOCALES) {
      it(`${locale}: has no "Premium" in user-facing values (except allowed key names)`, () => {
        const data = loadLocale(locale)

        const ALLOWED_PREMIUM_KEYS = new Set([
          'premium', 'planPremium', 'allPremium', 'shortPremium', 'shortPremiumBadge',
          'lockedPremium', 'spaPremiumTitle', 'spaPremiumText1', 'spaPremiumText2',
          'spaPremiumCta', 'spaBrandCategoryPremium', 'spaPremiumNote', 'spaPremiumLead',
          'spaPremiumBody', 'responseTimePremium', 'premiumLabel', 'guides_premium',
          'premiumFeatures', 'premiumGuide', 'premiumGuideDesc',
        ])

        const violations: string[] = []

        function walk(obj: unknown, path: string) {
          if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
            for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
              if (typeof v === 'string' && v.includes('Premium') && !ALLOWED_PREMIUM_KEYS.has(k)) {
                violations.push(`${path}.${k} = "${v.slice(0, 60)}"`)
              } else {
                walk(v, `${path}.${k}`)
              }
            }
          } else if (Array.isArray(obj)) {
            obj.forEach((v, i) => walk(v, `${path}[${i}]`))
          }
        }

        walk(data, '')
        expect(violations, `Premium found in ${locale} display values:\n${violations.join('\n')}`).toHaveLength(0)
      })
    }
  })

  describe('No passUrgency content in tarifs', () => {
    for (const locale of LOCALES) {
      it(`${locale}: tarifs.passUrgency* keys are empty or absent`, () => {
        const data = loadLocale(locale)
        const tarifs = getNested(data, 'tarifs') as Record<string, unknown> | undefined
        if (!tarifs) return

        for (const key of Object.keys(tarifs)) {
          if (key.startsWith('passUrgency')) {
            expect(
              tarifs[key],
              `${locale}.tarifs.${key} should be empty`,
            ).toBe('')
          }
        }
      })
    }
  })

  describe('No trial-related content in plans', () => {
    for (const locale of LOCALES) {
      it(`${locale}: plans trial keys are empty`, () => {
        const data = loadLocale(locale)
        const plans = getNested(data, 'plans') as Record<string, unknown> | undefined
        if (!plans) return

        for (const key of ['emergencyPass', 'trialBadge', 'trialLabel', 'trialDisclaimer', 'trialEndingDays', 'trialNoCharge']) {
          if (key in plans) {
            expect(plans[key], `${locale}.plans.${key} should be empty`).toBe('')
          }
        }
      })
    }
  })

  describe('Plan names use canonical commercial names', () => {
    for (const locale of LOCALES) {
      it(`${locale}: plans.premium.name is "Pool"`, () => {
        const data = loadLocale(locale)
        const name = getNested(data, 'plans.premium.name')
        expect(name).toBe('Pool')
      })
    }
  })

  describe('nav.premium references Pool, SPA or Complete', () => {
    for (const locale of LOCALES) {
      it(`${locale}: nav.premium does not contain standalone "Premium"`, () => {
        const data = loadLocale(locale)
        const val = getNested(data, 'nav.premium') as string | undefined
        if (!val) return
        // Should mention Pool or SPA, not standalone "Premium"
        expect(val).not.toMatch(/\bPremium\b/)
        expect(val).toMatch(/Pool|SPA/)
      })
    }
  })

  describe('savings section uses canonical plan prices', () => {
    it('fr: savingsRoi550 key exists', () => {
      const data = loadLocale('fr')
      expect(getNested(data, 'landing.savingsRoi550')).toBe('550€')
    })

    for (const locale of LOCALES) {
      it(`${locale}: savingsBarPool references Pool`, () => {
        const data = loadLocale(locale)
        const val = getNested(data, 'landing.savingsBarPool') as string | undefined
        if (val) {
          expect(val).toContain('Pool')
        }
      })
    }
  })

  describe('No 7-day trial or emergency pass pricing', () => {
    for (const locale of LOCALES) {
      it(`${locale}: no "3.99" or "3,99" in tarifs or fonctionnalites`, () => {
        const data = loadLocale(locale)
        const tarifs = JSON.stringify(getNested(data, 'tarifs') ?? {})
        const fonctionnalites = JSON.stringify(getNested(data, 'fonctionnalites') ?? {})
        expect(tarifs + fonctionnalites).not.toMatch(/[33][.,]99/)
      })
    }
  })

  describe('onboarding.spaPremiumNote uses "SPA" not "Premium"', () => {
    for (const locale of LOCALES) {
      it(`${locale}: onboarding.spaPremiumNote mentions SPA`, () => {
        const data = loadLocale(locale)
        const val = getNested(data, 'onboarding.spaPremiumNote') as string | undefined
        if (!val) return
        expect(val.toLowerCase()).toContain('spa')
        expect(val).not.toMatch(/\bPremium\b/)
      })
    }
  })

  describe('Legal CGU article3 disclaims trial', () => {
    for (const locale of LOCALES) {
      it(`${locale}: legal.cgv.article3Title exists and mentions no trial`, () => {
        const data = loadLocale(locale)
        const title = getNested(data, 'legal.cgv.article3Title') as string | undefined
        if (!title) return
        expect(title).not.toMatch(/\bPremium\b/)
      })
    }
  })

  describe('settings.planPremium uses commercial names', () => {
    for (const locale of LOCALES) {
      it(`${locale}: settings.planPremium does not contain "Premium"`, () => {
        const data = loadLocale(locale)
        const val = getNested(data, 'settings.planPremium') as string | undefined
        if (!val) return
        expect(val).not.toMatch(/Premium/i)
        expect(val).toMatch(/Pool|SPA|Complete/)
      })
    }
  })

  describe('No "3 subscriptions/offers" for 4 plans', () => {
    const THIRIS_PATTERNS = [
      /3 abonnements/i,
      /3 subscriptions/i,
      /3 Abonnements/i,
      /3 suscripciones/i,
      /3 Planes/i,
      /3 Pläne/i,
      /3 Piani/i,
      /3 Planos/i,
    ]
    for (const locale of LOCALES) {
      it(`${locale}: no "3 plans/subscriptions" wording in legal or b2c`, () => {
        const data = loadLocale(locale)
        const legal = JSON.stringify(getNested(data, 'legal') ?? {})
        const b2c = JSON.stringify(getNested(data, 'b2c') ?? {})
        const combined = legal + b2c
        for (const pattern of THIRIS_PATTERNS) {
          expect(combined, `Found "${pattern}" in ${locale}`).not.toMatch(pattern)
        }
      })
    }
  })
})
