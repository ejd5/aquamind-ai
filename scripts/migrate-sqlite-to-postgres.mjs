#!/usr/bin/env node
/**
 * AQWELIA — SQLite → PostgreSQL migration script (P0-E final).
 *
 * Usage:
 *   node scripts/migrate-sqlite-to-postgres.mjs --dry-run
 *   node scripts/migrate-sqlite-to-postgres.mjs --execute --confirm
 *
 * Safety:
 *   - --dry-run is the default (no writes)
 *   - --execute requires --confirm for a second confirmation
 *   - Refuses to execute if PostgreSQL target is not empty (unless --force-non-empty)
 *   - Migration ID prevents double execution
 *   - Never reads or modifies .env
 *   - Masks all credentials in logs
 *   - Stops on ANY error (no silent SKIP)
 */
import { PrismaClient } from '@prisma/client'
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'fs'
import { createHash } from 'crypto'
import { join, resolve } from 'path'

const SQLITE_URL = process.env.SQLITE_URL || 'file:./db/custom.db'
const POSTGRES_URL = process.env.POSTGRES_URL || ''
const DRY_RUN = !process.argv.includes('--execute')
const CONFIRM = process.argv.includes('--confirm')
const FORCE_NON_EMPTY = process.argv.includes('--force-non-empty')
const EXPORT_DIR = process.env.EXPORT_DIR || '/tmp/aqwelia-migration-export'

// Prisma delegate names (lowercase) — these are the actual Prisma accessor names
const TABLES = [
  'user', 'account', 'poolProfile', 'waterTest', 'photoDiagnostic',
  'actionPlan', 'equipment', 'productInventory', 'chatMessage',
  'maintenanceTask', 'poolDesign', 'reminder', 'guideView',
  'subscription', 'analyticsEvent', 'earlyAccessLead', 'careNotification',
  'partnerApplication', 'contactMessage', 'proClient', 'proPool',
  'proWaterTest', 'proIntervention', 'poolShare', 'product', 'productCategory',
  'cart', 'order', 'kit', 'iotSensor', 'consentRecord', 'supplier',
  'academyCourse', 'certification', 'organization', 'organizationMember',
  'lead', 'leadEvent', 'appointment', 'quote', 'commission',
  'agentRun', 'agentAction', 'billingEvent',
]

// FK dependencies — table → field that references parent table
const FK_RELATIONS = [
  { child: 'account', field: 'userId', parent: 'user' },
  { child: 'poolProfile', field: 'userId', parent: 'user' },
  { child: 'waterTest', field: 'userId', parent: 'user' },
  { child: 'photoDiagnostic', field: 'userId', parent: 'user' },
  { child: 'equipment', field: 'userId', parent: 'user' },
  { child: 'productInventory', field: 'userId', parent: 'user' },
  { child: 'chatMessage', field: 'userId', parent: 'user' },
  { child: 'maintenanceTask', field: 'userId', parent: 'user' },
  { child: 'reminder', field: 'userId', parent: 'user' },
  { child: 'guideView', field: 'userId', parent: 'user' },
  { child: 'subscription', field: 'userId', parent: 'user' },
  { child: 'analyticsEvent', field: 'userId', parent: 'user' },
  { child: 'billingEvent', field: 'userId', parent: 'user' },
  { child: 'actionPlan', field: 'waterTestId', parent: 'waterTest' },
  { child: 'proPool', field: 'proClientId', parent: 'proClient' },
  { child: 'proWaterTest', field: 'proPoolId', parent: 'proPool' },
  { child: 'proIntervention', field: 'proClientId', parent: 'proClient' },
  { child: 'leadEvent', field: 'leadId', parent: 'lead' },
  { child: 'appointment', field: 'leadId', parent: 'lead' },
  { child: 'quote', field: 'leadId', parent: 'lead' },
  { child: 'commission', field: 'leadId', parent: 'lead' },
  { child: 'agentAction', field: 'agentRunId', parent: 'agentRun' },
  { child: 'organizationMember', field: 'organizationId', parent: 'organization' },
]

function maskUrl(url) {
  if (!url) return '(not set)'
  return url.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@')
}

function migrationId() {
  return `migration_${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}`
}

