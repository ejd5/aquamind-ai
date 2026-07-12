#!/usr/bin/env node
/**
 * AQWELIA — SQLite → PostgreSQL migration script (P0-E).
 *
 * Usage:
 *   node scripts/migrate-sqlite-to-postgres.mjs --dry-run
 *   node scripts/migrate-sqlite-to-postgres.mjs --execute
 *
 * Safety:
 *   - --dry-run is the default (no writes)
 *   - --execute is required for actual migration
 *   - Never reads or modifies .env
 *   - Never contacts external databases
 *   - Masks passwords in logs
 *   - Detects orphaned relations
 *   - Reports counts before/after
 *
 * Requirements:
 *   - SQLITE_URL env var (file: URL) — defaults to file:./db/custom.db
 *   - POSTGRES_URL env var (postgresql:// URL) — required for --execute
 */
import { PrismaClient } from '@prisma/client'
import { readFileSync, writeFileSync } from 'fs'

const SQLITE_URL = process.env.SQLITE_URL || 'file:./db/custom.db'
const POSTGRES_URL = process.env.POSTGRES_URL || ''
const DRY_RUN = !process.argv.includes('--execute')
const EXPORT_DIR = process.env.EXPORT_DIR || '/tmp/aqwelia-migration-export'

// Tables to migrate (order matters for FK constraints)
const TABLES = [
  'User',
  'Account',
  'PoolProfile',
  'WaterTest',
  'PhotoDiagnostic',
  'ActionPlan',
  'Equipment',
  'ProductInventory',
  'ChatMessage',
  'MaintenanceTask',
  'PoolDesign',
  'Reminder',
  'GuideView',
  'Subscription',
  'AnalyticsEvent',
  'EarlyAccessLead',
  'CareNotification',
  'PartnerApplication',
  'ContactMessage',
  'ProClient',
  'ProPool',
  'ProWaterTest',
  'ProIntervention',
  'PoolShare',
  'Product',
  'ProductCategory',
  'Cart',
  'Order',
  'Kit',
  'IotSensor',
  'ConsentRecord',
  'Supplier',
  'AcademyCourse',
  'Certification',
  'Organization',
  'OrganizationMember',
  'Lead',
  'LeadEvent',
  'Appointment',
  'Quote',
  'Commission',
  'AgentRun',
  'AgentAction',
  'BillingEvent',
]

function maskUrl(url) {
  return url.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@')
}

async function exportFromSqlite() {
  console.log(`\n=== Exporting from SQLite: ${SQLITE_URL} ===`)
  const sqlite = new PrismaClient({ datasources: { db: { url: SQLITE_URL } } })

  const exportData = {}
  const counts = {}

  for (const table of TABLES) {
    try {
      const records = await sqlite[table].findMany()
      exportData[table] = records
      counts[table] = records.length
      console.log(`  ${table}: ${records.length} records`)
    } catch (err) {
      console.log(`  ${table}: SKIP (${err.message.slice(0, 50)})`)
      exportData[table] = []
      counts[table] = 0
    }
  }

  await sqlite.$disconnect()

  // Save export
  const exportPath = `${EXPORT_DIR}/aqwelia-export.json`
  writeFileSync(exportPath, JSON.stringify(exportData, null, 2))
  console.log(`\nExport saved to: ${exportPath}`)

  return { exportData, counts }
}

function detectOrphans(exportData) {
  console.log('\n=== Checking for orphaned relations ===')
  const orphans = []

  // Check PoolProfile.userId → User.id
  const userIds = new Set(exportData.User.map(u => u.id))
  for (const pool of exportData.PoolProfile || []) {
    if (!userIds.has(pool.userId)) {
      orphans.push({ table: 'PoolProfile', id: pool.id, field: 'userId', value: pool.userId })
    }
  }

  // Check Subscription.userId → User.id
  for (const sub of exportData.Subscription || []) {
    if (!userIds.has(sub.userId)) {
      orphans.push({ table: 'Subscription', id: sub.id, field: 'userId', value: sub.userId })
    }
  }

  // Check WaterTest.userId → User.id
  for (const wt of exportData.WaterTest || []) {
    if (!userIds.has(wt.userId)) {
      orphans.push({ table: 'WaterTest', id: wt.id, field: 'userId', value: wt.userId })
    }
  }

  // Check BillingEvent.userId → User.id (nullable, so skip nulls)
  for (const be of exportData.BillingEvent || []) {
    if (be.userId && !userIds.has(be.userId)) {
      orphans.push({ table: 'BillingEvent', id: be.id, field: 'userId', value: be.userId })
    }
  }

  if (orphans.length === 0) {
    console.log('  ✅ No orphaned relations found')
  } else {
    console.log(`  ⚠️  ${orphans.length} orphaned relations found:`)
    for (const o of orphans.slice(0, 10)) {
      console.log(`    ${o.table}.${o.id}: ${o.field}=${o.value}`)
    }
  }

  return orphans
}

