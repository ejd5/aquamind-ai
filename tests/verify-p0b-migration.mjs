import { DatabaseSync } from 'node:sqlite'

const [path, mode] = process.argv.slice(2)
const db = new DatabaseSync(path)
const columns = db.prepare('PRAGMA table_info("BillingEvent")').all().map(column => column.name)
for (const name of ['ignoredReason','attemptCount','processingStartedAt','processingToken','nextRetryAt']) {
  if (!columns.includes(name)) throw new Error(`BillingEvent.${name} missing`)
}
const indexes = db.prepare('PRAGMA index_list("BillingEvent")').all().map(index => index.name)
if (!indexes.includes('BillingEvent_source_eventId_key')) throw new Error('Composite event uniqueness missing')
if (mode !== '--fresh') {
  const rows = Object.fromEntries(db.prepare('SELECT id,status,active FROM Subscription').all().map(row => [row.id,row]))
  if (rows.legacy_future?.status !== 'active' || rows.legacy_future?.active !== 1) throw new Error('Future active backfill failed')
  if (rows.legacy_past?.status !== 'expired' || rows.legacy_past?.active !== 0) throw new Error('Past active backfill failed')
  if (rows.legacy_inactive?.status !== 'inactive') throw new Error('Inactive backfill failed')
}
db.close()
console.log('P0-B migration and legacy backfill verified')
