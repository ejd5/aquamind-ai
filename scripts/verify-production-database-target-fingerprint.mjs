#!/usr/bin/env node
/**
 * Verify the canonical Neon target for production database migrations.
 *
 * Reads exclusively:
 *   PRODUCTION_DATABASE_URL                  (pooled connection)
 *   PRODUCTION_DIRECT_URL                    (direct connection)
 *   PRODUCTION_DATABASE_TARGET_FINGERPRINT   (expected 12-char lowercase hex hash)
 *
 * Fail-closed guard: refuses to run if the resolved target fingerprint does not
 * match the fingerprint expected by the GitHub `production` environment. Never
 * prints any connection value (URL, hostname, database, username, password).
 */
import { createHash } from 'node:crypto'

const FINGERPRINT_RE = /^[0-9a-f]{12}$/
const POSTGRES_URL_RE = /^(postgres|postgresql):\/\//i

function parseTarget(url, { requirePooled = false, requireDirect = false } = {}) {
  if (typeof url !== 'string' || url.length === 0) throw new Error('target url missing')
  if (!POSTGRES_URL_RE.test(url)) throw new Error('unsupported protocol')

  let parsed
  try {
    parsed = new URL(url)
  } catch {
    throw new Error('invalid target url')
  }

  const host = parsed.hostname
  const databaseName = parsed.pathname.replace(/^\//, '')
  if (!host) throw new Error('missing hostname')
  if (!databaseName) throw new Error('missing database name')

  const isPooledHost = /-pooler\./.test(host)
  if (requirePooled && !isPooledHost) throw new Error('pooled url must use a pooled hostname')
  if (requireDirect && isPooledHost) throw new Error('direct url must not use a pooled hostname')

  const normalizedHostname = host.replace(/^([^.]+)-pooler\./, '$1.')
  return { normalizedHostname, databaseName }
}

function computeFingerprint(normalizedHostname, databaseName) {
  return createHash('sha256')
    .update(normalizedHostname + databaseName)
    .digest('hex')
    .slice(0, 12)
}

function fail(message) {
  console.error(`database_target_verified=false: ${message}`)
  process.exit(1)
}

function main() {
  const pooled = process.env.PRODUCTION_DATABASE_URL
  const direct = process.env.PRODUCTION_DIRECT_URL
  const expected = process.env.PRODUCTION_DATABASE_TARGET_FINGERPRINT

  if (!pooled) fail('pooled url missing')
  if (!direct) fail('direct url missing')
  if (!expected) fail('expected fingerprint missing')
  if (!FINGERPRINT_RE.test(expected)) fail('expected fingerprint malformed')

  let pooledInfo
  let directInfo
  try {
    pooledInfo = parseTarget(pooled, { requirePooled: true })
    directInfo = parseTarget(direct, { requireDirect: true })
  } catch (error) {
    fail(error instanceof Error ? error.message : 'invalid target urls')
  }

  if (pooledInfo.normalizedHostname !== directInfo.normalizedHostname) {
    fail('pooled and direct hostnames do not match')
  }
  if (pooledInfo.databaseName !== directInfo.databaseName) {
    fail('pooled and direct database names do not match')
  }

  const fingerprint = computeFingerprint(pooledInfo.normalizedHostname, pooledInfo.databaseName)
  if (fingerprint !== expected) fail('fingerprint mismatch')

  console.log(`database_target_fingerprint=${fingerprint}`)
  console.log('database_target_verified=true')
}

main()
