import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: { '@': new URL('./src', import.meta.url).pathname },
  },
  test: {
    testTimeout: 30000,
    fileParallelism: false,
    exclude: [...configDefaults.exclude, 'tests/postgresql.test.mjs', 'tests/aqwelia-launch-offers-postgresql.test.mjs', 'tests/e2e/**', '.next/**'],
  },
})
