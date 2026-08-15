/**
 * AQWELIA PR #95 — LAUNCH BLOCKER: an empty/missing pH must never be recorded.
 *
 * Real-Chromium test of the "Analyse eau" flow (ModuleWaterTest). All APIs are
 * mocked — NO production data is touched. The submit button is now always
 * clickable; submit() itself validates the RAW pH string BEFORE conversion and
 * before any offline queueing.
 *
 *  - The visible "7.2 / 2.0 / …" numbers are PLACEHOLDERS only (inputs stay
 *    empty). They must never be submitted as measures.
 *  - Empty pH → toast "pH requis" + ZERO POST + nothing queued.
 *  - A real "7.2" → POST body carries ph: 7.2; optional empty fields are NOT
 *    converted to their placeholder values.
 */
import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

async function mockApis(page: Page, patched: { bodies: unknown[] }) {
  await page.route('**/api/pool/water-test**', async (route) => {
    const req = route.request()
    if (req.method() === 'POST') {
      patched.bodies.push(req.postDataJSON())
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          test: { id: 'wt-1', ph: 7.2, status: 'ok', clearWaterIndex: 90, swimSafety: 'allowed' },
          actionPlan: null,
          scientificQuality: null,
        }),
      })
      return
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ tests: [] }) })
  })
  await page.route('**/api/pool/profile**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        profiles: [{
          id: 'pool-1', name: 'Ma piscine', volume: 48, unit: 'm3', treatmentType: 'chlorine',
          saltSystem: false, confirmedFields: JSON.stringify(['name', 'volume', 'unit', 'treatmentType']),
        }],
        profile: {
          id: 'pool-1', name: 'Ma piscine', volume: 48, unit: 'm3', treatmentType: 'chlorine',
          saltSystem: false, confirmedFields: JSON.stringify(['name', 'volume', 'unit', 'treatmentType']),
        },
      }),
    })
  })
  await page.route('**/api/subscription**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ plan: { id: 'discovery' }, access: { effectiveLimits: { spaSupport: false } } }) })
  })
}

async function openWaterTest(page: Page): Promise<{ patched: { bodies: unknown[] } }> {
  const patched = { bodies: [] as unknown[] }
  await mockApis(page, patched)
  await page.addInitScript(() => {
    try { localStorage.setItem('aqwelia_view', 'app') } catch {}
  })
  await page.goto('/')
  // Navigate to the "Analyse eau" tab in the desktop sidebar.
  await page.locator('button, a').filter({ hasText: 'Analyse eau' }).first().click()
  await expect(page.locator('#ph')).toBeVisible({ timeout: 15_000 })
  return { patched }
}

const FIELDS = [
  ['ph', '7.2'],
  ['freeChlorine', '2.0'],
  ['totalChlorine', '2.5'],
  ['combinedChlorine', '0.2'],
  ['alkalinity', '100'],
  ['calciumHardness', '300'],
  ['cyanuricAcid', '40'],
  ['salt', '5'],
  ['phosphates', '0.05'],
  ['temperature', '26'],
] as const

test.describe('ModuleWaterTest — pH requis (PR #95)', () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'desktop module flow only')
  })

  test('les nombres affichés ne sont QUE des placeholders (inputs vides)', async ({ page }) => {
    await openWaterTest(page)
    for (const [id, ph] of FIELDS) {
      const input = page.locator(`#${id}`)
      await expect(input).toHaveValue('')
      await expect(input).toHaveAttribute('placeholder', ph)
    }
  })

  test('A. Enregistrer avec pH vide => toast « pH requis » + ZERO POST', async ({ page }) => {
    const { patched } = await openWaterTest(page)
    await page.locator('button').filter({ hasText: /Enregistrer/ }).first().click()
    await expect(page.locator('text=pH requis').first()).toBeVisible({ timeout: 5000 })
    expect(patched.bodies).toHaveLength(0)
  })

  test('B. saisir 7.2 => inputValue 7.2, submit transmet ph: 7.2 (champs optionnels vides exclus)', async ({ page }) => {
    const { patched } = await openWaterTest(page)
    const ph = page.locator('#ph')
    await ph.click()
    await page.keyboard.type('7.2')
    await expect(ph).toHaveValue('7.2')

    // Leave every optional field empty.
    await page.locator('button').filter({ hasText: /Enregistrer/ }).first().click()
    await expect(patched.bodies).toHaveLength(1)
    const body = patched.bodies[0] as Record<string, unknown>
    expect(body.ph).toBe(7.2)
    // Placeholder values must NEVER become measures.
    expect(body).not.toHaveProperty('freeChlorine')
    expect(body).not.toHaveProperty('totalChlorine')
    expect(body).not.toHaveProperty('alkalinity')
    expect(body).not.toHaveProperty('calciumHardness')
    expect(body).not.toHaveProperty('cyanuricAcid')
    expect(body).not.toHaveProperty('salt')
    expect(body).not.toHaveProperty('phosphates')
    expect(body).not.toHaveProperty('temperature')
  })

  test('C. champs optionnels remplis réellement => transmis en nombre', async ({ page }) => {
    const { patched } = await openWaterTest(page)
    await page.locator('#ph').click()
    await page.keyboard.type('7.2')
    await page.locator('#freeChlorine').click()
    await page.keyboard.type('2.0')
    await page.locator('#temperature').click()
    await page.keyboard.type('26')

    await page.locator('button').filter({ hasText: /Enregistrer/ }).first().click()
    await expect(patched.bodies).toHaveLength(1)
    const body = patched.bodies[0] as Record<string, unknown>
    expect(body.ph).toBe(7.2)
    expect(body.freeChlorine).toBe('2.0')
    expect(body.temperature).toBe('26')
  })

  test('D. mode offline : pH vide => aucune action mise en queue', async ({ page }) => {
    const { patched } = await openWaterTest(page)
    // Simulate offline BEFORE submitting (overrides navigator.onLine + event).
    await page.addInitScript(() => {
      Object.defineProperty(window.navigator, 'onLine', { get: () => false, configurable: true })
    })
    await page.evaluate(() => window.dispatchEvent(new Event('offline')))
    await page.waitForTimeout(300)

    await page.locator('button').filter({ hasText: /Enregistrer/ }).first().click()
    await expect(page.locator('text=pH requis').first()).toBeVisible({ timeout: 5000 })
    // No offline action was queued, no POST sent.
    expect(patched.bodies).toHaveLength(0)
    const queue = await page.evaluate(() => {
      try {
        return JSON.parse(localStorage.getItem('aqwelia-offline') || '{}')
      } catch { return {} }
    })
    const pending = (queue?.state?.pendingActions || []) as unknown[]
    const waterTests = pending.filter((a: any) => a?.path === '/api/pool/water-test')
    expect(waterTests).toHaveLength(0)
  })
})
