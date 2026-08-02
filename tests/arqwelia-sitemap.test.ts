/**
 * ARQWELIA — sitemap inclusion test.
 *
 * Verifies that `/arqwelia` is included in the generated sitemap ONLY when
 * NEXT_PUBLIC_ARQWELIA_LOT1_ENABLED === 'true', and that no wizard route
 * under /arqwelia/start/* is ever indexed. The feature flag is read at module
 * load time, so each case reloads the module with a fresh environment.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const TEST_SITE_URL = 'https://aqwelia.app'
const WIZARD_PREFIXES = [
  '/arqwelia/start',
  '/arqwelia/pro',
]

// Alias-free cache of the original env value.
const originalEnv = process.env

async function loadSitemap(flag: string | undefined) {
  // Build a fresh env for this case.
  const env = { ...process.env }
  if (flag === undefined) delete env.NEXT_PUBLIC_ARQWELIA_LOT1_ENABLED
  else env.NEXT_PUBLIC_ARQWELIA_LOT1_ENABLED = flag
  env.NEXT_PUBLIC_SITE_URL = TEST_SITE_URL

  vi.resetModules()
  process.env = env as typeof process.env

  const { default: sitemap } = await import('@/app/sitemap')
  process.env = originalEnv as typeof process.env
  return sitemap()
}

describe('ARQWELIA sitemap', () => {
  afterEach(() => {
    process.env = originalEnv as typeof process.env
    vi.resetModules()
  })

  it('flag true — /arqwelia present exactly once, weekly, priority 0.9', async () => {
    const entries = await loadSitemap('true')
    const arqwelia = entries.filter((e) => e.url === `${TEST_SITE_URL}/arqwelia`)
    expect(arqwelia).toHaveLength(1)
    expect(arqwelia[0].changeFrequency).toBe('weekly')
    expect(arqwelia[0].priority).toBe(0.9)
  })

  it('flag false — /arqwelia absent', async () => {
    const entries = await loadSitemap('false')
    expect(entries.filter((e) => e.url === `${TEST_SITE_URL}/arqwelia`)).toHaveLength(0)
  })

  it('flag absent — /arqwelia absent', async () => {
    const entries = await loadSitemap(undefined)
    expect(entries.filter((e) => e.url === `${TEST_SITE_URL}/arqwelia`)).toHaveLength(0)
  })

  it('no /arqwelia/start/* or /arqwelia/pro route is ever indexed', async () => {
    for (const flag of ['true', 'false', undefined]) {
      const entries = await loadSitemap(flag)
      for (const url of entries.map((e) => e.url)) {
        for (const prefix of WIZARD_PREFIXES) {
          expect(url.startsWith(`${TEST_SITE_URL}${prefix}`)).toBe(false)
        }
      }
    }
  })

  it('historical core routes remain present', async () => {
    const entries = await loadSitemap('true')
    const urls = entries.map((e) => e.url)
    for (const path of ['/', '/fonctionnalites', '/tarifs', '/pro', '/care', '/academy']) {
      expect(urls).toContain(`${TEST_SITE_URL}${path}`)
    }
  })

  it('every URL is absolute and uses SITE_URL', async () => {
    const entries = await loadSitemap('true')
    for (const e of entries) {
      expect(e.url).toMatch(/^https:\/\//)
      expect(e.url.startsWith(TEST_SITE_URL)).toBe(true)
    }
  })
})
