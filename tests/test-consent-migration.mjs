#!/usr/bin/env node
/**
 * AQWELIA — PostgreSQL migration scenario tests
 *
 * Validates the consentAt incremental migration:
 *   Scenario A — empty database: deploy all, verify consentAt
 *   Scenario B — existing database: deploy baseline, add data,
 *                apply consentAt migration, verify upgrade
 *   Scenario C — idempotency: second deploy is a no-op
 *
 * Requires POSTGRES_TEST_DATABASE_URL (CI only — never runs locally).
 */
import { execSync } from 'node:child_process'
import { readFileSync, readdirSync, mkdirSync, cpSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { pathToFileURL } from 'node:url'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const PROJECT_ROOT = join(__dirname, '..')
const MIGRATIONS_DIR = join(PROJECT_ROOT, 'prisma/postgresql/migrations')
const SCHEMA_PATH = join(PROJECT_ROOT, 'prisma/postgresql/schema.prisma')
const PRISMA_BIN = join(PROJECT_ROOT, 'node_modules/.bin/prisma')
const CLIENT_PATH = join(PROJECT_ROOT, 'generated/client-postgresql/index.js')

const POSTGRES_URL = process.env.POSTGRES_TEST_DATABASE_URL
if (!POSTGRES_URL?.match(/^postgres(ql)?:\/\//)) {
  console.error('POSTGRES_TEST_DATABASE_URL must be a PostgreSQL connection string')
  process.exit(1)
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function createDb(name) {
  execSync(`psql "${POSTGRES_URL}" -c 'CREATE DATABASE "${name}"'`, { stdio: 'pipe' })
}
function dropDb(name) {
  try { execSync(`psql "${POSTGRES_URL}" -c 'DROP DATABASE IF EXISTS "${name}"'`, { stdio: 'pipe' }) } catch {}
}

function getClient(dbUrl) {
  return import(pathToFileURL(CLIENT_PATH).href).then(loaded => {
    const P = loaded.PrismaClient || loaded.default?.PrismaClient
    if (!P) throw new Error('PrismaClient not found')
    return new P({ datasources: { db: { url: dbUrl } } })
  })
}

let P = 0, F = 0
function ok(c, m) { if (c) { console.log(`    ✓ ${m}`); P++ } else { console.error(`    ✗ ${m}`); F++ } }
function eq(a, b, m) { ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`) }

/**
 * Create a temp environment with a subset of migrations and deploy via
 * `prisma migrate deploy`. This properly creates _prisma_migrations and
 * marks each applied migration.
 *
 * @param {string} dbUrl  target database URL
 * @param {string[]} migrationNames  migration dir names to include
 * @returns {{ok: boolean, output: string}}
 */
function deployMigrations(dbUrl, migrationNames) {
  const tmpDir = join('/tmp', `aqwelia-mig-${randomUUID().slice(0, 8)}`)
  const tmpMigrations = join(tmpDir, 'migrations')
  const tmpSchema = join(tmpDir, 'schema.prisma')

  try {
    mkdirSync(tmpMigrations, { recursive: true })

    // Copy only selected migration folders + lock file
    for (const name of migrationNames) {
      cpSync(join(MIGRATIONS_DIR, name), join(tmpMigrations, name), { recursive: true })
    }
    writeFileSync(join(tmpMigrations, 'migration_lock.toml'),
      readFileSync(join(MIGRATIONS_DIR, 'migration_lock.toml')))

    // Copy the schema and patch the migrations path
    // Prisma resolves migrations relative to the schema file's parent dir.
    // So we write schema.prisma in tmpDir and put migrations/ next to it.
    const schemaContent = readFileSync(SCHEMA_PATH, 'utf8')
    writeFileSync(tmpSchema, schemaContent)

    const out = execSync(`${PRISMA_BIN} migrate deploy --schema "${tmpSchema}"`, {
      env: { ...process.env, DATABASE_URL: dbUrl },
      encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'],
    }).trim()
    return { ok: true, output: out }
  } catch (e) {
    return { ok: false, output: (e.stderr || e.stdout || e.message).trim() }
  } finally {
    rmSync(tmpDir, { recursive: true, force: true })
  }
}

/**
 * Deploy ALL migrations to a database URL.
 */
function deployAll(dbUrl) {
  return deployMigrations(dbUrl, readdirSync(MIGRATIONS_DIR).filter(e => /^\d{14}_/.test(e)))
}

// ── Scenario A: Empty database ──────────────────────────────────────────────
async function scenarioA() {
  console.log('\n═══ Scenario A — Empty database ═══')
  const db = `aqwelia_test_a_${randomUUID().slice(0, 8)}`
  const dbUrl = POSTGRES_URL.replace(/\/[^/]+$/, `/${db}`)
  createDb(db); console.log(`  Created: ${db}`)

  try {
    console.log('  Deploying all migrations...')
    const r = deployAll(dbUrl)
    ok(r.ok, 'migrate deploy succeeds on empty database')
    if (!r.ok) console.error(`    output: ${r.output}`)

    const c = await getClient(dbUrl)
    try {
      // Verify consentAt column
      const cols = await c.$queryRaw`SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name = 'Lead' AND column_name = 'consentAt'`
      eq(cols.length, 1, 'consentAt column exists')
      if (cols.length) eq(cols[0].is_nullable, 'YES', 'consentAt is nullable')

      // Verify migration list
      const migs = await c.$queryRaw`SELECT migration_name FROM _prisma_migrations WHERE rolled_back_at IS NULL ORDER BY started_at`
      const names = migs.map(m => m.migration_name)
      ok(names.includes('20260712000000_baseline'), 'baseline present')
      ok(names.includes('20260719120000_add_lead_consent_at'), 'consentAt migration present')

      // Create lead with consentAt
      const owner = await c.user.create({ data: { email: `owner-${db}@test.com`, name: 'Owner', role: 'admin', passwordHash: 'test' } })
      const org = await c.organization.create({ data: { name: `OA-${db}`, type: 'growth', ownerId: owner.id } })
      const lead = await c.lead.create({ data: {
        organizationId: org.id, firstName: 'A', lastName: 'B',
        email: `a-${db}@test.com`, source: 'test', status: 'new', consentAt: new Date()
      }})
      ok(lead.consentAt instanceof Date, 'lead with consentAt round-trips')

      // Create lead without consentAt
      const hist = await c.lead.create({ data: {
        organizationId: org.id, firstName: 'H', lastName: 'I',
        email: `h-${db}@test.com`, source: 'test', status: 'new'
      }})
      eq(hist.consentAt, null, 'lead without consentAt = null')

      await c.$executeRawUnsafe(`DELETE FROM "Lead" WHERE "organizationId" = '${org.id}'`)
      await c.organization.delete({ where: { id: org.id } })
      await c.user.delete({ where: { id: owner.id } })
    } finally { await c.$disconnect() }
  } finally {
    dropDb(db); console.log(`  Dropped: ${db}`)
  }
}

// ── Scenario B: Existing database upgrade ────────────────────────────────────
async function scenarioB() {
  console.log('\n═══ Scenario B — Existing database upgrade ═══')
  const db = `aqwelia_test_b_${randomUUID().slice(0, 8)}`
  const dbUrl = POSTGRES_URL.replace(/\/[^/]+$/, `/${db}`)
  createDb(db); console.log(`  Created: ${db}`)

  try {
    // Step 1: Deploy only the baseline
    console.log('  Step 1: Deploying baseline only...')
    const r1 = deployMigrations(dbUrl, ['20260712000000_baseline'])
    ok(r1.ok, 'baseline deploy succeeds')
    if (!r1.ok) console.error(`    output: ${r1.output}`)

    // Step 2: Create pre-migration data
    console.log('  Step 2: Creating pre-migration data...')
    const c = await getClient(dbUrl)
    try {
      const owner = await c.user.create({ data: { email: `owner-${db}@test.com`, name: 'Owner', role: 'admin', passwordHash: 'test' } })
      const org = await c.organization.create({ data: { name: `OB-${db}`, type: 'growth', ownerId: owner.id } })
      // Use raw SQL because the Prisma client schema includes consentAt but
      // the database only has the baseline schema at this point.
      await c.$executeRawUnsafe(
        `INSERT INTO "Lead" ("id", "organizationId", "firstName", "lastName", "email", "source", "status", "consent", "score", "createdAt", "updatedAt")
         VALUES ('pre-mig-${db}', '${org.id}', 'H', 'B', 'h-${db}@test.com', 'test', 'new', false, 0, NOW(), NOW())`
      )

      // Step 3: Apply ALL migrations (baseline already applied, consentAt is new)
      console.log('  Step 3: Applying incremental migration...')
      const r2 = deployAll(dbUrl)
      ok(r2.ok, 'migrate deploy succeeds on existing database')
      if (!r2.ok) console.error(`    output: ${r2.output}`)

      // Step 4: Verify
      console.log('  Step 4: Verifying post-migration state...')
      const migs = await c.$queryRaw`SELECT migration_name, applied_steps_count FROM _prisma_migrations WHERE rolled_back_at IS NULL ORDER BY started_at`
      const baseline = migs.find(m => m.migration_name === '20260712000000_baseline')
      const consent = migs.find(m => m.migration_name === '20260719120000_add_lead_consent_at')
      ok(!!baseline, 'baseline still recognized')
      ok(!!consent, 'consentAt migration applied')
      eq(consent.applied_steps_count, 1, 'consentAt applied exactly once')

      // Historical lead preserved
      const hAfter = await c.lead.findFirst({ where: { email: `h-${db}@test.com` } })
      eq(hAfter.consentAt, null, 'historical lead consentAt remains null')

      // consentAt column exists
      const cols = await c.$queryRaw`SELECT column_name FROM information_schema.columns WHERE table_name = 'Lead' AND column_name = 'consentAt'`
      eq(cols.length, 1, 'consentAt column exists after upgrade')

      // New lead with consentAt works
      const nLead = await c.lead.create({ data: {
        organizationId: org.id, firstName: 'N', lastName: 'B',
        email: `n-${db}@test.com`, source: 'test', status: 'new', consentAt: new Date()
      }})
      ok(nLead.consentAt instanceof Date, 'new lead consentAt is Date')

      await c.$executeRawUnsafe(`DELETE FROM "Lead" WHERE "organizationId" = '${org.id}'`)
      await c.organization.delete({ where: { id: org.id } })
      await c.user.delete({ where: { id: owner.id } })
    } finally { await c.$disconnect() }
  } finally {
    dropDb(db); console.log(`  Dropped: ${db}`)
  }
}

// ── Scenario C: Idempotent second deploy ────────────────────────────────────
async function scenarioC() {
  console.log('\n═══ Scenario C — Idempotent second deploy ═══')
  const db = `aqwelia_test_c_${randomUUID().slice(0, 8)}`
  const dbUrl = POSTGRES_URL.replace(/\/[^/]+$/, `/${db}`)
  createDb(db); console.log(`  Created: ${db}`)

  try {
    console.log('  First deploy...')
    const r1 = deployAll(dbUrl)
    ok(r1.ok, 'first deploy succeeds')

    const c = await getClient(dbUrl)
    try {
      const owner = await c.user.create({ data: { email: `owner-${db}@test.com`, name: 'Owner', role: 'admin', passwordHash: 'test' } })
      const org = await c.organization.create({ data: { name: `OC-${db}`, type: 'growth', ownerId: owner.id } })
      await c.lead.create({ data: {
        organizationId: org.id, firstName: 'C', lastName: 'D',
        email: `c-${db}@test.com`, source: 'test', status: 'new', consentAt: new Date()
      }})
      const before = await c.lead.count()
      console.log(`  Leads before second deploy: ${before}`)

      console.log('  Second deploy (no-op)...')
      const r2 = deployAll(dbUrl)
      ok(r2.ok, 'second deploy succeeds without error')
      eq(await c.lead.count(), before, 'lead count unchanged')

      const migs = await c.$queryRaw`SELECT migration_name FROM _prisma_migrations WHERE rolled_back_at IS NULL`
      eq(migs.length, 2, 'exactly 2 migrations')

      await c.$executeRawUnsafe(`DELETE FROM "Lead" WHERE "organizationId" = '${org.id}'`)
      await c.organization.delete({ where: { id: org.id } })
      await c.user.delete({ where: { id: owner.id } })
    } finally { await c.$disconnect() }
  } finally {
    dropDb(db); console.log(`  Dropped: ${db}`)
  }
}

// ── Main ────────────────────────────────────────────────────────────────────
console.log('═══════════════════════════════════════════════════════')
console.log('  AQWELIA — PostgreSQL Migration Scenario Tests')
console.log('═══════════════════════════════════════════════════════')
console.log(`Database: ${POSTGRES_URL.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`)

try {
  await scenarioA()
  await scenarioB()
  await scenarioC()
} catch (e) {
  console.error(`\nFATAL: ${e.message}`)
  console.error(e.stack)
  F++
}

console.log('\n═══════════════════════════════════════════════════════')
console.log(`  Results: ${P} passed, ${F} failed`)
console.log('═══════════════════════════════════════════════════════')
process.exit(F > 0 ? 1 : 0)
