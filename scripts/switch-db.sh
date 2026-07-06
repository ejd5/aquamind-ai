#!/bin/bash
# Switch Prisma provider between postgresql (prod) and sqlite (dev sandbox)
# Usage: ./scripts/switch-db.sh postgres|sqlite
set -e
SCHEMA="prisma/schema.prisma"
MODE="${1:-postgres}"
if [ "$MODE" = "sqlite" ]; then
  sed -i 's/provider = "postgresql"/provider = "sqlite"/' "$SCHEMA"
  echo "✅ Schema switched to SQLite (dev mode)"
elif [ "$MODE" = "postgres" ]; then
  sed -i 's/provider = "sqlite"/provider = "postgresql"/' "$SCHEMA"
  echo "✅ Schema switched to PostgreSQL (prod mode)"
else
  echo "Usage: $0 postgres|sqlite"
  exit 1
fi
