/**
 * ARQWELIA AR POC — production build validation config.
 *
 * Runs the AR POC e2e spec against a LOCAL PRODUCTION BUILD (`next start`)
 * on a dedicated port, with both feature flags active. This proves the
 * model-viewer load / error / retry flow works with the optimized production
 * runtime, not only under `next dev`.
 *
 * Prerequisite: build first with
 *   DATABASE_URL=file:/tmp/aqwelia-ar-poc.db \
 *   ARQWELIA_AR_POC_ENABLED=true NEXT_PUBLIC_ARQWELIA_AR_POC_ENABLED=true \
 *   bun run build
 */
import { defineConfig, devices } from '@playwright/test'

const PORT = 3104
const BASE = `http://localhost:${PORT}`
const TEST_DB = '/tmp/aqwelia-ar-poc.db'

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: /arqwelia-ar-poc\.spec\.ts$/,
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  timeout: 60_000,
  expect: { timeout: 15_000 },
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
    command: [
      `DATABASE_URL="file:${TEST_DB}"`,
      'ARQWELIA_AR_POC_ENABLED=true',
      'NEXT_PUBLIC_ARQWELIA_AR_POC_ENABLED=true',
      'NEXTAUTH_SECRET=e2e-secret-only',
      `NEXTAUTH_URL=${BASE}`,
      'node .next/standalone/server.js',
    ].join(' '),
    url: BASE + '/arqwelia/lab/ar-poc',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    cwd: process.cwd(),
    env: {
      DATABASE_URL: `file:${TEST_DB}`,
      ARQWELIA_AR_POC_ENABLED: 'true',
      NEXT_PUBLIC_ARQWELIA_AR_POC_ENABLED: 'true',
      NEXTAUTH_SECRET: 'e2e-secret-only',
      NEXTAUTH_URL: BASE,
      PORT: String(PORT),
      HOSTNAME: '0.0.0.0',
    },
  },
})
