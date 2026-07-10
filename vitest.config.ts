import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // 30s timeout — dev server compiles pages on first request (slow in sandbox)
    testTimeout: 30000,
    // Run tests sequentially (parallel requests overload the dev server)
    fileParallelism: false,
  },
})
