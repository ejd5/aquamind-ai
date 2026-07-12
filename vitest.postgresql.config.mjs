import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/postgresql.test.mjs'],
    testTimeout: 30000,
    fileParallelism: false,
  },
})
