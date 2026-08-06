#!/usr/bin/env node
/**
 * AQWELIA Wave A2 (Round 4) — client bundle guard.
 *
 * Scans the Next.js client static chunks (.next/static/chunks) and fails if any
 * Prisma / @/lib/db / server-only marker leaked into a client bundle. The
 * RevenueCat client graph (revenuecat-manager + facades + hook + Providers)
 * must NEVER ship Prisma or server secrets.
 *
 * Usage (after `next build`):
 *   node scripts/check-client-bundle.mjs
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const chunksDir = join(root, '.next/static/chunks')
const markers = [
  '@prisma/client',
  'PrismaClient',
  'node:sqlite',
  'server-only',
  'generated/client-postgresql',
  'AQWELIA_DEPLOYMENT_ENV',
  'BILLING_ALLOW_SANDBOX',
]

if (!existsSync(chunksDir)) {
  console.log('[bundle-guard] .next/static/chunks not found — run `next build` first (skipped).')
  process.exit(0)
}

const files = []
function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name)
    if (entry.isDirectory()) walk(p)
    else if (entry.name.endsWith('.js') || entry.name.endsWith('.mjs')) files.push(p)
  }
}
walk(chunksDir)

const violations = []
for (const file of files) {
  const content = readFileSync(file, 'utf8')
  for (const marker of markers) {
    if (content.includes(marker)) {
      violations.push({ file, marker })
    }
  }
}

if (violations.length > 0) {
  console.error('[bundle-guard] Prisma/server-only markers found in CLIENT bundles:')
  for (const v of violations.slice(0, 20)) {
    console.error('  -', v.file, '->', v.marker)
  }
  process.exit(1)
}

console.log(`[bundle-guard] OK — ${files.length} client chunk(s), no Prisma/db/server-only marker.`)
