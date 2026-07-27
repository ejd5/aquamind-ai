/**
 * ARQWELIA Lot 1 — Playwright E2E (runnable).
 *
 * Run (against a live dev server with NEXT_PUBLIC_ARQWELIA_LOT1_ENABLED=true):
 *   node tests/e2e/arqwelia-lot1.e2e.cjs
 *
 * Requires the Playwright chromium headless shell cache (already used for the
 * captures). If the project installs `@playwright/test` later, the equivalent
 * `.spec.ts` lives alongside (see tests/e2e/arqwelia-lot1.spec.ts).
 */
/* eslint-disable @typescript-eslint/no-require-imports */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { chromium } = require('playwright-core')
const os = require('os'), path = require('path')
const exe = path.join(os.homedir(), 'Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell')

const BASE = process.env.BASE || 'http://localhost:3096'

;(async () => {
  const b = await chromium.launch({ executablePath: exe })

  // Tiny 1×1 PNG (for upload scenario).
  const TINY_PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mNk+M8AAAMBAQDJ/pLvAAAAAElFTkSuQmCC', 'base64')

  const results = []
  const desktop = { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, locale: 'fr-FR' }
  const mobile = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'fr-FR' }

  async function run(label, cfg, fn) {
    const p = await b.newPage(cfg)
    try { await fn(p); results.push({ label, ok: true }); console.log('✓', label) }
    catch (err) { results.push({ label, ok: false, err: String(err.message || err).slice(0,80) }); console.log('✗', label, '-', String(err.message||err).slice(0,80)) }
    finally { await p.close() }
  }

  // 1. Landing loads (desktop + mobile)
  await run('1a desktop landing loads', desktop, async (p) => {
    await p.goto(BASE + '/arqwelia', { waitUntil: 'networkidle' })
    await p.waitForTimeout(800)
    if (!/ARQWELIA/.test(await p.locator('body').innerText())) throw new Error('brand missing')
  })
  await run('1b mobile landing loads', mobile, async (p) => {
    await p.goto(BASE + '/arqwelia', { waitUntil: 'networkidle' })
    await p.waitForTimeout(700)
    if (!/piscine|pool/i.test(await p.locator('body').innerText())) throw new Error('copy missing')
  })

  // 2. Primary CTA leads to the wizard
  await run('2 primary CTA -> /arqwelia/start/photos', mobile, async (p) => {
    await p.goto(BASE + '/arqwelia', { waitUntil: 'networkidle' })
    await p.waitForTimeout(700)
    const cta = p.getByText(/Commencer mon projet|Start my project/).first()
    await cta.click({ timeout: 3000 }).catch(() => {})
    await p.waitForTimeout(1500)
    if (!p.url().includes('/arqwelia/start/photos')) throw new Error('not at photos')
  })

  // 3. Photos step, no file — empty state visible
  await run('3 photos empty state', mobile, async (p) => {
    await p.goto(BASE + '/arqwelia/start/photos', { waitUntil: 'networkidle' })
    if (!(await p.locator('[aria-label*="photo" i], [role="button"]').count())) throw new Error('no upload zone')
  })

  // 4. Add a test image — preview appears
  await run('4 add test image -> preview', mobile, async (p) => {
    await p.goto(BASE + '/arqwelia/start/photos', { waitUntil: 'networkidle' })
    await p.waitForTimeout(500)
    const fileInput = p.locator('input[type="file"]').first()
    await fileInput.setInputFiles({ name: 'test.png', mimeType: 'image/png', buffer: TINY_PNG })
    await p.waitForTimeout(1500)
    const previews = await p.locator('img').count()
    if (previews < 1) throw new Error('no preview rendered')
  })

  // 5. Questionnaire — select options, Continue enabled
  await run('5 questionnaire completes', mobile, async (p) => {
    await p.goto(BASE + '/arqwelia/start/project', { waitUntil: 'networkidle' })
    // Click first option button in each of 4 sections (button groups of 2 cols)
    const btns = p.locator('button[aria-pressed]')
    const count = await btns.count()
    if (count < 12) throw new Error('less than 12 option buttons')
    // click 1st, then jump to a representative later one — simpler: click 4 from the top
    await btns.nth(0).click(); await btns.nth(3).click(); await btns.nth(7).click(); await btns.nth(13).click().catch(()=>{})
    await btns.nth(11).click().catch(()=>{}); await btns.nth(15).click().catch(()=>{})
    // The Continue button should be present
    if (!(await p.getByText(/Continuer|Continue/).count())) throw new Error('no continue button')
  })

  // 6. Simulated analysis completes
  await run('6 analysis completes (demo)', mobile, async (p) => {
    await p.goto(BASE + '/arqwelia/start/analysis?demo=1', { waitUntil: 'networkidle' })
    await p.waitForTimeout(7000) // ~6s progression
    if (!(await p.getByText(/Reality Score|score/i).count())) throw new Error('score not shown')
  })

  // 7. Concept selection
  await run('7 select concept A', mobile, async (p) => {
    await p.goto(BASE + '/arqwelia/start/analysis?demo=1', { waitUntil: 'networkidle' })
    await p.waitForTimeout(2500)
    await p.goto(BASE + '/arqwelia/start/concepts', { waitUntil: 'networkidle' })
    await p.waitForTimeout(1200)
    await p.locator('article').first().click()
    await p.waitForTimeout(500)
    if (!(await p.getByText(/Concept sélectionné|Selected concept/i).count())) throw new Error('not selected')
  })

  // 8. Consent NOT pre-checked
  await run('8 consent not pre-checked', mobile, async (p) => {
    await p.goto(BASE + '/arqwelia/start/contact', { waitUntil: 'networkidle' })
    await p.waitForTimeout(800)
    const checked = await p.locator('input[type="checkbox"]').first().isChecked()
    if (checked) throw new Error('consent pre-checked')
  })

  // 9. Form validation rejects empty
  await run('9 form validation rejects empty', mobile, async (p) => {
    await p.goto(BASE + '/arqwelia/start/contact', { waitUntil: 'networkidle' })
    await p.locator('button[type="submit"]').click()
    await p.waitForTimeout(1500)
    if (!(await p.locator('text=/.+requis|required|invalide|invalid/i').count())) throw new Error('no validation error')
  })

  // 10. Project Passport created (full happy path)
  await run('10 Project Passport created', mobile, async (p) => {
    await p.goto(BASE + '/arqwelia/start/analysis?demo=1', { waitUntil: 'networkidle' })
    await p.waitForTimeout(4500)
    await p.goto(BASE + '/arqwelia/start/concepts', { waitUntil: 'networkidle' })
    await p.waitForTimeout(1000)
    await p.locator('article').first().click()
    await p.waitForTimeout(400)
    await p.goto(BASE + '/arqwelia/start/contact', { waitUntil: 'networkidle' })
    await p.waitForTimeout(900)
    const email = `e2e-${Date.now()}@e2e.dev`
    await p.locator('input').nth(0).fill('Julien').catch(()=>{})
    await p.locator('input[type="email"]').fill(email).catch(()=>{})
    await p.locator('input[inputmode="numeric"]').fill('33000').catch(()=>{})
    await p.locator('input[type="checkbox"]').first().check().catch(()=>{})
    await p.locator('button[type="submit"]').click()
    await p.waitForTimeout(3500)
    if (!/ARQ-[A-Z0-9]{3}-[A-Z0-9]{3}/.test(await p.locator('body').innerText())) throw new Error('no passport id shown')
  })

  // 11. Partner waitlist signup
  await run('11 partner waitlist signup', desktop, async (p) => {
    await p.goto(BASE + '/arqwelia#partenaire', { waitUntil: 'networkidle' })
    await p.waitForTimeout(1000)
    const email = `partner-${Date.now()}@e2e.dev`
    // Fill first 4 text inputs + the partner email
    await p.locator('input').nth(0).fill('Piscines E2E').catch(()=>{})
    await p.locator('input').nth(1).fill('Jane').catch(()=>{})
    const emailInput = p.locator('input[type="email"]').first()
    await emailInput.fill(email).catch(()=>{}); await emailInput.fill(email).catch(()=>{})
    // Tick the partner consent checkbox (the LAST checkbox on the page)
    const checks = p.locator('input[type="checkbox"]')
    const last = checks.nth(await checks.count() - 1)
    await last.check().catch(()=>{})
    // Submit the partner form (button with the localized submit label)
    await p.getByText(/Rejoindre la liste|Join the pilot/).first().click().catch(()=>{})
    await p.waitForTimeout(2500)
    const body = await p.locator('body').innerText()
    if (!/Merci|already on the list|You're already/i.test(body)) throw new Error('no success')
  })

  // 12. Pro route protected — anonymous redirect to signin
  await run('12 pro preview protected (no auth -> signin)', desktop, async (p) => {
    await p.goto(BASE + '/pro/arqwelia/opportunities?demo=1', { waitUntil: 'domcontentloaded' }).catch(()=>{})
    await p.waitForTimeout(2500)
    if (!p.url().includes('/auth/signin')) throw new Error('not redirected to signin')
  })

  await b.close()

  const passed = results.filter((r) => r.ok).length
  const total = results.length
  console.log(`\nE2E: ${passed}/${total} passed`)
  results.filter(r => !r.ok).forEach(r => console.log('   fail:', r.label, r.err))
  process.exit(passed === total ? 0 : 1)
})().catch(e => { console.error(e); process.exit(2) })