import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: { '@': new URL('./src', import.meta.url).pathname },
  },
  test: {
    testTimeout: 30000,
    fileParallelism: false,
  },
})
