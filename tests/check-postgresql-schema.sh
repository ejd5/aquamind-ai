#!/bin/bash
# Validates that the PostgreSQL migration history is well-formed and the
# schema datamodel is valid.
#
# Full migration-apply validation (baseline + incremental migrations
# produce the expected schema) is handled by the migration scenario test
# in postgresql-staging.yml. This script focuses on structural correctness
# that can run in any environment (P0 Quality has no PostgreSQL).
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

# ── 2. Structural checks ───────────────────────────────────────────────────
# Verify the baseline migration exists.
if [ ! -f "$MIGRATIONS_DIR/20260712000000_baseline/migration.sql" ]; then
  echo "Baseline migration missing: 20260712000000_baseline" >&2
  exit 1
fi

# Verify every timestamped migration directory has a migration.sql.
for dir in $(ls -1 "$MIGRATIONS_DIR" | grep -E '^[0-9]{14}_'); do
  if [ ! -f "$MIGRATIONS_DIR/$dir/migration.sql" ]; then
    echo "Empty migration directory: $dir" >&2
    exit 1
  fi
done

# Verify the migration_lock.toml is present.
if [ ! -f "$MIGRATIONS_DIR/migration_lock.toml" ]; then
  echo "migration_lock.toml missing" >&2
  exit 1
fi

echo "PostgreSQL migration structure validated: schema datamodel valid, all migration files present"
