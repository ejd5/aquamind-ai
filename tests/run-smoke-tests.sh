#!/bin/bash
# AQWELIA — Reproducible smoke test runner (P0-A, portable)
#
# This script:
#   1. Determines PROJECT_ROOT from BASH_SOURCE (no hardcoded paths)
#   2. Prepares an isolated test database (SQLite file in /tmp)
#   3. Starts the dev server on a configurable port (default 3099)
#   4. Waits for the server to be ready
#   5. Runs the smoke tests
#   6. Stops the server cleanly (only SERVER_PID, never pkill)
#   7. Cleans up the test DB even if tests fail (trap cleanup)
#
# Usage:
#   bash tests/run-smoke-tests.sh
#   PORT=3100 bash tests/run-smoke-tests.sh
#
# Exit codes:
#   0 — all tests passed
#   1 — tests failed or server didn't start

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

# ── 3. Cleanup function (called on EXIT, INT, TERM) ──────────────────────────
cleanup() {
  local exit_code=$?
  echo ""
  echo "=== Cleanup ==="

  # Stop ONLY our server (never pkill — would kill other Next.js instances)
  if [ -n "$SERVER_PID" ] && kill -0 "$SERVER_PID" 2>/dev/null; then
    echo "Stopping server (PID $SERVER_PID)..."
    kill "$SERVER_PID" 2>/dev/null || true
    sleep 2
    # Force kill only if still alive
    if kill -0 "$SERVER_PID" 2>/dev/null; then
      kill -9 "$SERVER_PID" 2>/dev/null || true
    fi
  fi

  # Remove test DB
  if [ -f "$TEST_DB" ]; then
    rm -f "$TEST_DB" "$TEST_DB-journal" 2>/dev/null || true
  fi

  # Remove server log
  rm -f "$SERVER_LOG" 2>/dev/null || true

  echo "Cleanup done."
  exit $exit_code
}

trap cleanup EXIT INT TERM

# ── 4. Prepare isolated test DB ──────────────────────────────────────────────
echo "=== 1. Prepare isolated test DB ==="
echo "DB: $TEST_DB"

DATABASE_URL="$DB_URL" bun run db:push 2>&1 | tail -3

# Create test admin user
TEST_DB_URL="$DB_URL" node "$PROJECT_ROOT/tests/create-test-user.mjs" 2>&1 | tail -2

# ── 5. Start dev server on configurable port ─────────────────────────────────
echo ""
echo "=== 2. Start dev server on port $PORT ==="

DATABASE_URL="$DB_URL" \
NODE_OPTIONS="--max-old-space-size=1024" \
  node node_modules/.bin/next dev -p "$PORT" > "$SERVER_LOG" 2>&1 &
SERVER_PID=$!
echo "Server PID: $SERVER_PID"

# ── 6. Wait for server ready ─────────────────────────────────────────────────
echo ""
echo "=== 3. Wait for server ready ==="
for i in $(seq 1 60); do
  HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time 2 "${BASE_URL}/api/auth/csrf" 2>/dev/null || echo "000")
  if [ "$HTTP" = "200" ]; then
    echo "✅ Server ready (${i}s)"
    break
  fi
  if [ "$i" = "60" ]; then
    echo "❌ Server failed to start (60s timeout)"
    echo "=== Server log (last 20 lines) ==="
    tail -20 "$SERVER_LOG" 2>/dev/null
    exit 1
  fi
  sleep 1
done

# ── 7. Run smoke tests ───────────────────────────────────────────────────────
echo ""
echo "=== 4. Run smoke tests ==="
SMOKE_BASE_URL="$BASE_URL" bun run test 2>&1
TEST_EXIT=$?

# ── 8. Result ────────────────────────────────────────────────────────────────
echo ""
if [ $TEST_EXIT -eq 0 ]; then
  echo "✅ ALL SMOKE TESTS PASSED"
else
  echo "❌ SMOKE TESTS FAILED (exit code: $TEST_EXIT)"
fi

exit $TEST_EXIT
