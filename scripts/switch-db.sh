#!/bin/bash
# Switch Prisma provider between postgresql (prod) and sqlite (dev sandbox)
# Usage: ./scripts/switch-db.sh postgres|sqlite
# Works on macOS (BSD sed) and Linux (GNU sed)
set -e
SCHEMA="prisma/schema.prisma"
MODE="${1:-postgres}"

# Detect OS for sed compatibility
if [[ "$OSTYPE" == "darwin"* ]]; then
  # macOS — BSD sed requires -i ''
  SED_INPLACE=(-i '')
else
  # Linux — GNU sed
  SED_INPLACE=(-i)
fi

if [ "$MODE" = "sqlite" ]; then
  sed "${SED_INPLACE[@]}" 's/provider = "postgresql"/provider = "sqlite"/' "$SCHEMA"
  echo "✅ Schema switched to SQLite (dev mode)"
elif [ "$MODE" = "postgres" ]; then
  sed "${SED_INPLACE[@]}" 's/provider = "sqlite"/provider = "postgresql"/' "$SCHEMA"
  echo "✅ Schema switched to PostgreSQL (prod mode)"
else
  echo "Usage: $0 postgres|sqlite"
  exit 1
fi
