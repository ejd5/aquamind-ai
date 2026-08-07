#!/usr/bin/env node
/**
 * AQWELIA Wave A3 — mobile bundle & native guard.
 *
 * Scans the exported mobile bundle (out/) and the generated native projects
 * (ios/, android/) for server secrets and Prisma/server-only markers. Fails the
 * build if anything leaks. The mobile build is swapped from src/mobile-app, so
 * this guard proves the client boundary holds for the native output too.
 *
 * Usage (after `bun run mobile:build` and `npx cap sync`):
 *   node scripts/check-mobile-bundle.mjs
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()

const secretMarkers = [
  'REVENUECAT_API_KEY',
  'REVENUECAT_WEBHOOK_SECRET',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'NEXTAUTH_SECRET',
]
// DATABASE_URL may legitimately appear in android/app/google-services.json etc;
// only treat an inlined value as a leak. We check for the pattern in JS bundles.
const jsMarkers = ['@prisma/client', 'PrismaClient', 'DATABASE_URL=', ...secretMarkers]

const dirsToScan = ['out', 'ios', 'android']
const errors = []

function collect(dir) {
  const files = []
  function walk(d) {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, entry.name)
      // Skip build artifacts that are not part of the committed source.
      if (entry.isDirectory()) {
        if (['node_modules', 'build', '.gradle', '.git', 'Pods', 'DerivedData', 'xcuserdata'].includes(entry.name)) continue
        walk(p)
      } else if (/\.(js|mjs|cjs|html|kt|swift|plist|pbxproj|gradle|xml|json)$/.test(entry.name)) {
        files.push(p)
      }
    }
  }
  walk(dir)
  return files
}

for (const dir of dirsToScan) {
  if (!existsSync(join(root, dir))) {
    // 'out' must exist after mobile:build; ios/android must exist after cap add.
    if (dir === 'out' || dir === 'ios' || dir === 'android') {
      errors.push(`Missing required directory ${dir} — run mobile:build / cap add first`)
    }
    continue
  }
  for (const file of collect(join(root, dir))) {
    let content
    try { content = readFileSync(file, 'utf8') } catch { continue }
    const isJs = /\.(js|mjs|cjs|html)$/.test(file)
    for (const marker of (isJs ? jsMarkers : secretMarkers)) {
      if (content.includes(marker)) {
        errors.push(`${marker} found in ${file}`)
      }
    }
  }
}

if (errors.length > 0) {
  console.error('[mobile-bundle-guard] FAILED:')
  for (const e of errors.slice(0, 30)) console.error('  -', e)
  process.exit(1)
}
console.log('[mobile-bundle-guard] OK — no server secret or Prisma marker in mobile bundle/native projects.')
