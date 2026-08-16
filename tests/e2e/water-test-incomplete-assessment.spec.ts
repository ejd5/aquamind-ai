/**
 * AQWELIA PR #96 — REAL Chromium: a pH-only submission must never read as
 * "Votre eau est globalement équilibrée (indice 100/100)" / "Équilibrée".
 *
 * The scenario mirrors the production smoke-test EXACTLY (pH 7.2, every other
 * input empty). APIs are mocked — NO production data is touched. The mocked
 * water-test response embeds the REAL scientific engine's output (pre-generated
 * fixtures from `generateScientificallyQualifiedActionPlan` for the pH-only and
 * complete tests), so the UI renders the actual partial assessment.
 */
import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

// Fixtures generated from the real scientific engine (see
// tests/water-test-incomplete-assessment.test.ts for the engine-level proof).
const PH_ONLY_PLAN = {
  diagnosis: "pH dans la plage cible. Données insuffisantes pour évaluer l'équilibre global de l'eau. Baignade : à confirmer après mesures.",
  diagnosisKey: 'diagPartial',
  diagnosisParams: { swim: 'swimLabelUnknown' },
  severity: 'insufficient',
  swimSafety: 'unknown',
  immediateActions: [
    { order: 1, action: 'pH correct', actionKey: 'iaPhOk', detail: 'pH 7.2 dans la plage idéale. Ne pas toucher.', detailKey: 'iaPhOkDetail', detailParams: { ph: 7.2 } },
    { order: 2, action: 'Maintenir la filtration', actionKey: 'iaMaintainFiltration', detail: "Filtration prudente : la durée dépend de la température de l'eau. Relevez la température pour une recommandation précise.", detailKey: 'iaMaintainFiltrationNoTemp' },
    { order: 3, action: "Re-tester l'eau", actionKey: 'iaRetest', detail: 'Refaire un test dans 24-48h.', detailKey: 'iaRetestDefault' },
  ],
  chemicalDosages: [],
  scientificQuality: { level: 'insufficient' },
  filtrationHours: 0,
  retestInHours: 24,
  doNotDo: [],
  doNotDoKeys: [],
  estimatedCost: '—',
  whenToCallProfessional: null,
}

const COMPLETE_PLAN = {
  diagnosis: "Votre eau est globalement équilibrée (indice 100/100). Maintenez le rythme de tests et de filtration. Baignade : autorisée.",
  diagnosisKey: 'diagBalanced',
  diagnosisParams: { cwi: 100, swim: 'swimLabelAllowed' },
  severity: 'low',
  swimSafety: 'allowed',
  immediateActions: [],
  chemicalDosages: [],
  scientificQuality: { level: 'high' },
  filtrationHours: 0,
  retestInHours: 24,
  doNotDo: [],
  doNotDoKeys: [],
  estimatedCost: '—',
  whenToCallProfessional: null,
}

async function mockApis(page: Page, patched: { bodies: unknown[] }) {
  await page.route('**/api/pool/water-test**', async (route) => {
    const req = route.request()
    if (req.method() === 'POST') {
      const body = req.postDataJSON()
      patched.bodies.push(body)
      // pH-only (all optional empty) → partial fixture; complete → balanced.
      const isComplete =
        body.freeChlorine != null && body.alkalinity != null && body.temperature != null
      const plan = isComplete ? COMPLETE_PLAN : PH_ONLY_PLAN
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          test: {
            id: 'wt-1', ph: Number(body.ph), status: 'ok', clearWaterIndex: isComplete ? 100 : 100,
            swimSafety: plan.swimSafety,
            scientificQualityScore: isComplete ? 0.95 : 0.25,
            scientificLimitations: JSON.stringify([]),
            createdAt: new Date().toISOString(),
          },
          actionPlan: plan,
          scientificQuality: plan.scientificQuality,
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
  await page.locator('button, a').filter({ hasText: 'Analyse eau' }).first().click()
  await expect(page.locator('#ph')).toBeVisible({ timeout: 15_000 })
  return { patched }
}

test.describe('PR #96 — pH-only must not read as "eau équilibrée 100/100"', () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'desktop module flow only')
  })

  test('pH-only 7.2 => "Analyse partielle", pas "globalement équilibrée", pas 100/100, baignade à confirmer', async ({ page }) => {
    const { patched } = await openWaterTest(page)

    // Enter ONLY the pH, leave everything else empty.
    await page.locator('#ph').click()
    await page.keyboard.type('7.2')
    await expect(page.locator('#ph')).toHaveValue('7.2')

    await page.locator('button').filter({ hasText: /Enregistrer/ }).first().click()
    await expect(patched.bodies).toHaveLength(1)

    // The generated plan card is present.
    const planCard = page.locator("text=Plan d'action généré").first()
    await expect(planCard).toBeVisible({ timeout: 10_000 })

    // NOT "globalement équilibrée" (fr.json uses both accented and ASCII forms).
    await expect(page.locator('body')).not.toContainText(/globalement (équilibrée|equilibree)/)
    // Partial wording present.
    await expect(page.locator('body')).toContainText("Données insuffisantes pour évaluer l'équilibre global")
    // Severity badge reads "Analyse partielle" (not "Équilibrée").
    await expect(page.locator('text=Analyse partielle').first()).toBeVisible()
    // No global 100/100 score presented.
    await expect(page.locator('text=100/100')).toHaveCount(0)
    // Swim stays "à confirmer".
    await expect(page.locator('text=Baignade à confirmer').first()).toBeVisible()
    // Filtration does not pretend to derive from temperature.
    await expect(page.locator('body')).toContainText('Filtration prudente')
    // No invented chemical dosage.
    await expect(page.locator('text=kg').first()).toHaveCount(0)
  })

  test('cas complet équilibré => conclusion équilibrée conservée', async ({ page }) => {
    const { patched } = await openWaterTest(page)
    // Fill every field (complete assessment).
    const values: [string, string][] = [
      ['ph', '7.2'], ['freeChlorine', '2.0'], ['totalChlorine', '2.2'], ['combinedChlorine', '0.2'],
      ['alkalinity', '100'], ['calciumHardness', '300'], ['cyanuricAcid', '40'],
      ['phosphates', '0.05'], ['temperature', '26'],
    ]
    for (const [id, val] of values) {
      await page.locator(`#${id}`).click()
      await page.keyboard.type(val)
    }
    await page.locator('button').filter({ hasText: /Enregistrer/ }).first().click()
    await expect(patched.bodies).toHaveLength(1)

    // Complete test → the balanced conclusion remains available.
    await expect(page.locator("text=Plan d'action généré").first()).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('body')).toContainText(/globalement (équilibrée|equilibree)/)
  })
})
