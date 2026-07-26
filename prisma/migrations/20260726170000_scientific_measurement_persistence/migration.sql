-- P1 Scientific Quality — persist measurement provenance and manufacturer limits.
ALTER TABLE "PoolProfile" ADD COLUMN "manufacturerSaltMin" REAL;
ALTER TABLE "PoolProfile" ADD COLUMN "manufacturerSaltMax" REAL;
ALTER TABLE "PoolProfile" ADD COLUMN "manufacturerChlorineMax" REAL;

ALTER TABLE "WaterTest" ADD COLUMN "totalDissolvedSolids" REAL;
ALTER TABLE "WaterTest" ADD COLUMN "measuredAt" DATETIME;
ALTER TABLE "WaterTest" ADD COLUMN "measurementMethod" TEXT;
ALTER TABLE "WaterTest" ADD COLUMN "measurementMetadata" TEXT;
ALTER TABLE "WaterTest" ADD COLUMN "scientificQualityScore" REAL;
ALTER TABLE "WaterTest" ADD COLUMN "scientificMethodVersion" TEXT;
ALTER TABLE "WaterTest" ADD COLUMN "scientificLimitations" TEXT;
ALTER TABLE "WaterTest" ADD COLUMN "lsiMethodVersion" TEXT;

ALTER TABLE "ActionPlan" ADD COLUMN "scientificMethodVersion" TEXT;
ALTER TABLE "ActionPlan" ADD COLUMN "dosageMethodVersion" TEXT;
ALTER TABLE "ActionPlan" ADD COLUMN "swimSafetyMethodVersion" TEXT;
