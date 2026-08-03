/**
 * ARQWELIA Lot 2 — A2 AR POC — flag OFF config (port 3103).
 *
 * Starts the dev server with BOTH AR POC flags false:
 *   ARQWELIA_AR_POC_ENABLED=false        (server authority flag, runtime)
 *   NEXT_PUBLIC_ARQWELIA_AR_POC_ENABLED=false (build-time client flag)
 *
 * With the server flag false the /arqwelia/lab/ar-poc page (a Server
 * Component) renders a clearly disabled state with ZERO viewer. Because
 * NEXT_PUBLIC_* is inlined at compile time this must be a separate server from
 * the flag-ON one (playwright.ar-poc.config.ts). Only
 * tests/e2e/arqwelia-ar-poc-off.spec.ts runs.
 *
 * Run:
 *   bunx playwright test --config playwright.ar-poc-off.config.ts
 */
import { defineConfig, devices } from '@playwright/test'

const PORT = 3103
const BASE = `http://localhost:${PORT}`

const TEST_DB = '/tmp/aqwelia-ar-poc-e2e-off.db'

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: /arqwelia-ar-poc-off\.spec\.ts$/,
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
      'ARQWELIA_AR_POC_ENABLED=false ' +
      'NEXT_PUBLIC_ARQWELIA_AR_POC_ENABLED=false ' +
      'node node_modules/.bin/next dev -p ' + PORT,
    url: BASE + '/arqwelia/lab/ar-poc',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    cwd: process.cwd(),
    env: {
      DATABASE_URL: 'file:' + TEST_DB,
      NEXTAUTH_SECRET: 'e2e-secret-only',
      NEXTAUTH_URL: BASE,
      ARQWELIA_AR_POC_ENABLED: 'false',
      NEXT_PUBLIC_ARQWELIA_AR_POC_ENABLED: 'false',
    },
  },
})
