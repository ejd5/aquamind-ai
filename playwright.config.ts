/**
 * ARQWELIA Lot 1 — portable Playwright config.
 *
 * Standard Playwright setup (no absolute Chromium paths). Browsers are
 * installed via `npx playwright install chromium` (CI does this — see
 * .github/workflows/arqwelia-e2e.yml). The dev server is started
 * automatically by the `webServer` config with the feature flag on and a
 * throwaway SQLite DB at /tmp (CI + local). desktop + mobile projects run
 * the same spec.
 *
 * Run locally:
 *   npx playwright install chromium        # one-time
 *   npx playwright test --config playwright.config.ts
 */
import { defineConfig, devices } from '@playwright/test'

const PORT = 3098
const BASE = `http://localhost:${PORT}`

const TEST_DB = process.env.ARQ_E2E_DB || '/tmp/aqwelia-arq-e2e.db'

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: /.*\.spec\.ts$/,
  fullyParallel: false, // single server — avoid concurrent DB writes
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: BASE,
    trace: 'on-first-retry',
    locale: 'fr-FR',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { ...devices['Pixel 5'], viewport: { width: 390, height: 844 } } },
  ],
  webServer: {
    command: 'rm -rf .next ' + TEST_DB + ' && touch ' + TEST_DB + ' && ' +
      'DATABASE_URL="file:' + TEST_DB + '" bunx prisma db push 2>&1 | tail -1 && ' +
      'bunx prisma generate --schema prisma/postgresql/schema.prisma 2>&1 | tail -1 && ' +
      'node tests/fixtures/weather-server.mjs & DATABASE_URL="file:' + TEST_DB + '" ' +
      'NEXTAUTH_SECRET=e2e-secret-only ' +
      'NEXTAUTH_URL=' + BASE + ' ' +
      'NEXT_PUBLIC_ARQWELIA_LOT1_ENABLED=true ' +
      'NEXT_PUBLIC_ARQWELIA_DEMO_MODE=true ' +
      'DEMO_ACCOUNT_ENABLED=true ' +
      'DEMO_ACCOUNT_EMAIL=demo@e2e.dev ' +
      'DEMO_ACCOUNT_PASSWORD=demo-e2e-password-2026! ' +
      'node node_modules/.bin/next dev -p ' + PORT,
    url: BASE + '/arqwelia',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    // CI starts fresh; locally reuse an existing server if running.
    cwd: process.cwd(),
    env: {
      DATABASE_URL: 'file:' + TEST_DB,
      NEXTAUTH_SECRET: 'e2e-secret-only',
      NEXTAUTH_URL: BASE,
      NEXT_PUBLIC_ARQWELIA_LOT1_ENABLED: 'true',
      NEXT_PUBLIC_ARQWELIA_DEMO_MODE: 'true',
      DEMO_ACCOUNT_ENABLED: 'true',
      DEMO_ACCOUNT_EMAIL: 'demo@e2e.dev',
      DEMO_ACCOUNT_PASSWORD: 'demo-e2e-password-2026!',
    },
  },
})