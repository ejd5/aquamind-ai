/**
 * ARQWELIA Lot 1 — portable E2E spec (Playwright standard).
 *
 * Runs against the dev server launched by webServer in playwright.config.ts
 * with NEXT_PUBLIC_ARQWELIA_LOT1_ENABLED=true + demo mode on. No absolute
 * Chromium path — browsers installed via `npx playwright install chromium`.
 *
 * Coverage (17 scenarios, desktop + mobile projects):
 *  1. landing loads
 *  2. landing mobile loads
 *  3. primary CTA -> photos
 *  4. photos empty state
 *  5. add a test image -> preview
 *  6. questionnaire completes (Continue present)
 *  7. simulated analysis completes
 *  8. concept selected
 *  9. consent NOT pre-checked
 * 10. empty form rejected
 * 11. Project Passport created (full happy path)
 * 12. partner waitlist signup
 * 13. Pro route protected -> signin redirect (anonymous)
 * 14. FR + flag ON — teaser visible in consumer dashboard
 * 15. EN + flag ON — teaser visible in consumer dashboard
 * 16. ES locale — no teaser in dashboard (unsupported locale)
 * 17. dashboard teaser CTA navigates to /arqwelia
 */
import { test, expect } from '@playwright/test'
import type { Page, BrowserContext } from '@playwright/test'

// 1×1 transparent PNG for the upload scenario.
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mNk+M8AAAMBAQDJ/pLvAAAAAElFTkSuQmCC',
  'base64'
)

const I18N = (locale: 'fr' | 'en') => ({
  startMyProject: locale === 'fr' ? 'Commencer mon projet' : 'Start my project',
  seeTheDemo: locale === 'fr' ? 'Voir la démonstration' : 'See the demo',
  continue: locale === 'fr' ? 'Continuer' : 'Continue',
  realityScore: locale === 'fr' ? 'Reality Score' : 'Reality Score',
  conceptAlabel: 'Concept A',
  selectedConcept: locale === 'fr' ? 'Concept sélectionné' : 'Selected concept',
  joinPilot: locale === 'fr' ? 'Rejoindre la liste pilote' : 'Join the pilot list',
  passportRegex: /ARQ-[A-Z0-9]{3}-[A-Z0-9]{3}/,
  discoverArqwelia: locale === 'fr' ? 'Découvrir ARQWELIA' : 'Discover ARQWELIA',
  teaserTitle: 'ARQWELIA',
})

const T = I18N('fr')

// Helper: extract the next-auth session token from API response headers.
function extractSessionToken(res: any): string | null {
  // headersArray() returns [{name, value}, ...], or fall back to single header
  const all = typeof res.headersArray === 'function' ? res.headersArray() : []
  for (const h of all) {
    if (h.name.toLowerCase() === 'set-cookie') {
      const m = h.value.match(/next-auth\.session-token=([^;]+)/)
      if (m) return m[1]
    }
  }
  // Fallback: single header
  const single = res.headers()?.['set-cookie'] || ''
  const m = single.match(/next-auth\.session-token=([^;]+)/)
  return m ? m[1] : null
}

// Helper: login as demo user and return the session token string.
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

// Helper: dismiss the cookie consent banner if present.
async function dismissCookieBanner(page: Page) {
  const acceptBtn = page.locator('button:has-text("Accepter"), button:has-text("Tout accepter")').first()
  if (await acceptBtn.isVisible().catch(() => false)) {
    await acceptBtn.click({ force: true })
    await page.waitForTimeout(300)
  }
}

