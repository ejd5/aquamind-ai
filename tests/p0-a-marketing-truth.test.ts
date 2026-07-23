import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = process.cwd()
const locales = ['fr', 'en', 'es', 'de', 'it', 'pt', 'nl'] as const

describe('P0-A marketing truth', () => {
  it('removes unsupported Growth performance claims', () => {
    const page = readFileSync(join(ROOT, 'src/app/growth/page.tsx'), 'utf8')
    expect(page).not.toContain("value: '+38%'")
    expect(page).not.toContain("value: '< 2min'")
    expect(page).not.toContain("value: '24/7'")
    expect(page).toContain("value: '0–100'")
    expect(page).toContain("value: '100%'")
  })

  it.each(locales)('uses supervised automation copy in %s', (locale) => {
    const data = JSON.parse(readFileSync(join(ROOT, `src/i18n/locales/${locale}.json`), 'utf8'))
    const growth = JSON.stringify(data.growth).toLowerCase()
    expect(growth).not.toContain('10 agents ia')
    expect(growth).not.toContain('10 specialized ai agents')
    expect(growth).not.toContain('working 24/7')
    expect(growth).not.toContain('travaillent 24/7')
  })

  it.each(locales)('does not advertise unsupported Pro integrations in %s', (locale) => {
    const data = JSON.parse(readFileSync(join(ROOT, `src/i18n/locales/${locale}.json`), 'utf8'))
    const pro = JSON.stringify(data.pro)
    expect(pro).not.toMatch(/QuickBooks|Xero|SLA 99[,.]9|synchronisation comptable/i)
    expect(pro).not.toMatch(/tournées optimisées par géolocalisation/i)
    expect(pro).not.toMatch(/route optimization and automatic reminders/i)
  })

  it('enforces the advertised Discovery limits', () => {
    const plans = readFileSync(join(ROOT, 'src/lib/billing/plans.ts'), 'utf8')
    expect(plans).toContain('maxPhotoScansPerMonth: 2')
    expect(plans).toContain('maxTestsPerMonth: 2')
  })
})
