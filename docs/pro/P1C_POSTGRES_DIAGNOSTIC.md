# P1-C PostgreSQL diagnostic

```text
═══════════════════════════════════════════════════════
  AQWELIA — PostgreSQL Migration Scenario Tests
═══════════════════════════════════════════════════════
Database: postgresql://***:***@127.0.0.1:5432/aqwelia_ci

═══ Scenario A — Empty database ═══
  Created: aqwelia_test_a_1fc3bdcc
  Deploying all migrations...
    ✓ migrate deploy succeeds on empty database
    ✓ consentAt column exists — expected 1, got 1
    ✓ consentAt is nullable — expected "YES", got "YES"
    ✓ baseline present
    ✓ consentAt migration present
    ✓ Brain foundation migration present
    ✓ Brain index migration present
    ✓ lead with consentAt round-trips
    ✓ lead without consentAt = null — expected null, got null
  Dropped: aqwelia_test_a_1fc3bdcc

═══ Scenario B — Existing database upgrade ═══
  Created: aqwelia_test_b_b99cc9ea
  Step 1: Deploying baseline only...
    ✓ baseline deploy succeeds
  Step 2: Creating pre-migration data...
  Dropped: aqwelia_test_b_b99cc9ea

FATAL: 
Invalid `prisma.organization.create()` invocation:


The column `locationTrackingEnabled` does not exist in the current database.
PrismaClientKnownRequestError: 
Invalid `prisma.organization.create()` invocation:


The column `locationTrackingEnabled` does not exist in the current database.
    at ei.handleRequestError (/home/runner/work/aquamind-ai/aquamind-ai/generated/client-postgresql/runtime/library.js:125:7268)
    at ei.handleAndLogRequestError (/home/runner/work/aquamind-ai/aquamind-ai/generated/client-postgresql/runtime/library.js:125:6593)
    at ei.request (/home/runner/work/aquamind-ai/aquamind-ai/generated/client-postgresql/runtime/library.js:125:6300)
    at async a (/home/runner/work/aquamind-ai/aquamind-ai/generated/client-postgresql/runtime/library.js:134:9551)
    at async scenarioB (file:///home/runner/work/aquamind-ai/aquamind-ai/tests/test-consent-migration.mjs:168:19)
    at async file:///home/runner/work/aquamind-ai/aquamind-ai/tests/test-consent-migration.mjs:257:3

═══════════════════════════════════════════════════════
  Results: 10 passed, 1 failed
═══════════════════════════════════════════════════════

```