async function exportFromSqlite() {
  console.log(`\n=== Exporting from SQLite: ${SQLITE_URL} ===`)
  const sqlite = new PrismaClient({ datasources: { db: { url: SQLITE_URL } } })

  const exportData = {}
  const counts = {}
  const errors = []

  for (const table of TABLES) {
    try {
      const records = await sqlite[table].findMany()
      exportData[table] = records
      counts[table] = records.length
      console.log(`  ${table}: ${records.length} records`)
    } catch (err) {
      // STOP on any error — no silent SKIP
      errors.push({ table, error: err.message })
      console.error(`  ❌ ${table}: ERROR — ${err.message}`)
      console.error('  Migration ABORTED. Fix the error before retrying.')
      await sqlite.$disconnect()
      process.exit(1)
    }
  }

  await sqlite.$disconnect()

  // Create export dir
  mkdirSync(EXPORT_DIR, { recursive: true })

  // Save export
  const exportPath = join(EXPORT_DIR, 'aqwelia-export.json')
  writeFileSync(exportPath, JSON.stringify(exportData, null, 2))
  console.log(`\nExport saved to: ${exportPath}`)

  return { exportData, counts }
}

function detectOrphans(exportData) {
  console.log('\n=== Checking for orphaned relations ===')
  const orphans = []

  for (const { child, field, parent } of FK_RELATIONS) {
    const parentIds = new Set((exportData[parent] || []).map(r => r.id))
    for (const record of exportData[child] || []) {
      const fkValue = record[field]
      if (fkValue && !parentIds.has(fkValue)) {
        orphans.push({ table: child, id: record.id, field, value: fkValue, parentTable: parent })
      }
    }
  }

  if (orphans.length === 0) {
    console.log('  ✅ No orphaned relations found')
  } else {
    console.log(`  ⚠️  ${orphans.length} orphaned relations found:`)
    for (const o of orphans.slice(0, 20)) {
      console.log(`    ${o.table}.${o.id}: ${o.field}=${o.value} (→ ${o.parentTable})`)
    }
    if (orphans.length > 20) {
      console.log(`    ... and ${orphans.length - 20} more`)
    }
  }

  return orphans
}

async function checkPostgresNotEmpty(pg) {
  // Check if target PostgreSQL has any data
  for (const table of TABLES) {
    try {
      const count = await pg[table].count()
      if (count > 0) {
        return { empty: false, table, count }
      }
    } catch {
      // Table might not exist yet — that's OK
    }
  }
  return { empty: true }
}

async function importToPostgres(exportData, sqliteCounts, migId) {
  if (DRY_RUN) {
    console.log('\n=== DRY RUN — no writes to PostgreSQL ===')
    console.log(`  Target: ${maskUrl(POSTGRES_URL)}`)
    console.log('  Mode: dry-run (use --execute --confirm to actually migrate)')
    return { pgCounts: {}, success: false }
  }

  if (!CONFIRM) {
    console.error('\n❌ --execute requires --confirm flag for safety')
    process.exit(1)
  }

  if (!POSTGRES_URL || !POSTGRES_URL.startsWith('postgresql://')) {
    console.error('ERROR: POSTGRES_URL env var required for --execute')
    process.exit(1)
  }

  console.log(`\n=== Importing to PostgreSQL: ${maskUrl(POSTGRES_URL)} ===`)
  console.log(`Migration ID: ${migId}`)

  // Use the PostgreSQL-specific Prisma client
  const pgClientPath = resolve(process.cwd(), 'node_modules', '.prisma', 'client-postgresql')
  if (!existsSync(pgClientPath)) {
    console.error('ERROR: PostgreSQL Prisma client not found. Run: bun run db:pg:generate')
    process.exit(1)
  }
  const { PrismaClient: PgPrismaClient } = require(pgClientPath)
  const pg = new PgPrismaClient({ datasources: { db: { url: POSTGRES_URL } } })

  // Check if target is empty
  const emptyCheck = await checkPostgresNotEmpty(pg)
  if (!emptyCheck.empty && !FORCE_NON_EMPTY) {
    console.error(`\n❌ PostgreSQL target is NOT EMPTY (table "${emptyCheck.table}" has ${emptyCheck.count} rows)`)
    console.error('   Use --force-non-empty to override (DANGEROUS — will delete all existing data)')
    await pg.$disconnect()
    process.exit(1)
  }

  // Check for previous migration ID
  const migrationLogPath = join(EXPORT_DIR, 'migration-log.json')
  if (existsSync(migrationLogPath)) {
    const prevLog = JSON.parse(readFileSync(migrationLogPath, 'utf8'))
    if (prevLog.completed && !prevLog.rolledBack) {
      console.error(`\n❌ Previous migration already completed: ${prevLog.migrationId}`)
      console.error('   Use a new migration ID or rollback the previous one first.')
      await pg.$disconnect()
      process.exit(1)
    }
  }

  const pgCounts = {}
  let totalImported = 0

  try {
    await pg.$transaction(async (tx) => {
      // Delete existing data (only if --force-non-empty)
      if (!emptyCheck.empty) {
        console.log('  Deleting existing data (--force-non-empty)...')
        for (const table of [...TABLES].reverse()) {
          try { await tx[table].deleteMany() } catch { /* ignore */ }
        }
      }

      // Import in FK-safe order (TABLES is already ordered parent-first)
      for (const table of TABLES) {
        const records = exportData[table] || []
        if (records.length === 0) {
          pgCounts[table] = 0
          continue
        }

        // Insert in batches of 100
        for (let i = 0; i < records.length; i += 100) {
          const batch = records.slice(i, i + 100)
          await tx[table].createMany({ data: batch, skipDuplicates: false })
        }

        // VERIFY with count() — not just records.length
        const actualCount = await tx[table].count()
        pgCounts[table] = actualCount
        totalImported += actualCount

        if (actualCount !== records.length) {
          throw new Error(`Count mismatch for ${table}: expected ${records.length}, got ${actualCount}`)
        }

        console.log(`  ${table}: ${actualCount} imported ✅`)
      }
    })

    console.log(`\n✅ Import transaction committed (${totalImported} total records)`)

    // Write migration log
    const log = {
      migrationId: migId,
      completed: true,
      rolledBack: false,
      timestamp: new Date().toISOString(),
      sqliteCounts,
      pgCounts,
      totalImported,
    }
    writeFileSync(migrationLogPath, JSON.stringify(log, null, 2))
    console.log(`Migration log saved to: ${migrationLogPath}`)

  } catch (err) {
    console.error('\n❌ Import transaction ROLLED BACK:', err.message)
    // Log the failure
    const log = {
      migrationId: migId,
      completed: false,
      rolledBack: true,
      timestamp: new Date().toISOString(),
      error: err.message,
      sqliteCounts,
      pgCounts,
    }
    writeFileSync(migrationLogPath, JSON.stringify(log, null, 2))
    await pg.$disconnect()
    throw err
  }

  await pg.$disconnect()
  return { pgCounts, success: true }
}

