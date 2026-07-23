-- AlterTable
ALTER TABLE "OrganizationMember" ADD COLUMN "dispatchEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "OrganizationMember" ADD COLUMN "skills" TEXT;
ALTER TABLE "OrganizationMember" ADD COLUMN "serviceZones" TEXT;
ALTER TABLE "OrganizationMember" ADD COLUMN "workingDays" TEXT;
ALTER TABLE "OrganizationMember" ADD COLUMN "dayStart" TEXT NOT NULL DEFAULT '08:00';
ALTER TABLE "OrganizationMember" ADD COLUMN "dayEnd" TEXT NOT NULL DEFAULT '18:00';
ALTER TABLE "OrganizationMember" ADD COLUMN "dailyCapacityMinutes" INTEGER NOT NULL DEFAULT 480;
ALTER TABLE "OrganizationMember" ADD COLUMN "dispatchColor" TEXT;
ALTER TABLE "OrganizationMember" ADD COLUMN "phone" TEXT;
ALTER TABLE "OrganizationMember" ADD COLUMN "vehicle" TEXT;

CREATE INDEX "OrganizationMember_organizationId_dispatchEnabled_idx"
ON "OrganizationMember"("organizationId", "dispatchEnabled");
