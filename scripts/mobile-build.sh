#!/bin/bash
# AQWELIA — Mobile build script
# Builds a static export for Capacitor (iOS/Android), excluding API routes
# (the mobile app calls the remote backend via NEXT_PUBLIC_API_BASE_URL).
#
# Next.js `output: export` cannot include API routes (they need a server).
# This script temporarily renames `src/app/api` → `src/app/_api` (underscore
# prefix = ignored by Next.js App Router), runs the build, then restores it.

set -e
cd "$(dirname "$0")/.."

API_DIR="src/app/api"
API_DIR_HIDDEN="src/app/_api"

echo "📦 AQWELIA mobile build — static export for Capacitor"
echo ""

# Step 1: Temporarily hide API routes
if [ -d "$API_DIR" ]; then
  echo "1/4  Hiding API routes (not compatible with static export)..."
  mv "$API_DIR" "$API_DIR_HIDDEN"
  HIDDEN=1
else
  HIDDEN=0
fi

# Cleanup function to restore API routes on exit/error
cleanup() {
  if [ "$HIDDEN" = "1" ] && [ -d "$API_DIR_HIDDEN" ]; then
    echo ""
    echo "3/4  Restoring API routes..."
    mv "$API_DIR_HIDDEN" "$API_DIR"
  fi
}
trap cleanup EXIT

# Step 2: Run the static export build
echo "2/4  Building static export (MOBILE_BUILD=true next build)..."
MOBILE_BUILD=true bunx next build

# Step 3 (in cleanup trap): Restore API routes

# Step 4: Verify output
echo "4/4  Verifying output..."
if [ -d "out" ]; then
  FILE_COUNT=$(find out -type f | wc -l)
  SIZE=$(du -sh out | cut -f1)
  echo "✅ Build successful: out/ ($FILE_COUNT files, $SIZE)"
  echo ""
  echo "Next steps:"
  echo "  bun run mobile:sync      # Sync to Capacitor"
  echo "  bun run mobile:android   # Open in Android Studio"
  echo "  bun run mobile:ios       # Open in Xcode (Mac required)"
else
  echo "❌ Build failed: out/ directory not created"
  exit 1
fi
