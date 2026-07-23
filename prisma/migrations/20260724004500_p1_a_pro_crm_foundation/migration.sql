-- AlterTable
ALTER TABLE "ProClient" ADD COLUMN "companyName" TEXT;
ALTER TABLE "ProClient" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'active';
ALTER TABLE "ProClient" ADD COLUMN "source" TEXT;
ALTER TABLE "ProClient" ADD COLUMN "preferredContact" TEXT NOT NULL DEFAULT 'email';
ALTER TABLE "ProClient" ADD COLUMN "tags" TEXT;
ALTER TABLE "ProClient" ADD COLUMN "lastContactAt" DATETIME;
ALTER TABLE "ProClient" ADD COLUMN "nextFollowUpAt" DATETIME;

-- AlterTable
ALTER TABLE "ProPool" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'active';
ALTER TABLE "ProPool" ADD COLUMN "brand" TEXT;
ALTER TABLE "ProPool" ADD COLUMN "model" TEXT;
ALTER TABLE "ProPool" ADD COLUMN "serialNumber" TEXT;
ALTER TABLE "ProPool" ADD COLUMN "installedAt" DATETIME;
ALTER TABLE "ProPool" ADD COLUMN "accessInstructions" TEXT;
ALTER TABLE "ProPool" ADD COLUMN "equipmentNotes" TEXT;
ALTER TABLE "ProPool" ADD COLUMN "lastServiceAt" DATETIME;
ALTER TABLE "ProPool" ADD COLUMN "nextServiceAt" DATETIME;

-- AlterTable
ALTER TABLE "ProIntervention" ADD COLUMN "priority" TEXT NOT NULL DEFAULT 'normal';
ALTER TABLE "ProIntervention" ADD COLUMN "startedAt" DATETIME;
ALTER TABLE "ProIntervention" ADD COLUMN "summary" TEXT;
ALTER TABLE "ProIntervention" ADD COLUMN "customerNotes" TEXT;
ALTER TABLE "ProIntervention" ADD COLUMN "internalNotes" TEXT;
ALTER TABLE "ProIntervention" ADD COLUMN "billable" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "ProIntervention" ADD COLUMN "amount" REAL;
ALTER TABLE "ProIntervention" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'EUR';

-- CreateTable
CREATE TABLE "ProClientActivity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "proClientId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "type" TEXT NOT NULL DEFAULT 'note',
    "title" TEXT NOT NULL,
    "details" TEXT,
    "occurredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProClientActivity_proClientId_fkey" FOREIGN KEY ("proClientId") REFERENCES "ProClient" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "ProClient_status_idx" ON "ProClient"("status");
CREATE INDEX "ProClient_nextFollowUpAt_idx" ON "ProClient"("nextFollowUpAt");
CREATE INDEX "ProPool_status_idx" ON "ProPool"("status");
CREATE INDEX "ProPool_nextServiceAt_idx" ON "ProPool"("nextServiceAt");
CREATE INDEX "ProIntervention_priority_idx" ON "ProIntervention"("priority");
CREATE INDEX "ProClientActivity_proClientId_occurredAt_idx" ON "ProClientActivity"("proClientId", "occurredAt");
CREATE INDEX "ProClientActivity_type_idx" ON "ProClientActivity"("type");
