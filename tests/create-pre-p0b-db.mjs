import { DatabaseSync } from 'node:sqlite'

const path = process.argv[2]
if (!path) throw new Error('Database path required')

const db = new DatabaseSync(path)
db.exec(`
  CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "duration" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME,
    "provider" TEXT,
    "externalId" TEXT
  );
  CREATE INDEX "Subscription_userId_idx" ON "Subscription"("userId");

  -- This fixture represents the pre-P0-B baseline while remaining intentionally
  -- minimal. Later migrations alter these baseline tables, so they must exist
  -- even when the legacy scenario only asserts billing data.
  CREATE TABLE "WaterTest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE "PhotoDiagnostic" (
    "id" TEXT NOT NULL PRIMARY KEY
  );

  -- P1-A upgrades the original AQWELIA Pro MVP tables. The legacy fixture keeps
  -- their pre-CRM shape so the migration test proves that existing Pro records
  -- are upgraded in place rather than recreated or discarded.
  CREATE TABLE "ProClient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "proUserId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "zipCode" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
  );
  CREATE INDEX "ProClient_proUserId_idx" ON "ProClient"("proUserId");
  CREATE INDEX "ProClient_lastName_idx" ON "ProClient"("lastName");
  CREATE INDEX "ProClient_firstName_idx" ON "ProClient"("firstName");

  CREATE TABLE "ProPool" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "proClientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'pool',
    "volume" REAL,
    "unit" TEXT NOT NULL DEFAULT 'm3',
    "shape" TEXT,
    "surface" TEXT,
    "treatmentType" TEXT,
    "saltSystem" BOOLEAN NOT NULL DEFAULT false,
    "filterType" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
  );
  CREATE INDEX "ProPool_proClientId_idx" ON "ProPool"("proClientId");

  CREATE TABLE "ProIntervention" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "proClientId" TEXT NOT NULL,
    "proPoolId" TEXT,
    "technicianId" TEXT,
    "type" TEXT NOT NULL DEFAULT 'maintenance',
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "scheduledAt" DATETIME NOT NULL,
    "completedAt" DATETIME,
    "duration" INTEGER,
    "notes" TEXT,
    "photos" TEXT,
    "actions" TEXT,
    "productsUsed" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
  );
  CREATE INDEX "ProIntervention_proClientId_idx" ON "ProIntervention"("proClientId");
  CREATE INDEX "ProIntervention_proPoolId_idx" ON "ProIntervention"("proPoolId");
  CREATE INDEX "ProIntervention_status_idx" ON "ProIntervention"("status");
  CREATE INDEX "ProIntervention_scheduledAt_idx" ON "ProIntervention"("scheduledAt");
  CREATE INDEX "ProIntervention_technicianId_idx" ON "ProIntervention"("technicianId");
`)

const insert = db.prepare(
  'INSERT INTO Subscription (id,userId,plan,active,expiresAt) VALUES (?,?,?,?,?)'
)
insert.run(
  'legacy_future',
  'u1',
  'oasis',
  1,
  new Date(Date.now() + 86400000).toISOString()
)
insert.run(
  'legacy_past',
  'u2',
  'wellness',
  1,
  new Date(Date.now() - 86400000).toISOString()
)
insert.run('legacy_inactive', 'u3', 'decouverte', 0, null)

db.close()
