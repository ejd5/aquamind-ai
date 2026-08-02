/**
 * Unit tests for scripts/verify-database-target-fingerprint.mjs.
 *
 * Uses Vitest and fake URLs. The script is executed as a subprocess so we can
 * assert on exit code and stdout/stderr. No connection strings, no secrets,
 * no external services.
 */
import { test } from 'vitest'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), '..', 'scripts', 'verify-database-target-fingerprint.mjs')

// Canonical C518-style fake targets (NOT real credentials).
const POOLED_HOST = 'ep-fake-target-abcdefgh.c-4.eu-central-1.aws.neon.tech'
const POOLED_URL = `postgresql://user:pass@${POOLED_HOST.replace('.c-', '-pooler.c-')}/neondb`
const DIRECT_URL = `postgresql://user:pass@${POOLED_HOST}/neondb`
const DB = 'neondb'
const FINGERPRINT = createHash('sha256').update(POOLED_HOST + DB).digest('hex').slice(0, 12)

function runGuard(env = {}) {
  const res = spawnSync(process.execPath, [SCRIPT], {
    encoding: 'utf8',
    env: {
      ...process.env,
      STAGING_DATABASE_URL: POOLED_URL,
      STAGING_DIRECT_URL: DIRECT_URL,
      STAGING_DATABASE_TARGET_FINGERPRINT: FINGERPRINT,
      ...env,
    },
  })
  return {
    status: res.status,
    stdout: res.stdout || '',
    stderr: res.stderr || '',
  }
}

test('1. pooled and direct coherent + correct fingerprint -> success', () => {
  const r = runGuard()
  assert.equal(r.status, 0)
  assert.match(r.stdout, /database_target_verified=true/)
  assert.match(r.stdout, /database_target_fingerprint=[0-9a-f]{12}/)
  assert.ok(r.stdout.includes(`database_target_fingerprint=${FINGERPRINT}`))
})

test('2. expected fingerprint absent -> failure', () => {
  const r = runGuard({ STAGING_DATABASE_TARGET_FINGERPRINT: '' })
  assert.notEqual(r.status, 0)
  assert.match(r.stdout + r.stderr, /expected fingerprint missing/)
})

test('3. expected fingerprint malformed -> failure', () => {
  const r = runGuard({ STAGING_DATABASE_TARGET_FINGERPRINT: 'XYZ' })
  assert.notEqual(r.status, 0)
  assert.match(r.stdout + r.stderr, /malformed/)
})

test('4. fingerprint different -> failure', () => {
  const other = 'abcdefabcdef'
  const r = runGuard({ STAGING_DATABASE_TARGET_FINGERPRINT: other })
  assert.notEqual(r.status, 0)
  assert.match(r.stdout + r.stderr, /fingerprint mismatch/)
})

test('5. pooled and direct hostnames different -> failure', () => {
  const otherDirectHost = 'ep-other-host-12345678.c-4.eu-central-1.aws.neon.tech'
  const r = runGuard({ STAGING_DIRECT_URL: `postgresql://user:pass@${otherDirectHost}/neondb` })
  assert.notEqual(r.status, 0)
  assert.match(r.stdout + r.stderr, /hostnames do not match/)
})

test('6. database names different -> failure', () => {
  const r = runGuard({ STAGING_DIRECT_URL: DIRECT_URL.replace('/neondb', '/otherdb') })
  assert.notEqual(r.status, 0)
  assert.match(r.stdout + r.stderr, /database names do not match/)
})

test('7. pooled URL without -pooler suffix -> failure', () => {
  // POOLED_URL without the -pooler suffix == the direct host
  const r = runGuard({ STAGING_DATABASE_URL: DIRECT_URL })
  assert.notEqual(r.status, 0)
  assert.match(r.stdout + r.stderr, /pooled url must use a pooled hostname/)
})

test('8. direct URL using a pooled hostname -> failure', () => {
  const r = runGuard({ STAGING_DIRECT_URL: POOLED_URL })
  assert.notEqual(r.status, 0)
  assert.match(r.stdout + r.stderr, /direct url must not use a pooled hostname/)
})

test('9. non-PostgreSQL protocol -> failure', () => {
  const r = runGuard({ STAGING_DATABASE_URL: 'mysql://user:pass@host/db' })
  assert.notEqual(r.status, 0)
  assert.match(r.stdout + r.stderr, /unsupported protocol/)
})

test('10. no sensitive value in stdout/stderr', () => {
  const r = runGuard()
  const out = r.stdout + r.stderr
  assert.ok(!out.includes('user:pass'))
  assert.ok(!out.includes(POOLED_HOST))
  assert.ok(!out.includes('ep-fake-target'))
  assert.ok(!out.includes('postgresql://'))
})

test('11. exact -pooler normalization', () => {
  // The fingerprint in success output must equal the one computed from the
  // DIRECT hostname (i.e. -pooler removed before the first dot only).
  const r = runGuard()
  assert.ok(r.stdout.includes(`database_target_fingerprint=${FINGERPRINT}`))
})

test('12. no accidental replacement of other text containing "pooler"', () => {
  // The DIRECT hostname itself contains "pooler" as part of its label (not as
  // the Neon `-pooler` suffix). The normalization must strip ONLY the leading
  // `-pooler` suffix added for the pooled variant, preserving the internal
  // "pooler" substring in the label.
  const directHost = 'ep-my-pooler-endpoint-abc.c-4.eu-central-1.aws.neon.tech'
  const pooledHost = directHost.replace('.c-', '-pooler.c-')
  const expectedFp = createHash('sha256').update(directHost + 'db').digest('hex').slice(0, 12)
  const res = spawnSync(process.execPath, [SCRIPT], {
    encoding: 'utf8',
    env: {
      ...process.env,
      STAGING_DATABASE_URL: `postgresql://u:p@${pooledHost}/db`,
      STAGING_DIRECT_URL: `postgresql://u:p@${directHost}/db`,
      STAGING_DATABASE_TARGET_FINGERPRINT: expectedFp,
    },
  })
  assert.equal(res.status, 0, res.stderr)
  assert.ok(res.stdout.includes(`database_target_fingerprint=${expectedFp}`))
})

test('13. raw pooled hostname hash is refused as the expected fingerprint', () => {
  // The fingerprint computed from the POOLED hostname (with `-pooler`) is NOT
  // the canonical value: the guard hashes the normalized DIRECT hostname. A
  // pooled-raw fingerprint must therefore be rejected.
  const pooledHostRaw = POOLED_HOST.replace('.c-', '-pooler.c-')
  const pooledRawFp = createHash('sha256').update(pooledHostRaw + DB).digest('hex').slice(0, 12)
  assert.notEqual(pooledRawFp, FINGERPRINT, 'sanity: pooled-raw hash differs from direct hash')
  const r = runGuard({ STAGING_DATABASE_TARGET_FINGERPRINT: pooledRawFp })
  assert.notEqual(r.status, 0)
  assert.match(r.stdout + r.stderr, /fingerprint mismatch/)
})
