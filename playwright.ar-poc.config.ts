/**
 * ARQWELIA Lot 2 — A2 AR POC — flag ON config (port 3102).
 *
 * Starts the dev server with BOTH AR POC flags true:
 *   ARQWELIA_AR_POC_ENABLED=true        (server authority flag, runtime)
 *   NEXT_PUBLIC_ARQWELIA_AR_POC_ENABLED=true (build-time client flag)
 *
 * Because NEXT_PUBLIC_* is inlined at compile time, a flag-ON build must be a
 * separate server from the flag-OFF one (playwright.ar-poc-off.config.ts). The
 * webServer replicates the lot1 pattern (throwaway SQLite DB at /tmp, prisma
 * db push + generate, next dev). Only tests/e2e/arqwelia-ar-poc.spec.ts runs.
 *
 * Run:
 *   bunx playwright install chromium        # one-time
 *   bunx playwright test --config playwright.ar-poc.config.ts
 */
import { defineConfig, devices } from '@playwright/test'

const PORT = 3102
const BASE = `http://localhost:${PORT}`

const TEST_DB = process.env.ARQ_AR_POC_E2E_DB || '/tmp/aqwelia-ar-poc-e2e.db'

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: /arqwelia-ar-poc\.spec\.ts$/,
  fullyParallel: false, // single server — avoid concurrent DB writes
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  timeout: 120_000,
  expect: { timeout: 20_000 },
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
      'ARQWELIA_AR_POC_ENABLED=true ' +
      'NEXT_PUBLIC_ARQWELIA_AR_POC_ENABLED=true ' +
      'node node_modules/.bin/next dev -p ' + PORT,
    url: BASE + '/arqwelia/lab/ar-poc',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    cwd: process.cwd(),
    env: {
      DATABASE_URL: 'file:' + TEST_DB,
      NEXTAUTH_SECRET: 'e2e-secret-only',
      NEXTAUTH_URL: BASE,
      ARQWELIA_AR_POC_ENABLED: 'true',
      NEXT_PUBLIC_ARQWELIA_AR_POC_ENABLED: 'true',
    },
  },
})
