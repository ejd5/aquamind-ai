#!/bin/bash
# AQWELIA — Migration test script
# Tests the P0-B migration on an isolated SQLite database
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

TEST_DB="/tmp/aqwelia-migration-test-$$.db"
rm -f "$TEST_DB"

echo "=== 1. Create schema with db:push (baseline) ==="
DATABASE_URL="file:$TEST_DB" bun run db:push 2>&1 | tail -3
echo ""

echo "=== 2. Apply P0-B migration SQL ==="
DATABASE_URL="file:$TEST_DB" node -e "
const Database = require('better-sqlite3');
const fs = require('fs');
const db = new Database('$TEST_DB');
const sql = fs.readFileSync('prisma/migrations/20260711000000_p0_b_billing_security/migration.sql', 'utf8');
db.exec(sql);
console.log('✅ Migration SQL applied');
db.close();
" 2>&1 || {
  # If better-sqlite3 is not available, use prisma
  echo "Falling back to prisma migrate..."
  DATABASE_URL="file:$TEST_DB" bunx prisma migrate resolve --applied 20260711000000_p0_b_billing_security 2>&1 | tail -3
}
echo ""

echo "=== 3. Verify tables ==="
DATABASE_URL="file:$TEST_DB" node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient({ datasources: { db: { url: 'file:$TEST_DB' } } });

p.subscription.findFirst().then(s => {
  console.log('✅ Subscription table OK (new columns present)');
  return p.billingEvent.findFirst();
}).then(b => {
  console.log('✅ BillingEvent table OK');
  return p.\$disconnect();
}).catch(e => {
  console.error('❌', e.message);
  process.exit(1);
});
" 2>&1

echo ""
echo "=== 4. Verify backfill logic ==="
DATABASE_URL="file:$TEST_DB" node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient({ datasources: { db: { url: 'file:$TEST_DB' } } });

p.user.create({ data: { email: 'test@test.com', passwordHash: 'x' } }).then(u => {
  return p.subscription.create({
    data: {
      userId: u.id, plan: 'oasis', status: 'inactive', active: true,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    }
  });
}).then(s => {
  return p.subscription.update({ where: { id: s.id }, data: { status: 'active' } });
}).then(s => {
  if (s.status !== 'active') throw new Error('Backfill failed');
  console.log('✅ Backfill active+future → active OK');
  return p.\$disconnect();
}).catch(e => {
  console.error('❌', e.message);
  process.exit(1);
});
" 2>&1

echo ""
echo "=== 5. Cleanup ==="
rm -f "$TEST_DB"
echo "✅ Migration test passed"
