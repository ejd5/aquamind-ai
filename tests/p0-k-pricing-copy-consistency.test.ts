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

function walkStrings(
  obj: unknown,
  path: string,
  cb: (value: string, fullPath: string) => void,
) {
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      const currentPath = path ? `${path}.${k}` : k
      if (typeof v === 'string') {
        cb(v, currentPath)
      } else {
        walkStrings(v, currentPath, cb)
      }
    }
  } else if (Array.isArray(obj)) {
    obj.forEach((v, i) => walkStrings(v, `${path}[${i}]`, cb))
  }
}

const COMMERCIAL_ROOTS = [
  'landing',
  'tarifs',
  'plans',
  'nav',
  'onboarding',
  'settings',
  'fonctionnalites',
  'spaPage',
  'modules.guides',
  'guidesData',
  'legal.cgu',
  'legal.cgv',
]

// This is service availability, not a paid seven-day offer. Keeping the
// exception path-scoped prevents a future commercial weekly offer elsewhere.
const DURATION_COPY_EXCEPTIONS = new Set([
  'landing.piscinisteCallout2',
])

function collectStrings(data: Record<string, unknown>, roots: string[]) {
  const values: Array<{ path: string; value: string }> = []
  for (const root of roots) {
    const value = getNested(data, root)
    if (value !== undefined) {
      walkStrings(value, root, (stringValue, path) => values.push({ path, value: stringValue }))
    }
  }
  return values
}

