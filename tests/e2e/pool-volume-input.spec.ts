/**
 * AQWELIA PR #94 — real Chromium reproduction of the "volume input not editable"
 * bug in the PoolProfile editor, using mocked APIs (NO production data touched).
 *
 * The editor is exercised through the REAL app flow (home → AppShell → header
 * pool pill → PoolProfileEditorDialog) with `/api/pool/profile` and
 * `/api/subscription` fulfilled from memory. Any PATCH to `/api/pool/profile`
 * is recorded so the test can assert that NO save happens before the user
 * explicitly clicks Enregistrer.
 */
import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

const FIXED_PROFILE = {
  id: 'pool-1',
  userId: 'e2e-user',
  name: 'Ma piscine',
  volume: 48,
  unit: 'm3',
  waterBodyType: 'pool',
  shape: 'rectangular',
  surfaceType: 'liner',
  treatmentType: 'chlorine',
  saltSystem: false,
  filterType: 'sand',
  pumpType: null,
  region: '43.6832,5.2034',
  sunExposure: 'medium',
  covered: false,
  usageLevel: 'medium',
  spaSeats: null,
  spaTempTarget: null,
  spaUsageFreq: null,
  spaBrand: null,
  manufacturerSaltMin: null,
  manufacturerSaltMax: null,
  manufacturerChlorineMax: null,
  confirmedFields: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

// Mocks every PoolProfile + subscription call in the browser. Returns a shared
// array that records the POST bodies of any PATCH sent to /api/pool/profile.
async function mockPoolApis(page: Page): Promise<{ patched: unknown[] }> {
  const patched: unknown[] = []
  await page.route('**/api/pool/profile**', async (route) => {
    const req = route.request()
    if (req.method() === 'PATCH') {
      patched.push(req.postDataJSON())
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ profile: FIXED_PROFILE }),
      })
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ profiles: [FIXED_PROFILE], profile: FIXED_PROFILE }),
    })
  })
  await page.route('**/api/subscription**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access: { effectiveLimits: { spaSupport: false } },
        plan: { id: 'discovery', limits: { maxPools: 1 } },
      }),
    })
  })
  return { patched }
}

// Open the real app (AppShell) and the PoolProfile editor dialog.
async function openEditor(page: Page): Promise<{ patched: unknown[] }> {
  const tracked = await mockPoolApis(page)
  // Force the remembered web view to "app" so the home page renders AppShell.
  await page.addInitScript(() => {
    try {
      localStorage.setItem('aqwelia_view', 'app')
    } catch {}
  })
  await page.goto('/')
  // Land in the AppShell (single pool → pool pill calls onEditPool directly).
  const pill = page.locator('button').filter({ hasText: 'Ma piscine' }).first()
  await expect(pill).toBeVisible({ timeout: 15_000 })
  await pill.click()
  // Editor dialog is open.
  await expect(page.locator('#edit-pool-volume')).toBeVisible({ timeout: 10_000 })
  return tracked
}

