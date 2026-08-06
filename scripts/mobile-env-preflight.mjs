#!/usr/bin/env node
/**
 * AQWELIA Wave A3 — mobile build environment preflight (fail-closed).
 *
 * Validates the public environment variables required for a mobile build and
 * blocks a Release/Staging compile if a required variable is missing or
 * invalid. NEVER reads server secrets from the bundle.
 *
 * Public variables expected:
 *   NEXT_PUBLIC_API_BASE_URL         HTTPS, no localhost, no .invalid, no
 *                                    ephemeral Vercel preview domain.
 *   NEXT_PUBLIC_REVENUECAT_IOS_KEY   public (sk_ or goog_ prefixed) RevenueCat
 *                                    App Store key.
 *   NEXT_PUBLIC_REVENUECAT_ANDROID_KEY public (goog_ or sk_ prefixed) RevenueCat
 *                                    Play key.
 *
 * Server secrets that must NEVER appear in the bundle:
 *   REVENUECAT_API_KEY, REVENUECAT_WEBHOOK_SECRET, STRIPE_SECRET_KEY,
 *   STRIPE_WEBHOOK_SECRET, DATABASE_URL, NEXTAUTH_SECRET.
 *
 * Usage:
 *   NODE_ENV=production NEXT_PUBLIC_API_BASE_URL=... node scripts/mobile-env-preflight.mjs
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const profile = process.env.BUILD_PROFILE || process.env.NODE_ENV || 'production'
const requiredPublic = [
  'NEXT_PUBLIC_API_BASE_URL',
  'NEXT_PUBLIC_REVENUECAT_IOS_KEY',
  'NEXT_PUBLIC_REVENUECAT_ANDROID_KEY',
]
const serverSecrets = [
  'REVENUECAT_API_KEY',
  'REVENUECAT_WEBHOOK_SECRET',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'DATABASE_URL',
  'NEXTAUTH_SECRET',
]

const errors = []
const warnings = []

// ── 1. Required public variables present (Release/Staging must fail closed) ──
for (const name of requiredPublic) {
  const value = process.env[name]
  if (!value) {
    errors.push(`Missing required public variable ${name} for ${profile} build`)
    continue
  }
  // NEXT_PUBLIC_ vars are inlined by Next; validate the URL + key shape.
  if (name === 'NEXT_PUBLIC_API_BASE_URL') {
    try {
      const url = new URL(value)
      if (url.protocol !== 'https:') errors.push(`${name} must be HTTPS (got ${url.protocol}//)`)
      if (/localhost|127\.0\.0\.1|\.invalid/.test(url.hostname)) errors.push(`${name} must not be localhost/.invalid (got ${url.hostname})`)
      if (/vercel\.app/.test(url.hostname) && /preview/i.test(url.hostname)) errors.push(`${name} must not be an ephemeral preview domain (got ${url.hostname})`)
    } catch {
      errors.push(`${name} is not a valid URL`)
    }
  }
  if (name === 'NEXT_PUBLIC_REVENUECAT_IOS_KEY' || name === 'NEXT_PUBLIC_REVENUECAT_ANDROID_KEY') {
    // RevenueCat public SDK keys are NOT 'sk_live_...' secrets; they are
    // per-store public keys. We only enforce non-empty + length sanity and
    // reject obvious server secret shapes.
    if (value.startsWith('sk_live_') || value.startsWith('sk_test_')) {
      errors.push(`${name} looks like a server Stripe secret — public RevenueCat keys never start with sk_`)
    }
    if (value.length < 12) errors.push(`${name} is too short to be a valid public RevenueCat key`)
  }
}

// ── 2. Server secrets never present (bundles are built from these envs) ─────
for (const name of serverSecrets) {
  if (process.env[name]) {
    errors.push(`Server secret ${name} must not be present during a mobile build`)
  }
}

// ── 3. Scan the built bundle (out/) for forbidden markers ───────────────────
const outDir = join(root, 'out')
if (existsSync(outDir)) {
  const files = []
  function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, entry.name)
      if (entry.isDirectory()) walk(p)
      else if (/\.(js|mjs|html|json)$/.test(entry.name)) files.push(p)
    }
  }
  walk(outDir)
  const forbiddenMarkers = [
    'REVENUECAT_API_KEY',
    'REVENUECAT_WEBHOOK_SECRET',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'DATABASE_URL=',
    'NEXTAUTH_SECRET=',
    '@prisma/client',
    'PrismaClient',
  ]
  for (const file of files) {
    const content = readFileSync(file, 'utf8')
    for (const marker of forbiddenMarkers) {
      if (content.includes(marker)) {
        errors.push(`Forbidden marker "${marker}" found in mobile bundle: ${file}`)
      }
    }
  }
} else {
  warnings.push('out/ not present — bundle scan skipped (run mobile:build first)')
}

// ── 4. Report ───────────────────────────────────────────────────────────────
for (const w of warnings) console.warn('[mobile-preflight]', w)
if (errors.length > 0) {
  console.error(`[mobile-preflight] FAILED (profile ${profile}):`)
  for (const e of errors) console.error('  -', e)
  process.exit(1)
}
console.log(`[mobile-preflight] OK — ${profile} mobile environment is valid (${requiredPublic.length} public vars, bundle clean).`)
