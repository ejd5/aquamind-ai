import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    include: ['tests/postgresql.test.mjs', 'tests/aqwelia-launch-offers-postgresql.test.mjs'],
    testTimeout: 60000,
    fileParallelism: false,
  },
})
