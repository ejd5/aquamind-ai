/**
 * AQWELIA PR #97 — lockfile contract: the Bun lockfile MUST declare the Linux
 * x64 native packages required by sharp (the Vercel linux-x64 runtime), and the
 * Next config MUST force-include the native @img packages in the standalone
 * output (the tracer otherwise drops libvips' shared object → ERR_DLOPEN_FAILED).
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()

/**
 * The standalone binary check is only authoritative AFTER `next build` produced
 * `.next/standalone`. In CI, the smoke-test phase runs BEFORE the build step, so
 * the standalone does not exist yet — this test then skips cleanly instead of
 * failing the phase. The native sharp capability is always proven separately by
 * `tests/sharp-runtime.test.ts` (it actually loads sharp and processes images).
 */
const STANDALONE_EXISTS = (() => {
  try {
    return existsSync(join(root, '.next/standalone'))
  } catch {
    return false
  }
})()

describe('PR #97 — sharp linux runtime packaging', () => {
  it('bun.lock declares the linux-x64 sharp binding + libvips packages', () => {
    const lock = readFileSync(join(root, 'bun.lock'), 'utf8')
    expect(lock).toContain('"@img/sharp-linux-x64@0.35.3"')
    expect(lock).toContain('"@img/sharp-libvips-linux-x64@1.3.2"')
  })

  it('sharp is a declared dependency of the project', () => {
    const pkg = readFileSync(join(root, 'package.json'), 'utf8')
    expect(pkg).toContain('"sharp"')
    expect(pkg).toMatch(/"sharp": "\^0\.35/)
  })

  it('next.config.ts forces the native @img packages into the standalone trace', () => {
    const cfg = readFileSync(join(root, 'next.config.ts'), 'utf8')
    expect(cfg).toContain("output: 'standalone'")
    expect(cfg).toContain('outputFileTracingIncludes')
    expect(cfg).toContain("'./node_modules/@img/**/*'")
    expect(cfg).toContain("'./node_modules/sharp/**/*'")
  })

  it.skipIf(!STANDALONE_EXISTS)(
    'the built standalone output ships the native libvips binary',
    () => {
      const standalone = join(root, '.next/standalone/node_modules/@img')
      let found = false
      try {
        for (const entry of readdirSync(standalone)) {
          if (!entry.startsWith('sharp-libvips-')) continue
          const libDir = join(standalone, entry, 'lib')
          const files = readdirSync(libDir)
          if (files.some((f) => f.endsWith('.so') || f.endsWith('.dylib'))) {
            found = true
            break
          }
        }
      } catch {
        found = false
      }
      // Authoritative when a standalone build exists (local `bun run build`);
      // skipped during the pre-build CI smoke phase.
      expect(found, 'standalone output must ship the native libvips binary').toBe(true)
    },
  )
})
