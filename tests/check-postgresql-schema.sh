#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
EXPECTED="$PROJECT_ROOT/prisma/postgresql/migrations/20260712000000_baseline/migration.sql"
GENERATED="/tmp/aqwelia-postgresql-baseline-$$.sql"
PRISMA_BIN="${PRISMA_BIN:-./node_modules/.bin/prisma}"

cleanup() { rm -f "$GENERATED"; }
trap cleanup EXIT INT TERM

cd "$PROJECT_ROOT"
export DATABASE_URL="${POSTGRES_TEST_DATABASE_URL:-postgresql://aqwelia:aqwelia@127.0.0.1:5432/aqwelia_schema_check}"
node scripts/sync-postgresql-schema.mjs
"$PRISMA_BIN" validate --schema prisma/postgresql/schema.prisma
"$PRISMA_BIN" migrate diff \
  --from-empty \
  --to-schema-datamodel prisma/postgresql/schema.prisma \
  --script \
  --output "$GENERATED"

if ! cmp -s "$EXPECTED" "$GENERATED"; then
  echo "PostgreSQL baseline differs from the generated schema." >&2
  echo "Regenerate and review the migration before committing." >&2
  exit 1
fi

echo "PostgreSQL schema and baseline migration are synchronized"
