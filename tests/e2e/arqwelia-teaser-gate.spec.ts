/**
 * ARQWELIA teaser gate — flag OFF scenario.
 *
 * Runs against playwright.off.config.ts where
 * NEXT_PUBLIC_ARQWELIA_LOT1_ENABLED is deliberately omitted (defaults to
 * false). The ArqweliaDashboardTeaser component returns null → zero DOM
 * nodes for the teaser.
 */
import { test, expect } from '@playwright/test'
import type { Page, BrowserContext } from '@playwright/test'

function extractSessionToken(res: any): string | null {
  const all = typeof res.headersArray === 'function' ? res.headersArray() : []
  for (const h of all) {
    if (h.name.toLowerCase() === 'set-cookie') {
      const m = h.value.match(/next-auth\.session-token=([^;]+)/)
      if (m) return m[1]
    }
  }
  const single = res.headers()?.['set-cookie'] || ''
  const m = single.match(/next-auth\.session-token=([^;]+)/)
  return m ? m[1] : null
}

async function loginAsDemoAndGetToken(api: any): Promise<string | null> {
  try {
    const demoRes = await api.post('/api/demo/login')
    if (!demoRes.ok()) return null
    const { email, password } = await demoRes.json()
    const csrfRes = await api.get('/api/auth/csrf')
    const { csrfToken } = await csrfRes.json()
    const loginRes = await api.post('/api/auth/callback/credentials', {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      form: { email, password, csrfToken, callbackUrl: '/', json: 'true' },
    })
    return extractSessionToken(loginRes)
  } catch { return null }
}

test.describe('ARQWELIA teaser gate — flag OFF', () => {
  test('flag OFF — no teaser in DOM', async ({ page, context, request: api }) => {
    test.setTimeout(60_000)
    const token = await loginAsDemoAndGetToken(api)
    expect(token).toBeTruthy()
    await context.addCookies([
      {
        name: 'next-auth.session-token', value: token!,
        domain: 'localhost', path: '/', httpOnly: true, sameSite: 'Lax' as const,
      },
      {
        name: 'NEXT_LOCALE', value: 'fr',
        domain: 'localhost', path: '/', httpOnly: false, sameSite: 'Lax' as const,
      },
    ])

    // Set localStorage so the page switches to the app view on load
    await page.addInitScript(() => {
      localStorage.setItem('aqwelia_view', 'app')
    })

    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(3000)

    // Dashboard renders (core dashboard is visible)
    await expect(page.getByText('Aujourd').first()).toBeVisible({ timeout: 10_000 })

    // No teaser card (glass-card with ARQWELIA heading) in the dashboard
    await expect(page.locator('.glass-card:has(h3:text("ARQWELIA"))')).toHaveCount(0, { timeout: 5_000 })
    // No CTA link to /arqwelia with "ARQWELIA" text
    await expect(page.locator('a[href="/arqwelia"]:has-text("ARQWELIA")')).toHaveCount(0, { timeout: 5_000 })
  })

  test('flag OFF — no ARQWELIA nav link in landing page header', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('button:has-text("ARQWELIA")')).toHaveCount(0, { timeout: 5_000 })
  })

  test('flag OFF — no ARQWELIA section on landing page', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('#arqwelia')).toHaveCount(0, { timeout: 5_000 })
  })

  test('flag OFF — no ARQWELIA in sidebar nav', async ({ page, context, request: api }) => {
    test.setTimeout(60_000)
    const token = await loginAsDemoAndGetToken(api)
    expect(token).toBeTruthy()
    await context.addCookies([
      {
        name: 'next-auth.session-token', value: token!,
        domain: 'localhost', path: '/', httpOnly: true, sameSite: 'Lax' as const,
      },
      {
        name: 'NEXT_LOCALE', value: 'fr',
        domain: 'localhost', path: '/', httpOnly: false, sameSite: 'Lax' as const,
      },
    ])
    await page.addInitScript(() => {
      localStorage.setItem('aqwelia_view', 'app')
    })
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(3000)
    // Dashboard renders
    await expect(page.getByText('Aujourd').first()).toBeVisible({ timeout: 10_000 })
    // No ARQWELIA button in sidebar
    await expect(page.locator('aside button:has-text("ARQWELIA")')).toHaveCount(0, { timeout: 5_000 })
  })

  test('flag OFF — no ARQWELIA in mobile Profile screen', async ({ page, context, request: api }) => {
    test.setTimeout(60_000)
    const token = await loginAsDemoAndGetToken(api)
    expect(token).toBeTruthy()
    await context.addCookies([
      {
        name: 'next-auth.session-token', value: token!,
        domain: 'localhost', path: '/', httpOnly: true, sameSite: 'Lax' as const,
      },
      {
        name: 'NEXT_LOCALE', value: 'fr',
        domain: 'localhost', path: '/', httpOnly: false, sameSite: 'Lax' as const,
      },
    ])
    await page.addInitScript(() => {
      localStorage.setItem('aqwelia_view', 'app')
    })
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(3000)
    // Check if mobile profile ARQWELIA link is absent
    await expect(page.locator('a[href="/arqwelia"]')).toHaveCount(0, { timeout: 5_000 })
  })
})