describe('P0-K: Pricing copy consistency across all locales', () => {
  describe('Commercial plan names never use Premium', () => {
    for (const locale of LOCALES) {
      it(`${locale}: has no visible Premium plan or guide label`, () => {
        const data = loadLocale(locale)
        const violations = collectStrings(data, COMMERCIAL_ROOTS)
          .filter(({ value }) => /\bpremium\b/i.test(value))
          .map(({ path, value }) => `${path} = "${value.slice(0, 80)}"`)

        expect(violations, `Premium found in ${locale} commercial values:\n${violations.join('\n')}`).toHaveLength(0)
      })
    }
  })

  describe('No commercial keys in actionPlan', () => {
    const FORBIDDEN_KEYS = [
      'planPremium', 'allPremium', 'restoreDesc', 'noActiveSubscriptionDesc',
      'unlockDesc', 'premiumGuide', 'premiumGuideDesc',
      'trialBadge', 'trialLabel', 'trialDisclaimer',
      'ctaPrimary', 'heroBullet1', 'mod11Desc',
      'faq3Q', 'faq3A',
    ]
    for (const locale of LOCALES) {
      it(`${locale}: actionPlan has no commercial/navigation keys`, () => {
        const data = loadLocale(locale)
        const actionPlan = getNested(data, 'actionPlan') as Record<string, unknown> | undefined
        if (!actionPlan) return

        const found = FORBIDDEN_KEYS.filter(k => k in actionPlan)
        expect(found, `${locale}.actionPlan contains misplaced keys: ${found.join(', ')}`).toHaveLength(0)
      })
    }
  })

  describe('No Team/Fleet/Enterprise in B2C namespaces (recursive)', () => {
    const B2C_TERMS = ['Team', 'Fleet', 'Enterprise']
    const B2C_NAMESPACES = ['landing', 'tarifs', 'plans']
    const NARRATIVE_EXCLUSIONS = new Set([
      'landing.storyTeam',
      'landing.storyQuote5',
    ])

    for (const locale of LOCALES) {
      it(`${locale}: B2C namespaces have no Team/Fleet/Enterprise (recursive, except narrative)`, () => {
        const data = loadLocale(locale)
        const violations: string[] = []

        for (const ns of B2C_NAMESPACES) {
          const obj = getNested(data, ns)
          if (!obj) continue
          walkStrings(obj, ns, (val, fullPath) => {
            if (NARRATIVE_EXCLUSIONS.has(fullPath)) return
            for (const term of B2C_TERMS) {
              if (val.includes(term)) {
                violations.push(`${fullPath} contains "${term}"`)
              }
            }
          })
        }

        for (const legal of ['legal.cgu', 'legal.cgv']) {
          const obj = getNested(data, legal)
          if (!obj) continue
          walkStrings(obj, legal, (val, fullPath) => {
            for (const term of B2C_TERMS) {
              if (val.includes(term)) {
                violations.push(`${fullPath} contains "${term}"`)
              }
            }
          })
        }

        expect(violations, `${locale} B2C/Pro mix:\n${violations.join('\n')}`).toHaveLength(0)
      })
    }
  })

  describe('No Emergency Pass product remains visible', () => {
    const EMERGENCY_PASS = /pass urgence|emergency pass|notfallpass|pase de emergencia|pass emergenza|passe de emerg[eê]ncia|noodpas/i
    for (const locale of LOCALES) {
      it(`${locale}: no former Emergency Pass wording remains in commercial copy`, () => {
        const data = loadLocale(locale)
        const found = collectStrings(data, COMMERCIAL_ROOTS)
          .filter(({ value }) => EMERGENCY_PASS.test(value))
          .map(({ path, value }) => `${path} = "${value.slice(0, 80)}"`)
        expect(found, `${locale} has former Emergency Pass copy:\n${found.join('\n')}`).toHaveLength(0)
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

  describe('No trial-related content in plans', () => {
    for (const locale of LOCALES) {
      it(`${locale}: plans trial keys are empty or absent`, () => {
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

  describe('CGU article 6 has exactly 4 B2C offers', () => {
    for (const locale of LOCALES) {
      it(`${locale}: article6Body1 announces four offers`, () => {
        const data = loadLocale(locale)
        const body1 = getNested(data, 'legal.cgu.article6Body1') as string | undefined
        if (!body1) return
        const fourPattern = /4|four|quattro|quatro|vier|cuatro|quatre/i
        expect(body1, `article6Body1 should mention 4 offers: "${body1}"`).toMatch(fourPattern)
      })

      it(`${locale}: article6Item1 contains Free`, () => {
        const data = loadLocale(locale)
        const item = getNested(data, 'legal.cgu.article6Item1') as string | undefined
        if (!item) return
        expect(item).toMatch(/Free/i)
      })

      it(`${locale}: article6Item2 contains Pool`, () => {
        const data = loadLocale(locale)
        const item = getNested(data, 'legal.cgu.article6Item2') as string | undefined
        if (!item) return
        expect(item).toMatch(/Pool/i)
      })

      it(`${locale}: article6Item3 contains Spa`, () => {
        const data = loadLocale(locale)
        const item = getNested(data, 'legal.cgu.article6Item3') as string | undefined
        if (!item) return
        expect(item).toMatch(/Spa/i)
        expect(item, 'article6Item3 should not contain Expert').not.toMatch(/Expert/i)
      })

      it(`${locale}: article6Item4 contains Complete with 2 pools + 1 spa`, () => {
        const data = loadLocale(locale)
        const item = getNested(data, 'legal.cgu.article6Item4') as string | undefined
        expect(item, 'article6Item4 should exist and contain Complete').toBeDefined()
        expect(item!).toMatch(/Complete/i)
        expect(item!, 'article6Item4 should mention 2 pools').toMatch(/2/)
      })

      it(`${locale}: no B2C article6 item contains Expert`, () => {
        const data = loadLocale(locale)
        for (const key of ['article6Item1', 'article6Item2', 'article6Item3', 'article6Item4']) {
          const item = getNested(data, `legal.cgu.${key}`) as string | undefined
          if (item) {
            expect(item, `${key} should not contain Expert`).not.toMatch(/Expert/i)
          }
        }
      })
    }
  })

  describe('Tarifs comparator title says 4 plans', () => {
    for (const locale of LOCALES) {
      it(`${locale}: tarifs.cmpTitle mentions 4 plans`, () => {
        const data = loadLocale(locale)
        const title = getNested(data, 'tarifs.cmpTitle') as string | undefined
        if (!title) return
        expect(title, `cmpTitle should mention 4: "${title}"`).toMatch(/4/)
      })
    }
  })

  describe('savings section uses complete ROI sentence', () => {
    for (const locale of LOCALES) {
      it(`${locale}: landing.savingsRoiSentence exists and references Pool`, () => {
        const data = loadLocale(locale)
        const sentence = getNested(data, 'landing.savingsRoiSentence') as string | undefined
        expect(sentence, 'savingsRoiSentence should exist').toBeDefined()
        expect(sentence!).toContain('Pool')
        expect(sentence!).toContain('{price}')
        expect(sentence!).toContain('{savings}')
      })

      it(`${locale}: no fragmented ROI keys remain`, () => {
        const data = loadLocale(locale)
        for (const key of ['savingsRoi1', 'savingsRoi2', 'savingsRoiYearSuffix', 'savingsRoi550']) {
          const val = getNested(data, `landing.${key}`)
          expect(val, `landing.${key} should not exist`).toBeUndefined()
        }
      })
    }
  })

  describe('No artificial em dashes in commercial namespaces (recursive)', () => {
    const NS_CHECK = ['landing', 'nav', 'tarifs', 'plans', 'onboarding', 'settings', 'fonctionnalites']
    const EM_DASH_EXCLUSIONS = new Set([
      'landing.storyQuote1',
      'landing.storyQuote2',
      'landing.storyQuote3',
      'landing.storyQuote4',
      'landing.storyQuote5',
      'landing.storyTeam',
    ])
    for (const locale of LOCALES) {
      it(`${locale}: no em-dashes in commercial namespace values (recursive, except narrative)`, () => {
        const data = loadLocale(locale)
        const violations: string[] = []

        for (const ns of NS_CHECK) {
          const obj = getNested(data, ns)
          if (!obj) continue
          walkStrings(obj, ns, (val, fullPath) => {
            if (val.includes('\u2014')) {
              if (EM_DASH_EXCLUSIONS.has(fullPath)) return
              violations.push(`${fullPath}: "${val.slice(0, 60)}"`)
            }
          })
        }

        expect(violations, `Artificial em-dashes found:\n${violations.join('\n')}`).toHaveLength(0)
      })
    }
  })

  describe('No broken sentences from em-dash replacement (recursive)', () => {
    const NS_CHECK = ['landing', 'nav', 'tarifs', 'plans', 'onboarding', 'settings', 'fonctionnalites']
    const DOT_LOWER_RE = /\.\s+[a-zà-ÿñ]/

    const FALSE_POSITIVE_SUBSTRINGS = [
      'EE. UU.', 'p. ej.', 'vs.', 'd. h.', 'MwSt.',
      'Min.', 'Max.', 'Temp. max', 'Temp. máx', 'Max. temp',
      '1. pH', '2. pH', '3. pH', '4. pH',
      '24 Std.', '48 Std.', '8 Std.', '2 Std.', '3 Std.', '4 Std.', '10 Std.',
      '15-20 Min.', '2-3 Min.', '10-15 Min.', '30 Min.',
      'ggf.', 'art.', 'E.g.', 'Bijv.',
      '4 Std.', '6 Std.', '7 Std.', '9 Std.', '11 Std.', '12 Std.',
      '14 Std.', '16 Std.', '18 Std.', '20 Std.', '22 Std.',
      '48\u00a0Std.', '24\u00a0Std.',
      'nach 2 h',
    ]

    for (const locale of LOCALES) {
      it(`${locale}: no ". [lowercase]" broken sentences (recursive)`, () => {
        const data = loadLocale(locale)
        const violations: string[] = []

        for (const ns of NS_CHECK) {
          const obj = getNested(data, ns)
          if (!obj) continue
          walkStrings(obj, ns, (val, fullPath) => {
            if (DOT_LOWER_RE.test(val)) {
              const isFalse = FALSE_POSITIVE_SUBSTRINGS.some(fp => val.includes(fp))
              if (!isFalse) {
                violations.push(`${fullPath}: "${val.slice(0, 80)}"`)
              }
            }
          })
        }

        expect(violations, `Broken sentences (dot + lowercase) found:\n${violations.join('\n')}`).toHaveLength(0)
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

  describe('No "3 plans/subscriptions" for 4 offers', () => {
    const THREE_PATTERNS = [
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
      it(`${locale}: no "3 plans" wording in legal or b2c`, () => {
        const data = loadLocale(locale)
        const legal = JSON.stringify(getNested(data, 'legal') ?? {})
        const b2c = JSON.stringify(getNested(data, 'b2c') ?? {})
        const combined = legal + b2c
        for (const pattern of THREE_PATTERNS) {
          expect(combined, `Found "${pattern}" in ${locale}`).not.toMatch(pattern)
        }
      })
    }
  })

  describe('No Expert plan in B2C contexts', () => {
    for (const locale of LOCALES) {
      it(`${locale}: no plans.expert or settings.planExpert keys`, () => {
        const data = loadLocale(locale)
        expect(getNested(data, 'plans.expert'), 'plans.expert should not exist').toBeUndefined()
        expect(getNested(data, 'settings.planExpert'), 'settings.planExpert should not exist').toBeUndefined()
      })
    }
  })

  describe('No "Comparez les 3 plans"', () => {
    for (const locale of LOCALES) {
      it(`${locale}: tarifs.cmpTitle does not say "3 plans"`, () => {
        const data = loadLocale(locale)
        const title = getNested(data, 'tarifs.cmpTitle') as string | undefined
        if (!title) return
        expect(title, 'cmpTitle should not say 3 plans').not.toMatch(/3\s*(plans|abonnements|Pläne|Piani|Planos|suscripciones)/i)
      })
    }
  })

  describe('nav.premium references Pool, SPA or Complete', () => {
    for (const locale of LOCALES) {
      it(`${locale}: nav.premium does not contain standalone "Premium"`, () => {
        const data = loadLocale(locale)
        const val = getNested(data, 'nav.premium') as string | undefined
        if (!val) return
        expect(val).not.toMatch(/\bPremium\b/)
        expect(val).toMatch(/Pool|SPA/)
      })
    }
  })

  describe('Only 1, 3, 6 and 12 month paid durations are commercialized', () => {
    const FORBIDDEN_COMMERCIAL_DURATION = /(?:7\s*(?:jours?|days?|d[ií]as?|tage?|giorni|dagen)|\bweekly\b|\bhebdomadaire\b|\bsemanal\b|\bw[oö]chentlich\b|\bsettimanale\b|\bwekelijks\b)/i
    const ANNUAL_NOT_LIVE = /(?:annuel|annual|anual|j[aä]hrlich|annuale)[^.]{0,60}(?:pr[eé]paration|prepar|coming soon|indisponible|not available|pr[oó]ximamente|vorbereitung)/i
    for (const locale of LOCALES) {
      it(`${locale}: no visible weekly, seven-day or annual-not-live offer`, () => {
        const data = loadLocale(locale)
        const found = collectStrings(data, ['landing', 'tarifs', 'plans', 'spaPage'])
          .filter(({ path, value }) =>
            !DURATION_COPY_EXCEPTIONS.has(path) &&
            (FORBIDDEN_COMMERCIAL_DURATION.test(value) || ANNUAL_NOT_LIVE.test(value)),
          )
          .map(({ path, value }) => `${path} = "${value.slice(0, 100)}"`)
        expect(found, `${locale} has retired duration copy:\n${found.join('\n')}`).toHaveLength(0)
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

  describe('Legal CGV article3 disclaims trial', () => {
    for (const locale of LOCALES) {
      it(`${locale}: legal.cgv.article3Title exists and mentions no trial`, () => {
        const data = loadLocale(locale)
        const title = getNested(data, 'legal.cgv.article3Title') as string | undefined
        if (!title) return
        expect(title).not.toMatch(/\bPremium\b/)
      })
    }
  })

  describe('Landing has no obsolete empty mod11 keys', () => {
    for (const locale of LOCALES) {
      it(`${locale}: landing.mod11B1 and landing.mod11B2 are absent`, () => {
        const data = loadLocale(locale)
        expect(getNested(data, 'landing.mod11B1')).toBeUndefined()
        expect(getNested(data, 'landing.mod11B2')).toBeUndefined()

        const mod11B1 = getNested(data, 'fonctionnalites.mod11B1') as string | undefined
        const mod11B2 = getNested(data, 'fonctionnalites.mod11B2') as string | undefined
        expect(mod11B1, 'fonctionnalites.mod11B1 should remain non-empty').toBeTruthy()
        expect(mod11B2, 'fonctionnalites.mod11B2 should remain non-empty').toBeTruthy()
      })
    }
  })

  describe('Complete plan = 2 pools + 1 spa (commercial decision)', () => {
    it('wellness feature text mentions 2 pools', () => {
      const data = loadLocale('fr')
      const features = getNested(data, 'plans.wellness.features') as Record<string, string> | undefined
      expect(features, 'wellness.features should exist').toBeDefined()
      const featureStr = JSON.stringify(features)
      expect(featureStr, 'wellness features should mention 2 pools').toMatch(/2/)
    })

    it('CGU article6Item4 mentions 2 pools + 1 spa across all locales', () => {
      for (const locale of LOCALES) {
        const data = loadLocale(locale)
        const item = getNested(data, 'legal.cgu.article6Item4') as string | undefined
        if (!item) continue
        expect(item, `${locale}.article6Item4 should mention 2 pools`).toMatch(/2/)
      }
    })
  })
  describe('Pool plan is limited to one pool in every locale', () => {
    const ONE_POOL_COPY = {
      fr: '1 piscine', en: '1 pool', es: '1 piscina', de: '1 Pool',
      it: '1 piscina', pt: '1 piscina', nl: '1 zwembad',
    }
    const POOL_ROOTS = ['plans.premium', 'plans.premiumFeatures', 'plans.oasis', 'legal.cgu.article6Item2']
    const MULTI_POOL = /(?:\b[23]\s*(?:piscines?|pools?|piscinas?|piscine|zwembaden|pool)\b|(?:piscines?|pools?|piscinas?|piscine|zwembaden|pool)\s*[23]\b)/i
    for (const locale of LOCALES) {
      it(`${locale}: Pool copy never promises 2 or 3 pools`, () => {
        const data = loadLocale(locale)
        const violations: string[] = []
        for (const root of POOL_ROOTS) {
          const value = getNested(data, root)
          walkStrings(value, root, (val, path) => {
            if (MULTI_POOL.test(val) && !/wellness|complete|1pool1spa/i.test(path)) violations.push(`${path}: ${val}`)
          })
        }
        expect(violations, violations.join('\\n')).toHaveLength(0)
      })

      it(`${locale}: Pool is explicitly sold for exactly one pool`, () => {
        const data = loadLocale(locale)
        const expected = ONE_POOL_COPY[locale]
        expect(getNested(data, 'plans.premium.features.3pools')).toBe(expected)
        expect(getNested(data, 'plans.oasis.features.3pools')).toBe(expected)
        expect(getNested(data, 'plans.premiumFeatures.0')).toBe(expected)
        expect(getNested(data, 'legal.cgu.article6Item2')).toContain(expected)
      })
    }
  })

  describe('CGV prices match the canonical commercial matrix', () => {
    const CGV_PRICES: Record<(typeof LOCALES)[number], string[]> = {
      fr: ['6,99 €', '19,99 €', '34,99 €', '64,99 €', '4,99 €', '13,99 €', '24,99 €', '44,99 €', '10,99 €', '29,99 €', '54,99 €', '99,99 €'],
      en: ['€6.99', '€19.99', '€34.99', '€64.99', '€4.99', '€13.99', '€24.99', '€44.99', '€10.99', '€29.99', '€54.99', '€99.99'],
      es: ['6,99 €', '19,99 €', '34,99 €', '64,99 €', '4,99 €', '13,99 €', '24,99 €', '44,99 €', '10,99 €', '29,99 €', '54,99 €', '99,99 €'],
      de: ['6,99 €', '19,99 €', '34,99 €', '64,99 €', '4,99 €', '13,99 €', '24,99 €', '44,99 €', '10,99 €', '29,99 €', '54,99 €', '99,99 €'],
      it: ['6,99 €', '19,99 €', '34,99 €', '64,99 €', '4,99 €', '13,99 €', '24,99 €', '44,99 €', '10,99 €', '29,99 €', '54,99 €', '99,99 €'],
      pt: ['6,99 €', '19,99 €', '34,99 €', '64,99 €', '4,99 €', '13,99 €', '24,99 €', '44,99 €', '10,99 €', '29,99 €', '54,99 €', '99,99 €'],
      nl: ['6,99 €', '19,99 €', '34,99 €', '64,99 €', '4,99 €', '13,99 €', '24,99 €', '44,99 €', '10,99 €', '29,99 €', '54,99 €', '99,99 €'],
    }

    for (const locale of LOCALES) {
      it(`${locale}: CGV lists every canonical price`, () => {
        const cgv = JSON.stringify(getNested(loadLocale(locale), 'legal.cgv') ?? {})
        for (const price of CGV_PRICES[locale]) {
          expect(cgv, `${locale} CGV is missing ${price}`).toContain(price)
        }
      })
    }
  })

  describe('Commercial copy has no invalid currency or empty keys', () => {
    // Retired technical placeholders and optional hero-title fragments are intentionally
    // empty. They are not rendered as commercial offers; any other empty value fails.
    const EMPTY_EXCEPTIONS = new Set([
      'plans.week', 'plans.perWeek', 'plans.emergencyPass', 'plans.trialEndingDays',
      'plans.trialNoCharge', 'spaPage.planYearly', 'landing.heroTitleSuffix',
      'landing.heroTitleLine2',
    ])
    for (const locale of LOCALES) {
      it(`${locale}: no double euro and no unexpected empty commercial strings`, () => {
        const data = loadLocale(locale)
        const violations: string[] = []
        for (const { value: val, path } of collectStrings(data, COMMERCIAL_ROOTS)) {
          if (val.includes('€€')) violations.push(`${path}: double euro`)
          if (val.includes('$$')) violations.push(`${path}: double dollar`)
          if (locale !== 'en' && /€\s*\/\s*month/i.test(val)) violations.push(`${path}: English monthly currency copy`)
          if (val === '' && !EMPTY_EXCEPTIONS.has(path)) violations.push(`${path}: empty`)
        }
        expect(violations, violations.join('\\n')).toHaveLength(0)
      })
    }
  })


})
