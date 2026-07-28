/**
 * ARQWELIA teaser gate — flag OFF variant.
 *
 * Starts the dev server WITHOUT NEXT_PUBLIC_ARQWELIA_LOT1_ENABLED so the
 * ArqweliaDashboardTeaser returns null and renders zero DOM nodes. This is
 * the only way to test the flag-OFF path because NEXT_PUBLIC_* is inlined
 * at compile time.
 *
 * Run:
 *   bunx playwright test --config playwright.off.config.ts
 */
import { defineConfig, devices } from '@playwright/test'

const PORT = 3099
const BASE = `http://localhost:${PORT}`
const TEST_DB = '/tmp/aqwelia-arq-e2e-off.db'

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: /arqwelia-teaser-gate\.spec\.ts$/,
  fullyParallel: false,
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
  ],
  webServer: {
    command: 'rm -rf .next ' + TEST_DB + ' && touch ' + TEST_DB + ' && ' +
      'DATABASE_URL="file:' + TEST_DB + '" bunx prisma db push 2>&1 | tail -1 && ' +
      'bunx prisma generate --schema prisma/postgresql/schema.prisma 2>&1 | tail -1 && ' +
      'node tests/fixtures/weather-server.mjs & DATABASE_URL="file:' + TEST_DB + '" ' +
      'NEXTAUTH_SECRET=e2e-secret-only ' +
      'NEXTAUTH_URL=' + BASE + ' ' +
      'DEMO_ACCOUNT_ENABLED=true ' +
      'DEMO_ACCOUNT_EMAIL=demo@e2e.dev ' +
      'DEMO_ACCOUNT_PASSWORD=demo-e2e-password-2026! ' +
      'node node_modules/.bin/next dev -p ' + PORT,
    url: BASE + '/arqwelia',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    cwd: process.cwd(),
    env: {
      DATABASE_URL: 'file:' + TEST_DB,
      NEXTAUTH_SECRET: 'e2e-secret-only',
      NEXTAUTH_URL: BASE,
      DEMO_ACCOUNT_ENABLED: 'true',
      DEMO_ACCOUNT_EMAIL: 'demo@e2e.dev',
      DEMO_ACCOUNT_PASSWORD: 'demo-e2e-password-2026!',
      NEXT_PUBLIC_ARQWELIA_LOT1_ENABLED: 'false',
    },
  },
})
