#!/bin/bash
# AQWELIA — Reproducible smoke test runner (P0-A, portable)
#
# CRITICAL: This script NEVER reads, copies, modifies, or restores the user's .env.
# All env vars are passed directly to the commands via the shell environment.
#
set -euo pipefail

# ── 1. Determine PROJECT_ROOT ────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

# ── 2. Config ────────────────────────────────────────────────────────────────
PORT="${PORT:-3099}"
BASE_URL="http://localhost:${PORT}"
TEST_DB="/tmp/aqwelia-test-$$-$(date +%s).db"
DB_URL="file:${TEST_DB}"
SERVER_PID=""
SERVER_LOG="/tmp/aqwelia-test-server-$$.log"

# Test env vars (passed directly to commands — NEVER written to .env)
export DATABASE_URL="$DB_URL"
export NEXTAUTH_SECRET="test-secret-for-ci-only-do-not-use-in-production"
export NEXTAUTH_URL="$BASE_URL"
export AUTH_TRUST_HOST="true"
export REVENUECAT_WEBHOOK_SECRET="rc_wh_test_ci_only"
export STRIPE_SECRET_KEY="sk_test_ci_placeholder"
export STRIPE_WEBHOOK_SECRET="whsec_test_ci_placeholder"
export STRIPE_PRICE_OASIS_MONTHLY="price_oasis_monthly_ci"

# ── 3. Cleanup function ──────────────────────────────────────────────────────
cleanup() {
  local exit_code=$?
  echo ""
  echo "=== Cleanup ==="
  if [ -n "$SERVER_PID" ] && kill -0 "$SERVER_PID" 2>/dev/null; then
    echo "Stopping server (PID $SERVER_PID)..."
    kill "$SERVER_PID" 2>/dev/null || true
    sleep 2
    if kill -0 "$SERVER_PID" 2>/dev/null; then
      kill -9 "$SERVER_PID" 2>/dev/null || true
    fi
  fi
  rm -f "$TEST_DB" "$TEST_DB-journal" "$SERVER_LOG" 2>/dev/null || true
  echo "Cleanup done."
  exit $exit_code
}

trap cleanup EXIT INT TERM

# ── 4. Verify migration on legacy and fresh databases ──────────────────────
echo "=== 1. Verify P0-B migration ==="
bash "$PROJECT_ROOT/tests/run-billing-migration-test.sh"

# ── 5. Push schema to test DB ────────────────────────────────────────────────
echo "=== 2. Push schema to test DB ==="
echo "DB: $TEST_DB"
touch "$TEST_DB"
bun run db:push 2>&1 | tail -3
bun run db:pg:generate 2>&1 | tail -3

# ── 5. Create test user ──────────────────────────────────────────────────────
echo ""
echo "=== 3. Create test user ==="
node "$PROJECT_ROOT/tests/create-test-user.mjs" 2>&1 | tail -2

# ── 6. Start dev server ──────────────────────────────────────────────────────
echo ""
echo "=== 4. Start dev server on port $PORT ==="
NODE_OPTIONS="--max-old-space-size=1024" \
  node node_modules/.bin/next dev -H 127.0.0.1 -p "$PORT" > "$SERVER_LOG" 2>&1 &
SERVER_PID=$!
echo "Server PID: $SERVER_PID"

# ── 7. Wait for server ready ─────────────────────────────────────────────────
echo ""
echo "=== 5. Wait for server ready ==="
for i in $(seq 1 60); do
  HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time 2 "${BASE_URL}/api/auth/csrf" 2>/dev/null || echo "000")
  if [ "$HTTP" = "200" ]; then
    echo "✅ Server ready (${i}s)"
    break
  fi
  if [ "$i" = "60" ]; then
    echo "❌ Server failed to start (60s timeout)"
    tail -20 "$SERVER_LOG" 2>/dev/null
    exit 1
  fi
  sleep 1
done

# ── 8. Run smoke tests ───────────────────────────────────────────────────────
echo ""
echo "=== 6. Run smoke tests ==="
SMOKE_BASE_URL="$BASE_URL" bun run test 2>&1
TEST_EXIT=$?

echo ""
if [ $TEST_EXIT -eq 0 ]; then
  echo "✅ ALL SMOKE TESTS PASSED"
else
  echo "❌ SMOKE TESTS FAILED (exit code: $TEST_EXIT)"
fi

exit $TEST_EXIT