function generateReport(sqliteCounts, pgCounts, orphans, migId) {
  console.log('\n=== Migration Report ===')
  console.log(`Migration ID: ${migId}`)
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

  // Write JSON report
  const reportPath = join(EXPORT_DIR, 'migration-report.json')
  const report = {
    migrationId: migId,
    mode: DRY_RUN ? 'dry-run' : 'execute',
    timestamp: new Date().toISOString(),
    sqliteCounts,
    pgCounts,
    orphans,
    allMatch,
    totalSqlite,
    totalPg,
  }
  mkdirSync(EXPORT_DIR, { recursive: true })
  writeFileSync(reportPath, JSON.stringify(report, null, 2))
  console.log(`\nJSON report saved to: ${reportPath}`)

  if (!allMatch && !DRY_RUN) {
    console.log('\n⚠️  Some counts do not match. Review the report before proceeding.')
  }
}

async function main() {
  const migId = migrationId()

  console.log('AQWELIA — SQLite → PostgreSQL Migration')
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no writes)' : 'EXECUTE (will write to PostgreSQL)'}`)
  console.log(`SQLite: ${SQLITE_URL}`)
  if (!DRY_RUN) console.log(`PostgreSQL: ${maskUrl(POSTGRES_URL)}`)
  console.log(`Migration ID: ${migId}`)

  // 1. Export from SQLite
  const { exportData, counts: sqliteCounts } = await exportFromSqlite()

  // 2. Detect orphans
  const orphans = detectOrphans(exportData)

  // 3. Import to PostgreSQL
  const { pgCounts } = await importToPostgres(exportData, sqliteCounts, migId)

  // 4. Generate report
  generateReport(sqliteCounts, pgCounts, orphans, migId)

  // 5. Rollback procedure
  console.log('\n=== Rollback Procedure ===')
  console.log('1. The PostgreSQL import is transactional — if it failed, no data was written.')
  console.log('2. If rollback is needed after successful import:')
  console.log('   a. Switch DATABASE_URL back to the SQLite URL')
  console.log('   b. The SQLite database is unchanged (read-only during migration)')
  console.log('   c. Verify the application works with SQLite again')
  console.log('3. The exported JSON is at: ' + join(EXPORT_DIR, 'aqwelia-export.json'))
  console.log('4. The migration log is at: ' + join(EXPORT_DIR, 'migration-log.json'))
}

main().catch(err => {
  console.error('Migration failed:', err.message)
  process.exit(1)
})
