/**
 * ARQWELIA Lot 2 — A2 AR POC — flag OFF scenario.
 *
 * Runs against playwright.ar-poc-off.config.ts where BOTH flags are false:
 *   ARQWELIA_AR_POC_ENABLED=false (server authority, runtime)
 *   NEXT_PUBLIC_ARQWELIA_AR_POC_ENABLED=false (client, build-time)
 *
 * With the server flag false the /arqwelia/lab/ar-poc page (Server Component)
 * renders a clearly disabled state with ZERO viewer. This spec asserts:
 *   - the page is reachable (HTTP 200) and shows the ARQWELIA POC heading,
 *   - no <model-viewer> element is rendered,
 *   - the "not enabled yet" disabled note is visible,
 *   - no GLB model request is made.
 */
import { test, expect } from '@playwright/test'

const GLB_PATH = '/models/arqwelia-pool-poc.glb'

test.describe('ARQWELIA AR POC — flag OFF (both flags false)', () => {
  test('1. lab page reachable (HTTP 200) and renders the ARQWELIA POC heading', async ({ page }) => {
    const res = await page.goto('/arqwelia/lab/ar-poc')
    expect(res?.status()).toBe(200)
    await expect(
      page.getByRole('heading', { name: /réalité augmentée|augmented reality/i }).first(),
    ).toBeVisible({ timeout: 20_000 })
  })

  test('2. zero model-viewer elements + disabled note visible', async ({ page }) => {
    await page.goto('/arqwelia/lab/ar-poc')
    await expect(page.locator('model-viewer')).toHaveCount(0)
    await expect(page.locator('body')).toContainText(/n'est pas encore activée|not enabled yet/i, {
      timeout: 10_000,
    })
  })

  test('3. no GLB model request is made when the POC is off', async ({ page }) => {
    const glbRequests: string[] = []
    page.on('request', (req) => {
      if (req.url().endsWith(GLB_PATH)) glbRequests.push(req.url())
    })
    await page.goto('/arqwelia/lab/ar-poc')
    await page.waitForLoadState('networkidle')
    expect(glbRequests).toEqual([])
  })
})
