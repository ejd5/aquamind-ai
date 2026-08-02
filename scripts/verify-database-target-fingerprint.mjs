#!/usr/bin/env node
/**
 * Verify the canonical Neon target for staging database migrations.
 *
 * Reads exclusively:
 *   STAGING_DATABASE_URL                  (pooled connection)
 *   STAGING_DIRECT_URL                    (direct connection)
 *   STAGING_DATABASE_TARGET_FINGERPRINT   (expected 12-char lowercase hex hash)
 *
 * Fail-closed guard: refuses to run if the resolved target fingerprint does not
 * match the fingerprint expected by the GitHub `staging` environment. Never
 * prints any connection value (URL, hostname, database, username, password).
 *
 * Output on success only:
 *   database_target_fingerprint=<hash>
 *   database_target_verified=true
 *
 * Output on failure: a generic message and a non-zero exit code.
 */
import { createHash } from 'node:crypto'

const FINGERPRINT_RE = /^[0-9a-f]{12}$/
const POSTGRES_URL_RE = /^(postgres|postgresql):\/\//i

/**
 * Parse a postgres URL and return the normalized hostname (pooled hostname
 * without the Neon `-pooler` suffix) plus the database name. Throws on any
 * shape violation.
 */
function parseTarget(url, { requirePooled = false, requireDirect = false } = {}) {
  if (typeof url !== 'string' || url.length === 0) {
    throw new Error('target url missing')
  }
  if (!POSTGRES_URL_RE.test(url)) {
    throw new Error('unsupported protocol')
  }
  let parsed
  try {
    parsed = new URL(url)
  } catch {
    throw new Error('invalid target url')
  }
  const host = parsed.hostname
  if (!host) {
    throw new Error('missing hostname')
  }
  const databaseName = parsed.pathname.replace(/^\//, '')
  if (!databaseName) {
    throw new Error('missing database name')
  }
  // The Neon pooled variant appends `-pooler` immediately before the first
  // `.` (e.g. `ep-xxx-pooler.c-4.eu...`). A direct host never carries that
  // suffix. Check the suffix, not any substring containing "pooler".
  const isPooledHost = /-pooler\./.test(host)

  if (requirePooled && !isPooledHost) {
    throw new Error('pooled url must use a pooled hostname')
  }
  if (requireDirect && isPooledHost) {
    throw new Error('direct url must not use a pooled hostname')
  }

  // Normalize: remove only the leading `-pooler` suffix placed before the
  // first `.`. Never replaces any other occurrence of "pooler".
  const normalized = host.replace(/^([^.]+)-pooler\./, '$1.')

  return { normalizedHostname: normalized, databaseName }
}

function computeFingerprint(normalizedHostname, databaseName) {
  const digest = createHash('sha256')
    .update(normalizedHostname + databaseName)
    .digest('hex')
  return digest.slice(0, 12)
}

function fail(message) {
  console.error(`database_target_verified=false: ${message}`)
  process.exit(1)
}

function main() {
  const pooled = process.env.STAGING_DATABASE_URL
  const direct = process.env.STAGING_DIRECT_URL
  const expected = process.env.STAGING_DATABASE_TARGET_FINGERPRINT

  if (!pooled) fail('pooled url missing')
  if (!direct) fail('direct url missing')
  if (!expected) fail('expected fingerprint missing')
  if (!FINGERPRINT_RE.test(expected)) fail('expected fingerprint malformed')

  let pooledInfo
  let directInfo
  try {
    pooledInfo = parseTarget(pooled, { requirePooled: true })
    directInfo = parseTarget(direct, { requireDirect: true })
  } catch (err) {
    fail(err instanceof Error ? err.message : 'invalid target urls')
  }

  if (pooledInfo.normalizedHostname !== directInfo.normalizedHostname) {
    fail('pooled and direct hostnames do not match')
  }
  if (pooledInfo.databaseName !== directInfo.databaseName) {
    fail('pooled and direct database names do not match')
  }

  const fingerprint = computeFingerprint(pooledInfo.normalizedHostname, pooledInfo.databaseName)
  if (fingerprint !== expected) {
    fail('fingerprint mismatch')
  }

  // Success: anonymized output only.
  console.log(`database_target_fingerprint=${fingerprint}`)
  console.log('database_target_verified=true')
}

main()
