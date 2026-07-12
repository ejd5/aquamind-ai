#!/bin/bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT="${PORT:-3101}"
SERVER_LOG="/tmp/aqwelia-postgresql-runtime-$$.log"
HEALTH_JSON="/tmp/aqwelia-postgresql-health-$$.json"
SERVER_PID=""

cleanup() {
  local code=$?
  if [ -n "$SERVER_PID" ] && kill -0 "$SERVER_PID" 2>/dev/null; then kill "$SERVER_PID" 2>/dev/null || true; fi
  rm -f "$SERVER_LOG" "$HEALTH_JSON"
  exit "$code"
}
trap cleanup EXIT INT TERM

cd "$PROJECT_ROOT"
: "${DATABASE_URL:?DATABASE_URL is required}"
export DATABASE_PROVIDER=postgresql
export NODE_ENV=production
export NEXTAUTH_SECRET="${NEXTAUTH_SECRET:-postgres-runtime-ci-secret}"
export NEXTAUTH_URL="http://127.0.0.1:${PORT}"

bun run build
PORT="$PORT" HOSTNAME=127.0.0.1 node .next/standalone/server.js >"$SERVER_LOG" 2>&1 &
SERVER_PID=$!

for i in $(seq 1 60); do
  status="$(curl -sS -o "$HEALTH_JSON" -w '%{http_code}' --max-time 3 "http://127.0.0.1:${PORT}/api/health" || true)"
  if [ "$status" = "200" ]; then break; fi
  if [ "$i" = "60" ]; then tail -50 "$SERVER_LOG" >&2; exit 1; fi
  sleep 1
done

node -e "const h=require(process.argv[1]); if(h.status==='down'||h.checks?.database===false) process.exit(1)" "$HEALTH_JSON"
test "$(curl -sS -o /dev/null -w '%{http_code}' "http://127.0.0.1:${PORT}/api/auth/csrf")" = "200"
test "$(curl -sS -o /dev/null -w '%{http_code}' "http://127.0.0.1:${PORT}/auth/signin")" = "200"
echo "AQWELIA runtime passed PostgreSQL production smoke tests"