test.describe('ARQWELIA Lot 1 — demo journey (FR)', () => {
  test('1. landing loads', async ({ page }) => {
    await page.goto('/arqwelia')
    await expect(page.locator('body')).toContainText(/ARQWELIA/)
  })

  test('2. landing mobile renders the hero', async ({ page }) => {
    await page.goto('/arqwelia')
    await expect(page.locator('h1').first()).toContainText(/piscine|pool/i)
  })

  test('3. primary CTA navigates to photos wizard', async ({ page }) => {
    await page.goto('/arqwelia')
    await page.getByRole('link', { name: T.startMyProject }).first().click({ timeout: 5000 })
    await page.waitForURL('**/arqwelia/start/photos', { timeout: 10000 })
  })

  test('4. photos step — empty state visible', async ({ page }) => {
    await page.goto('/arqwelia/start/photos')
    await expect(page.locator('[role="button"][aria-label]').first()).toBeVisible()
  })

  test('5. add a test image renders a preview', async ({ page }) => {
    await page.goto('/arqwelia/start/photos')
    const input = page.locator('input[type="file"]').first()
    await input.setInputFiles({ name: 'test.png', mimeType: 'image/png', buffer: TINY_PNG })
    await expect(page.locator('img').first()).toBeVisible({ timeout: 5000 })
  })

  test('6. questionnaire — selecting all sections enables Continue', async ({ page }) => {
    await page.goto('/arqwelia/start/project')
    const options = page.locator('button[aria-pressed]')
    await options.nth(0).click()
    await options.nth(3).click()
    await options.nth(7).click()
    await options.nth(11).click()
    await expect(page.getByRole('button', { name: T.continue })).toBeVisible()
  })

  test('7. simulated analysis reaches the final state', async ({ page }) => {
    await page.goto('/arqwelia/start/analysis?demo=1')
    await expect(page.getByText(T.realityScore).first()).toBeVisible({ timeout: 15_000 })
  })

  test('8. selecting a concept highlights it', async ({ page }) => {
    await page.goto('/arqwelia/start/analysis?demo=1')
    await page.waitForTimeout(2500)
    await page.goto('/arqwelia/start/concepts')
    await page.locator('article').first().click()
    await expect(page.getByText(T.selectedConcept).first()).toBeVisible({ timeout: 5000 })
  })

  test('9. consent checkbox is NOT pre-checked', async ({ page }) => {
    await page.goto('/arqwelia/start/contact')
    const consent = page.locator('input[type="checkbox"]').first()
    await expect(consent).not.toBeChecked()
  })

  test('10. empty form is rejected with validation errors', async ({ page }) => {
    await page.goto('/arqwelia/start/contact')
    await page.locator('button[type="submit"]').click()
    await expect(page.locator('body')).toContainText(/requis|required|invalide|invalid/i, { timeout: 5000 })
  })

  test('11. full happy path creates a Project Passport', async ({ page }) => {
    test.setTimeout(60_000)
    await page.goto('/arqwelia/start/analysis?demo=1')
    await page.waitForTimeout(3000)
    await page.goto('/arqwelia/start/concepts')
    await page.waitForTimeout(1000)
    await page.locator('article').first().click()
    await page.waitForTimeout(500)
    await page.goto('/arqwelia/start/contact')
    const email = `e2e-${Date.now()}@e2e.dev`
    await page.locator('input').nth(0).fill('Julien')
    const emailInput = page.locator('input[type="email"]').first()
    await emailInput.fill(email)
    await page.locator('input[inputmode="numeric"]').first().fill('33000')
    await page.locator('input[type="checkbox"]').first().check()
    await page.locator('button[type="submit"]').click()
    await expect(page).toHaveURL(/\/arqwelia\/start\/success/, { timeout: 15_000 })
    await expect(page.locator('body')).toContainText(T.passportRegex, { timeout: 10_000 })
  })

  test('12. partner waitlist - join from the landing', async ({ page }) => {
    await page.goto('/arqwelia#partenaire')
    const email = `partner-${Date.now()}@e2e.dev`
    await page.locator('input').nth(0).fill('Piscines E2E')
    await page.locator('input').nth(1).fill('Jane')
    const emailInput = page.locator('input[type="email"]').first()
    await emailInput.fill(email)
    const checkboxes = page.locator('input[type="checkbox"]')
    await checkboxes.nth(await checkboxes.count() - 1).check()
    await page.getByRole('button', { name: T.joinPilot }).first().click()
    await expect(page.locator('body')).toContainText(/Merci|on the list|already/i, { timeout: 10_000 })
  })

  test('13. Pro route protected - anonymous redirect to signin', async ({ page }) => {
    await page.goto('/pro/arqwelia/opportunities?demo=1')
    await page.waitForURL(/\/auth\/signin/, { timeout: 10_000 })
  })

  test('14. FR + flag ON — teaser visible in dashboard', async ({ page, context, request: api }) => {
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

    // Dashboard title visible
    await expect(page.getByText('Aujourd').first()).toBeVisible({ timeout: 10_000 })

    // Teaser title "ARQWELIA" visible
    await expect(page.getByRole('heading', { name: T.teaserTitle }).first()).toBeVisible({ timeout: 10_000 })
    // CTA "Découvrir ARQWELIA" visible
    await expect(page.getByRole('link', { name: T.discoverArqwelia }).first()).toBeVisible({ timeout: 5_000 })
    // CTA link points to /arqwelia
    await expect(page.getByRole('link', { name: T.discoverArqwelia }).first()).toHaveAttribute('href', '/arqwelia')
  })

  test('15. EN + flag ON — teaser visible in dashboard', async ({ browser, request: api }) => {
    test.setTimeout(60_000)
    const token = await loginAsDemoAndGetToken(api)
    expect(token).toBeTruthy()

    const enCtx: BrowserContext = await browser.newContext({ locale: 'en-US' })
    await enCtx.addCookies([
      {
        name: 'next-auth.session-token', value: token!,
        domain: 'localhost', path: '/', httpOnly: true, sameSite: 'Lax' as const,
      },
      {
        name: 'NEXT_LOCALE', value: 'en',
        domain: 'localhost', path: '/', httpOnly: false, sameSite: 'Lax' as const,
      },
    ])
    const enPage: Page = await enCtx.newPage()

    // Set localStorage so the page switches to the app view on load
    await enPage.addInitScript(() => {
      localStorage.setItem('aqwelia_view', 'app')
    })

    await enPage.goto('/')
    await enPage.waitForLoadState('networkidle')
    await enPage.waitForTimeout(3000)

    // Teaser title "ARQWELIA" visible
    const T_EN = I18N('en')
    await expect(enPage.getByRole('heading', { name: T_EN.teaserTitle }).first()).toBeVisible({ timeout: 10_000 })
    // CTA "Discover ARQWELIA" visible
    await expect(enPage.getByRole('link', { name: T_EN.discoverArqwelia }).first()).toBeVisible({ timeout: 5_000 })

    await enCtx.close()
  })

  test('16. ES locale — no teaser in dashboard (unsupported)', async ({ browser, request: api }) => {
    test.setTimeout(60_000)
    const token = await loginAsDemoAndGetToken(api)
    expect(token).toBeTruthy()

    const esCtx: BrowserContext = await browser.newContext({ locale: 'es-ES' })
    await esCtx.addCookies([
      {
        name: 'next-auth.session-token', value: token!,
        domain: 'localhost', path: '/', httpOnly: true, sameSite: 'Lax' as const,
      },
      {
        name: 'NEXT_LOCALE', value: 'es',
        domain: 'localhost', path: '/', httpOnly: false, sameSite: 'Lax' as const,
      },
    ])
    const esPage: Page = await esCtx.newPage()

    // Set localStorage so the page switches to the app view on load
    await esPage.addInitScript(() => {
      localStorage.setItem('aqwelia_view', 'app')
    })

    await esPage.goto('/')
    await esPage.waitForLoadState('networkidle')
    await esPage.waitForTimeout(3000)

    // No teaser heading with "ARQWELIA" as teaser title in the dashboard
    await expect(esPage.getByRole('heading', { name: 'ARQWELIA' })).toHaveCount(0, { timeout: 5_000 })
    // No "Discover ARQWELIA" CTA link
    await expect(esPage.locator('a[href="/arqwelia"]:has-text("ARQWELIA")')).toHaveCount(0, { timeout: 5_000 })

    await esCtx.close()
  })

  test('17. dashboard teaser CTA navigates to /arqwelia', async ({ page, context, request: api }) => {
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

    // Click the teaser CTA link
    await page.getByRole('link', { name: T.discoverArqwelia }).first().click({ timeout: 10_000 })
    await page.waitForURL('**/arqwelia', { timeout: 10_000 })
    await expect(page.locator('body')).toContainText(/ARQWELIA/)
  })
})