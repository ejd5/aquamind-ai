#!/bin/bash
# AQWELIA — Reproducible smoke test runner
#
# This script:
#   1. Prepares an isolated test database
#   2. Starts the dev server
#   3. Waits for the server to be ready
#   4. Runs the smoke tests
#   5. Stops the server cleanly
#   6. Returns exit code 1 on failure
#
# Usage: bash tests/run-smoke-tests.sh

set -e

cd /home/z/my-project

echo "=== 1. Prepare isolated test DB ==="
TEST_DB="/tmp/aqwelia-test-$(date +%s).db"
DB_URL="file:$TEST_DB"

# Push schema to the test DB
DATABASE_URL="$DB_URL" bun run db:push 2>&1 | tail -3

# Create test admin user
cat > /tmp/create-test-user.mjs << EOF
import crypto from 'crypto'
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient({ datasources: { db: { url: '$DB_URL' } } })
const salt = crypto.randomBytes(16).toString('hex')
const hash = crypto.scryptSync('test-password-2026', salt, 64).toString('hex')
await prisma.user.create({
  data: { email: 'test@aqwelia.app', passwordHash: salt + ':' + hash, name: 'Test User' }
})
console.log('✅ Test user created')
await prisma.\$disconnect()
EOF
DATABASE_URL="$DB_URL" node /tmp/create-test-user.mjs 2>&1 | tail -2
rm -f /tmp/create-test-user.mjs

echo ""
echo "=== 2. Start dev server (test DB) ==="
# Kill any existing server
pkill -9 -f "next dev" 2>/dev/null || true
sleep 2

# Start server with test DB
DATABASE_URL="$DB_URL" NODE_OPTIONS="--max-old-space-size=1024" \
  nohup node node_modules/.bin/next dev -p 3000 > /tmp/aqwelia-test-server.log 2>&1 &
SERVER_PID=$!
disown
echo "Server PID: $SERVER_PID"

echo ""
echo "=== 3. Wait for server ready ==="
for i in $(seq 1 60); do
  HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time 2 http://localhost:3000/api/auth/csrf 2>/dev/null)
  if [ "$HTTP" = "200" ]; then
    echo "✅ Server ready (${i}s)"
    break
  fi
  if [ "$i" = "60" ]; then
    echo "❌ Server failed to start"
    kill -9 $SERVER_PID 2>/dev/null
    exit 1
  fi
  sleep 1
done

echo ""
echo "=== 4. Run smoke tests ==="
SMOKE_BASE_URL="http://localhost:3000" bun run test 2>&1
TEST_EXIT=$?

echo ""
echo "=== 5. Stop server ==="
kill -9 $SERVER_PID 2>/dev/null || true
pkill -9 -f "next dev" 2>/dev/null || true

echo ""
echo "=== 6. Cleanup ==="
rm -f "$TEST_DB" /tmp/aqwelia-test-server.log

echo ""
if [ $TEST_EXIT -eq 0 ]; then
  echo "✅ ALL SMOKE TESTS PASSED"
else
  echo "❌ SMOKE TESTS FAILED (exit code: $TEST_EXIT)"
fi

exit $TEST_EXIT
