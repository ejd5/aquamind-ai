#!/bin/bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TEST_DB="/tmp/aqwelia-p0b-migration-$$.db"
FRESH_DB="/tmp/aqwelia-p0b-fresh-$$.db"
cleanup() { rm -f "$TEST_DB" "$TEST_DB-journal" "$FRESH_DB" "$FRESH_DB-journal" 2>/dev/null || true; }
trap cleanup EXIT INT TERM
cd "$PROJECT_ROOT"
node "$SCRIPT_DIR/create-pre-p0b-db.mjs" "$TEST_DB"
DATABASE_URL="file:$TEST_DB" bunx prisma migrate resolve --applied 20260710000000_baseline
DATABASE_URL="file:$TEST_DB" bunx prisma migrate deploy
node "$SCRIPT_DIR/verify-p0b-migration.mjs" "$TEST_DB"
touch "$FRESH_DB"
DATABASE_URL="file:$FRESH_DB" bunx prisma migrate deploy
node "$SCRIPT_DIR/verify-p0b-migration.mjs" "$FRESH_DB" --fresh
