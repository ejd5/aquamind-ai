#!/bin/bash
# AQWELIA — Reproducible smoke test runner (P0-A, portable)
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
ENV_BACKUP=""

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
  if [ -n "$ENV_BACKUP" ] && [ -f "$ENV_BACKUP" ]; then
    mv "$ENV_BACKUP" "$PROJECT_ROOT/.env" 2>/dev/null || true
    echo ".env restored."
  fi
  rm -f "$TEST_DB" "$TEST_DB-journal" "$SERVER_LOG" 2>/dev/null || true
  echo "Cleanup done."
  exit $exit_code
}

trap cleanup EXIT INT TERM

# ── 4. Swap .env FIRST (before any DB operations) ────────────────────────────
echo "=== 1. Swap .env to test DB ==="
if [ -f "$PROJECT_ROOT/.env" ]; then
  ENV_BACKUP="/tmp/aqwelia-env-backup-$$.env"
  cp "$PROJECT_ROOT/.env" "$ENV_BACKUP"
  sed "s|^DATABASE_URL=.*|DATABASE_URL=${DB_URL}|" "$ENV_BACKUP" > "$PROJECT_ROOT/.env"
  echo ".env swapped to test DB: $DB_URL"
else
  echo "DATABASE_URL=${DB_URL}" > "$PROJECT_ROOT/.env"
  echo "NEXTAUTH_SECRET=test-secret-for-ci-only" >> "$PROJECT_ROOT/.env"
  echo "AUTH_TRUST_HOST=true" >> "$PROJECT_ROOT/.env"
fi

# ── 5. Push schema to test DB ────────────────────────────────────────────────
echo ""
echo "=== 2. Push schema to test DB ==="
bun run db:push 2>&1 | tail -3

# ── 6. Create test user ──────────────────────────────────────────────────────
echo ""
echo "=== 3. Create test user ==="
node "$PROJECT_ROOT/tests/create-test-user.mjs" 2>&1 | tail -2

# ── 7. Start dev server ──────────────────────────────────────────────────────
echo ""
echo "=== 4. Start dev server on port $PORT ==="
NODE_OPTIONS="--max-old-space-size=1024" \
  node node_modules/.bin/next dev -p "$PORT" > "$SERVER_LOG" 2>&1 &
SERVER_PID=$!
echo "Server PID: $SERVER_PID"

# ── 8. Wait for server ready ─────────────────────────────────────────────────
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

# ── 9. Run smoke tests ───────────────────────────────────────────────────────
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
