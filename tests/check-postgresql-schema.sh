#!/bin/bash
# Validates that the PostgreSQL migration history (baseline + incremental
# migrations) is consistent with the canonical schema.
#
# Strategy:
#   - If a real PostgreSQL server is reachable (CI staging, local dev),
#     use `migrate diff --from-migrations --to-schema-datamodel` with a
#     shadow database. An empty diff proves the migrations produce the
#     exact schema the datamodel specifies.
#   - If no PostgreSQL is reachable (P0 Quality on ubuntu-latest has no
#     postgres service), fall back to a structural check: verify that
#     all migration files are well-formed and that the schema is valid.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
MIGRATIONS_DIR="$PROJECT_ROOT/prisma/postgresql/migrations"
PRISMA_BIN="${PRISMA_BIN:-./node_modules/.bin/prisma}"

cd "$PROJECT_ROOT"

# ── 1. Sync and validate the PostgreSQL schema datamodel ────────────────────
export DATABASE_URL="${POSTGRES_TEST_DATABASE_URL:-postgresql://aqwelia:aqwelia@127.0.0.1:5432/aqwelia_schema_check}"
node scripts/sync-postgresql-schema.mjs
"$PRISMA_BIN" validate --schema prisma/postgresql/schema.prisma

# ── 2. Structural checks (always run) ──────────────────────────────────────
if [ ! -f "$MIGRATIONS_DIR/20260712000000_baseline/migration.sql" ]; then
  echo "Baseline migration missing: 20260712000000_baseline" >&2
  exit 1
fi
for dir in $(ls -1 "$MIGRATIONS_DIR" | grep -E '^[0-9]{14}_'); do
  if [ ! -f "$MIGRATIONS_DIR/$dir/migration.sql" ]; then
    echo "Empty migration directory: $dir" >&2
    exit 1
  fi
done

# ── 3. Probe PostgreSQL availability ────────────────────────────────────────
# Quick port check: try to open a TCP connection to the PostgreSQL port
# with a 2-second timeout. No external tools needed.
PG_HOST="${PGHOST:-127.0.0.1}"
PG_PORT="${PGPORT:-5432}"
PG_AVAILABLE=0

# Use bash /dev/tcp if available, else fall back to nc.
if (echo > /dev/tcp/"$PG_HOST"/"$PG_PORT") 2>/dev/null; then
  PG_AVAILABLE=1
fi

# ── 4. Full validation with shadow database (if PostgreSQL available) ───────
if [ "$PG_AVAILABLE" -eq 1 ]; then

  DIFF_OUTPUT="/tmp/aqwelia-postgresql-migration-diff-$$.sql"
  cleanup() { rm -f "$DIFF_OUTPUT"; }
  trap cleanup EXIT INT TERM

  "$PRISMA_BIN" migrate diff \
    --from-migrations "$MIGRATIONS_DIR" \
    --shadow-database-url "${SHADOW_DATABASE_URL:-$DATABASE_URL}" \
    --to-schema-datamodel prisma/postgresql/schema.prisma \
    --script \
    --output "$DIFF_OUTPUT"

  if [ -s "$DIFF_OUTPUT" ]; then
    echo "PostgreSQL migration history does not match the schema." >&2
    echo "Missing migration (or stale baseline) detected. Diff:" >&2
    cat "$DIFF_OUTPUT" >&2
    exit 1
  fi

  echo "PostgreSQL schema and migration history are synchronized (shadow-db validated)"

else
  # No PostgreSQL — structural validation only. Full validation runs in
  # the postgresql-staging.yml workflow which has a PostgreSQL service.
  echo "PostgreSQL schema validated (structural only — shadow-db not available)"

fi
