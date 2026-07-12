#!/usr/bin/env node
import { PrismaClient as SqlitePrismaClient } from '@prisma/client'
import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const args = new Set(process.argv.slice(2))
const execute = args.has('--execute')
const confirm = args.has('--confirm')
const sqliteUrl = process.env.SQLITE_URL || 'file:./db/custom.db'
const postgresUrl = process.env.POSTGRES_URL || ''
const exportDir = resolve(process.env.EXPORT_DIR || '/tmp/aqwelia-migration-export')

const delegateName = model => model[0].toLowerCase() + model.slice(1)
const maskUrl = url => {
  try {
    const parsed = new URL(url)
    if (parsed.password) parsed.password = '********'
    return parsed.toString()
  } catch {
    return url ? '(invalid URL)' : '(not set)'
  }
}

function modelPlan(client) {
  const models = client._runtimeDataModel?.models
  if (!models) throw new Error('Unable to inspect Prisma runtime data model')

  const names = Object.keys(models)
  const dependencies = new Map(names.map(name => [name, new Set()]))
  const relations = []

  for (const [child, model] of Object.entries(models)) {
    for (const field of model.fields) {
      if (field.kind !== 'object' || !field.relationFromFields?.length) continue
      dependencies.get(child).add(field.type)
      for (const scalarField of field.relationFromFields) {
        relations.push({ child, parent: field.type, scalarField })
      }
    }
  }

  const ordered = []
  const remaining = new Set(names)
  while (remaining.size) {
    const ready = [...remaining].filter(name =>
      [...dependencies.get(name)].every(parent => !remaining.has(parent) || parent === name)
    ).sort()
    if (!ready.length) {
      throw new Error(`Cyclic or unresolved Prisma model dependencies: ${[...remaining].join(', ')}`)
    }
    for (const name of ready) {
      ordered.push(name)
      remaining.delete(name)
    }
  }
  return { ordered, relations }
}

function stableJson(data) {
  const sorted = {}
  for (const key of Object.keys(data).sort()) {
    sorted[key] = [...data[key]].sort((a, b) => String(a.id ?? '').localeCompare(String(b.id ?? '')))
  }
  return JSON.stringify(sorted, null, 2) + '\n'
}

async function loadPostgresClient() {
  const modulePath = resolve('generated/client-postgresql/index.js')
  const loaded = await import(pathToFileURL(modulePath).href)
  const PrismaClient = loaded.PrismaClient || loaded.default?.PrismaClient
  if (!PrismaClient) throw new Error('PostgreSQL Prisma client was not generated; run db:pg:generate')
  return PrismaClient
}

async function exportSqlite(sqlite, ordered) {
  const data = {}
  for (const model of ordered) {
    const delegate = delegateName(model)
    if (!sqlite[delegate]) throw new Error(`Missing SQLite Prisma delegate: ${delegate}`)
    data[model] = await sqlite[delegate].findMany()
  }
  const json = stableJson(data)
  const checksum = createHash('sha256').update(json).digest('hex')
  await mkdir(exportDir, { recursive: true, mode: 0o700 })
  await writeFile(resolve(exportDir, 'aqwelia-export.json'), json, { mode: 0o600 })
  return { data, checksum }
}

function assertNoOrphans(data, relations) {
  const ids = new Map(Object.entries(data).map(([model, rows]) => [model, new Set(rows.map(row => row.id))]))
  const orphans = []
  for (const relation of relations) {
    for (const row of data[relation.child]) {
      const value = row[relation.scalarField]
      if (value != null && !ids.get(relation.parent)?.has(value)) {
        orphans.push(`${relation.child}.${row.id}.${relation.scalarField} -> ${relation.parent}.${value}`)
      }
    }
  }
  if (orphans.length) throw new Error(`Orphaned relations detected:\n${orphans.slice(0, 20).join('\n')}`)
}

async function assertTargetEmpty(pg, ordered) {
  for (const model of ordered) {
    const count = await pg[delegateName(model)].count()
    if (count !== 0) throw new Error(`PostgreSQL target is not empty: ${model} contains ${count} row(s)`)
  }
}

async function importPostgres(pg, ordered, data, checksum) {
  const migrationEventId = `sqlite-${checksum}`
  const counts = {}

  await pg.$transaction(async tx => {
    await tx.billingEvent.create({
      data: {
        eventId: migrationEventId,
        source: 'data_migration',
        eventType: 'sqlite_to_postgresql',
        result: 'processing',
      },
    })

    for (const model of ordered) {
      if (model === 'BillingEvent') continue
      const rows = data[model]
      if (rows.length) await tx[delegateName(model)].createMany({ data: rows })
      counts[model] = await tx[delegateName(model)].count()
      if (counts[model] !== rows.length) {
        throw new Error(`Count mismatch for ${model}: expected ${rows.length}, received ${counts[model]}`)
      }
      if (process.env.MIGRATION_TEST_FAIL_AFTER_MODEL === model) {
        throw new Error(`Injected migration failure after ${model}`)
      }
    }

    const billingRows = data.BillingEvent || []
    if (billingRows.length) await tx.billingEvent.createMany({ data: billingRows })
    counts.BillingEvent = await tx.billingEvent.count({ where: { source: { not: 'data_migration' } } })
    if (counts.BillingEvent !== billingRows.length) throw new Error('Count mismatch for BillingEvent')

    await tx.billingEvent.update({
      where: { source_eventId: { source: 'data_migration', eventId: migrationEventId } },
      data: { result: 'processed', processedAt: new Date() },
    })
  })
  return counts
}

async function main() {
  if (execute && !confirm) throw new Error('--execute requires --confirm')
  if (execute && !postgresUrl.startsWith('postgresql://') && !postgresUrl.startsWith('postgres://')) {
    throw new Error('POSTGRES_URL must be a PostgreSQL URL')
  }

  console.log(`Mode: ${execute ? 'execute' : 'dry-run'}`)
  console.log(`SQLite: ${sqliteUrl}`)
  if (execute) console.log(`PostgreSQL: ${maskUrl(postgresUrl)}`)

  const sqlite = new SqlitePrismaClient({ datasources: { db: { url: sqliteUrl } } })
  try {
    const { ordered, relations } = modelPlan(sqlite)
    const { data, checksum } = await exportSqlite(sqlite, ordered)
    assertNoOrphans(data, relations)

    const sqliteCounts = Object.fromEntries(ordered.map(model => [model, data[model].length]))
    let postgresCounts = null
    if (execute) {
      const PgPrismaClient = await loadPostgresClient()
      const pg = new PgPrismaClient({ datasources: { db: { url: postgresUrl } } })
      try {
        const pgPlan = modelPlan(pg)
        if (pgPlan.ordered.join('|') !== ordered.join('|')) throw new Error('SQLite and PostgreSQL model plans differ')
        await assertTargetEmpty(pg, ordered)
        postgresCounts = await importPostgres(pg, ordered, data, checksum)
      } finally {
        await pg.$disconnect()
      }
    }

    const report = { mode: execute ? 'execute' : 'dry-run', checksum, sqliteCounts, postgresCounts }
    await writeFile(resolve(exportDir, 'migration-report.json'), JSON.stringify(report, null, 2) + '\n', { mode: 0o600 })
    console.log(`Export checksum: ${checksum}`)
    console.log(execute ? 'Migration completed and verified' : 'Dry run completed; PostgreSQL was not contacted')
  } finally {
    await sqlite.$disconnect()
  }
}

main().catch(error => {
  console.error(`Migration failed: ${error.message}`)
  process.exitCode = 1
})
