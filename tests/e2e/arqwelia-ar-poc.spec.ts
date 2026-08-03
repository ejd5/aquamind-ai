/**
 * ARQWELIA Lot 2 — A2 AR POC — flag ON scenario.
 *
 * Runs against playwright.ar-poc.config.ts where BOTH flags are true:
 *   ARQWELIA_AR_POC_ENABLED=true (server authority, runtime)
 *   NEXT_PUBLIC_ARQWELIA_AR_POC_ENABLED=true (client, build-time)
 *
 * This does NOT claim to exercise physical AR (no device, no WebXR session).
 * It verifies the web fallback path that is reachable in a desktop browser:
 *   - the lab page renders,
 *   - desktop AR detection reports unavailable → the 2D fallback is shown,
 *   - opening the interactive 3D view mounts <model-viewer>,
 *   - the GLB model request returns HTTP 200,
 *   - the <model-viewer> custom element is registered,
 *   - the model 'load' event fires (data-model-status="ready"),
 *   - no unexpected console errors.
 */
import { test, expect } from '@playwright/test'
import type { Page, ConsoleMessage } from '@playwright/test'

const GLB_PATH = '/models/arqwelia-pool-poc.glb'

// model-viewer / three.js emit benign headless-browser noise (WebGL software
// rendering, AR-mode availability, GPU process messages). Anything NOT matching
// this allowlist is treated as an unexpected console error.
const BENIGN_ERROR =
  /webgl|three(\.js)?|model-viewer|custom element|ar mode|webxr|scene-viewer|quick-look|swiftshader|gpu process|media stream|could not be loaded|activate ar|poster|context could not be created/i

function collectErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`))
  page.on('console', (msg: ConsoleMessage) => {
    if (msg.type() === 'error') errors.push(`console: ${msg.text()}`)
  })
  return errors
}

test.describe('ARQWELIA AR POC — flag ON (both flags true)', () => {
  test('1. lab page reachable and renders the ARQWELIA POC heading', async ({ page }) => {
    await page.goto('/arqwelia/lab/ar-poc')
    await expect(
      page.getByRole('heading', { name: /réalité augmentée|augmented reality/i }).first(),
    ).toBeVisible({ timeout: 20_000 })
  })

  test('2. desktop: AR-unavailable fallback offers the interactive 3D view (no viewer yet)', async ({ page }) => {
    await page.goto('/arqwelia/lab/ar-poc')
    await expect(page.getByRole('button', { name: /vue 3d|3d view/i })).toBeVisible({ timeout: 20_000 })
    await expect(page.locator('model-viewer')).toHaveCount(0)
  })

  test('3. open 3D view → model-viewer + GLB 200 + custom element registered + load/ready state, no unexpected console errors', async ({ page }) => {
    const errors = collectErrors(page)
    const glbResponses: number[] = []
    page.on('response', (res) => {
      if (res.url().endsWith(GLB_PATH)) glbResponses.push(res.status())
    })

    await page.goto('/arqwelia/lab/ar-poc')

    const open3d = page.getByRole('button', { name: /vue 3d|3d view/i })
    await expect(open3d).toBeVisible({ timeout: 20_000 })
    await open3d.click()

    // The custom element is registered once the runtime import succeeded.
    await expect
      .poll(
        () =>
          page.evaluate(() =>
            Boolean(window.customElements && window.customElements.get('model-viewer')),
          ),
        { timeout: 30_000 },
      )
      .toBe(true)

    // <model-viewer> is present.
    const viewer = page.locator('model-viewer')
    await expect(viewer).toHaveCount(1, { timeout: 20_000 })

    // The GLB model was fetched and returned HTTP 200.
    await expect
      .poll(() => glbResponses, { timeout: 30_000 })
      .toContain(200)

    // A 'load'/ready state is reached (model-viewer dispatched 'load').
    await expect(
      page.locator('[data-arqwelia-ar-poc][data-model-status="ready"]'),
    ).toHaveCount(1, { timeout: 30_000 })

    // No unexpected console errors (allowlist covers benign WebGL/AR noise).
    const unexpected = errors.filter((e) => !BENIGN_ERROR.test(e))
    expect(unexpected).toEqual([])
  })
})
