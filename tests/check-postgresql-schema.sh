#!/bin/bash
# Validates that the PostgreSQL migration history is well-formed and the
# schema datamodel is valid.
#
# The historical baseline is immutable. New capabilities must be represented
# by timestamped incremental migrations, which are applied after the baseline
# by `prisma migrate deploy` in PostgreSQL staging validation.
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
BASELINE="$MIGRATIONS_DIR/20260712000000_baseline/migration.sql"
BRAIN_FOUNDATION="$MIGRATIONS_DIR/20260719090000_aqwelia_brain_foundation/migration.sql"
BRAIN_INDEXES="$MIGRATIONS_DIR/20260722090000_aqwelia_brain_index_parity/migration.sql"

for required in "$BASELINE" "$BRAIN_FOUNDATION" "$BRAIN_INDEXES"; do
  if [ ! -f "$required" ]; then
    echo "Required PostgreSQL migration missing: $required" >&2
    exit 1
  fi
done

# Verify every timestamped migration directory has a migration.sql.
for dir in $(ls -1 "$MIGRATIONS_DIR" | grep -E '^[0-9]{14}_'); do
  if [ ! -f "$MIGRATIONS_DIR/$dir/migration.sql" ]; then
    echo "Empty migration directory: $dir" >&2
    exit 1
  fi
done

# Brain tables and pool relations belong in the incremental migration, not in
# the already-deployed baseline. This proves the deploy chain contains them.
for table in \
  RecommendationExecution \
  RecommendationOutcome \
  BrainFeedback \
  KnowledgeArticle \
  KnowledgeRevision \
  BrainEventOutbox; do
  if ! grep -Fq "CREATE TABLE \"$table\"" "$BRAIN_FOUNDATION"; then
    echo "Brain foundation migration does not create $table" >&2
    exit 1
  fi
done

for relation in WaterTest PhotoDiagnostic; do
  if ! grep -Fq "ALTER TABLE \"$relation\" ADD COLUMN \"poolId\"" "$BRAIN_FOUNDATION"; then
    echo "Brain foundation migration does not add $relation.poolId" >&2
    exit 1
  fi
done

for index in \
  RecommendationExecution_userId_idx \
  RecommendationOutcome_poolId_createdAt_idx \
  BrainFeedback_status_createdAt_idx \
  KnowledgeArticle_status_audience_idx \
  BrainEventOutbox_type_createdAt_idx; do
  if ! grep -Fq "\"$index\"" "$BRAIN_INDEXES"; then
    echo "Brain index migration is missing $index" >&2
    exit 1
  fi
done

# Verify the migration_lock.toml is present.
if [ ! -f "$MIGRATIONS_DIR/migration_lock.toml" ]; then
  echo "migration_lock.toml missing" >&2
  exit 1
fi

echo "PostgreSQL migration structure validated: immutable baseline plus Brain incremental migrations"