test.describe('PoolProfile editor — volume input (real Chromium)', () => {
  // The desktop AppShell header pill is the canonical editor entry point.
  // The mobile shell (Pixel 5 project) uses a different flow, so this spec is
  // desktop-only.
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'desktop AppShell editor flow only')
  })

  test('unconfirmed volume can be typed and stays visible; no PATCH before save', async ({ page }) => {
    const { patched } = await openEditor(page)
    const volume = page.locator('#edit-pool-volume')

    // Initial: volume NOT confirmed → empty + "Non renseigné" placeholder.
    await expect(volume).toHaveValue('')
    await expect(volume).toHaveAttribute('placeholder', /non renseigné/i)

    // REAL keyboard interaction: type "48" character by character.
    await volume.click()
    await page.keyboard.type('48')

    // The typed value must remain visible immediately.
    await expect(volume).toHaveValue('48')

    // Select m³ (unit also unconfirmed at first) — real Radix select flow.
    await page.locator('[data-slot="select-trigger"]').first().click()
    await page.locator('[role="option"]').filter({ hasText: /m³/ }).first().click()
    // Volume must still hold 48.
    await expect(volume).toHaveValue('48')

    // No save happened yet.
    expect(patched).toHaveLength(0)
  })

  test('volume + unit unconfirmed: keyboard entry stays while unit selection works', async ({ page }) => {
    const { patched } = await openEditor(page)
    const volume = page.locator('#edit-pool-volume')

    await volume.click()
    await page.keyboard.type('48')
    await expect(volume).toHaveValue('48')

    // Choose m³ in the unit select (real select interaction).
    await page.locator('[data-slot="select-trigger"]').first().click()
    await page.locator('[role="option"]').filter({ hasText: /m³/ }).first().click()
    await expect(volume).toHaveValue('48')
    expect(patched).toHaveLength(0)
  })

  test('name field is still editable (regression), volume arrow keys set a numeric value', async ({ page }) => {
    const { patched } = await openEditor(page)
    const name = page.locator('#edit-pool-name')
    await name.click()
    await page.keyboard.press('ControlOrMeta+A')
    await page.keyboard.type('Ma piscineX')
    await expect(name).toHaveValue('Ma piscineX')

    const volume = page.locator('#edit-pool-volume')
    await volume.click()
    await page.keyboard.press('ArrowUp')
    // ArrowUp on an empty number input (min=0.1) yields a numeric value.
    const val = await volume.inputValue()
    expect(val).not.toBe('')
    expect(Number(val)).toBeGreaterThan(0)
    // Still nothing persisted.
    expect(patched).toHaveLength(0)
  })

  test('Enregistrer volume + unit => PATCH { volume: 48, unit: "m3" } uniquement', async ({ page }) => {
    const { patched } = await openEditor(page)
    const volume = page.locator('#edit-pool-volume')

    await volume.click()
    await page.keyboard.type('48')
    await expect(volume).toHaveValue('48')

    await page.locator('[data-slot="select-trigger"]').first().click()
    await page.locator('[role="option"]').filter({ hasText: /m³/ }).first().click()
    await expect(volume).toHaveValue('48')

    // Click Enregistrer — the ONLY PATCH must carry volume + unit.
    await page.locator('button').filter({ hasText: /enregistrer|sauvegarder/i }).first().click()
    await expect(patched).toHaveLength(1)
    const body = patched[0] as Record<string, unknown>
    expect(body).toEqual({ volume: 48, unit: 'm3' })
  })

  test('Enregistrer volume seul => PATCH { volume: 48 } uniquement', async ({ page }) => {
    const { patched } = await openEditor(page)
    const volume = page.locator('#edit-pool-volume')

    await volume.click()
    await page.keyboard.type('48')
    await expect(volume).toHaveValue('48')

    await page.locator('button').filter({ hasText: /enregistrer|sauvegarder/i }).first().click()
    await expect(patched).toHaveLength(1)
    const body = patched[0] as Record<string, unknown>
    expect(body).toEqual({ volume: 48 })
  })

  test('cancel after local edits sends NO PATCH and reopening reloads the server state', async ({ page }) => {
    const { patched } = await openEditor(page)
    const volume = page.locator('#edit-pool-volume')
    await volume.click()
    await page.keyboard.type('48')
    await expect(volume).toHaveValue('48')

    // Cancel the dialog.
    await page.locator('button').filter({ hasText: 'Annuler' }).first().click()
    await expect(page.locator('#edit-pool-volume')).toBeHidden({ timeout: 10_000 })
    expect(patched).toHaveLength(0)

    // Reopen → server state reloaded (volume unconfirmed again → "Non renseigné").
    const pill = page.locator('button').filter({ hasText: 'Ma piscine' }).first()
    await pill.click()
    await expect(page.locator('#edit-pool-volume')).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('#edit-pool-volume')).toHaveValue('')
  })
})