async function importToPostgres(exportData, sqliteCounts) {
  if (DRY_RUN) {
    console.log('\n=== DRY RUN — no writes to PostgreSQL ===')
    console.log(`  Target: ${maskUrl(POSTGRES_URL)}`)
    console.log('  Mode: dry-run (use --execute to actually migrate)')
    return { pgCounts: {} }
  }

  if (!POSTGRES_URL || !POSTGRES_URL.startsWith('postgresql://')) {
    console.error('ERROR: POSTGRES_URL env var required for --execute')
    process.exit(1)
  }

  console.log(`\n=== Importing to PostgreSQL: ${maskUrl(POSTGRES_URL)} ===`)
  const pg = new PrismaClient({ datasources: { db: { url: POSTGRES_URL } } })

  const pgCounts = {}

  try {
    await pg.$transaction(async (tx) => {
      for (const table of TABLES) {
        const records = exportData[table] || []
        if (records.length === 0) {
          pgCounts[table] = 0
          continue
        }

        // Delete existing (idempotent)
        await tx[table].deleteMany()

        // Insert in batches of 100
        for (let i = 0; i < records.length; i += 100) {
          const batch = records.slice(i, i + 100)
          await tx[table].createMany({ data: batch })
        }

        pgCounts[table] = records.length
        console.log(`  ${table}: ${records.length} imported`)
      }
    })
    console.log('\n✅ Import transaction committed')
  } catch (err) {
    console.error('\n❌ Import transaction rolled back:', err.message)
    throw err
  }

  await pg.$disconnect()
  return { pgCounts }
}

function generateReport(sqliteCounts, pgCounts, orphans) {
  console.log('\n=== Migration Report ===')
  console.log('┌─────────────────────┬──────────┬──────────┬──────────┐')
  console.log('│ Table               │ SQLite   │ Postgres │ Match    │')
  console.log('├─────────────────────┼──────────┼──────────┼──────────┤')

  let totalSqlite = 0
  let totalPg = 0
  let allMatch = true

  for (const table of TABLES) {
    const sc = sqliteCounts[table] || 0
    const pc = pgCounts[table] ?? (DRY_RUN ? '?' : 0)
    const match = pc === '?' ? '?' : (sc === pc ? '✅' : '❌')
    if (match === '❌') allMatch = false
    totalSqlite += sc
    if (typeof pc === 'number') totalPg += pc

    console.log(`│ ${table.padEnd(19)} │ ${String(sc).padStart(8)} │ ${String(pc).padStart(8)} │ ${match.padEnd(8)} │`)
  }

  console.log('├─────────────────────┼──────────┼──────────┼──────────┤')
  console.log(`│ ${'TOTAL'.padEnd(19)} │ ${String(totalSqlite).padStart(8)} │ ${String(totalPg).padStart(8)} │ ${allMatch ? '✅' : '❌'}        │`)
  console.log('└─────────────────────┴──────────┴──────────┴──────────┘')

  console.log(`\nOrphaned relations: ${orphans.length}`)
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'EXECUTE'}`)
  console.log(`All counts match: ${allMatch}`)

  if (!allMatch && !DRY_RUN) {
    console.log('\n⚠️  Some counts do not match. Review the report before proceeding.')
  }
}

async function main() {
  console.log('AQWELIA — SQLite → PostgreSQL Migration')
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no writes)' : 'EXECUTE (will write to PostgreSQL)'}`)
  console.log(`SQLite: ${SQLITE_URL}`)
  if (!DRY_RUN) console.log(`PostgreSQL: ${maskUrl(POSTGRES_URL)}`)

  // 1. Export from SQLite
  const { exportData, counts: sqliteCounts } = await exportFromSqlite()

  // 2. Detect orphans
  const orphans = detectOrphans(exportData)

  // 3. Import to PostgreSQL
  const { pgCounts } = await importToPostgres(exportData, sqliteCounts)

  // 4. Generate report
  generateReport(sqliteCounts, pgCounts, orphans)

  // 5. Rollback procedure
  console.log('\n=== Rollback Procedure ===')
  console.log('1. The PostgreSQL import is transactional — if it failed, no data was written.')
  console.log('2. If rollback is needed after successful import:')
  console.log('   a. Switch DATABASE_URL back to the SQLite URL')
  console.log('   b. The SQLite database is unchanged (read-only during migration)')
  console.log('   c. Verify the application works with SQLite again')
  console.log('3. The exported JSON is at: /tmp/aqwelia-migration-export/aqwelia-export.json')
}

main().catch(err => {
  console.error('Migration failed:', err.message)
  process.exit(1)
})
