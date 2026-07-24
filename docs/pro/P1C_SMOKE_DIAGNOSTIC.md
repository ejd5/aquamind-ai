# P1-C smoke diagnostic

```text
39:Database error:

--- LAST 180 LINES ---
=== 1. Verify P0-B migration ===
(node:2374) ExperimentalWarning: SQLite is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
Prisma schema loaded from prisma/schema.prisma
Datasource "db": SQLite database "aqwelia-p0b-migration-2370.db" at "file:/tmp/aqwelia-p0b-migration-2370.db"

Migration 20260710000000_baseline marked as applied.
┌─────────────────────────────────────────────────────────┐
│  Update available 6.19.2 -> 7.9.0                       │
│                                                         │
│  This is a major update - please follow the guide at    │
│  https://pris.ly/d/major-version-upgrade                │
│                                                         │
│  Run the following to update                            │
│    npm i --save-dev prisma@latest                       │
│    npm i @prisma/client@latest                          │
└─────────────────────────────────────────────────────────┘

Prisma schema loaded from prisma/schema.prisma
Datasource "db": SQLite database "aqwelia-p0b-migration-2370.db" at "file:/tmp/aqwelia-p0b-migration-2370.db"

8 migrations found in prisma/migrations

Applying migration `20260711000000_p0_b_billing_security`
Applying migration `20260719090000_aqwelia_brain_foundation`
Applying migration `20260722090000_aqwelia_brain_index_parity`
Applying migration `20260723223000_p0_d_offline_idempotency`
Applying migration `20260724004500_p1_a_pro_crm_foundation`
Applying migration `20260724014500_p1_b_team_dispatch`
Applying migration `20260725003000_p1_c_live_dispatch`
Error: P3018

A migration failed to apply. New migrations cannot be applied before the error is recovered from. Read more about how to resolve migration issues in a production database: https://pris.ly/d/migrate-resolve

Migration name: 20260725003000_p1_c_live_dispatch

Database error code: 1

Database error:
no such table: Organization



=== Cleanup ===
Cleanup done.

```
