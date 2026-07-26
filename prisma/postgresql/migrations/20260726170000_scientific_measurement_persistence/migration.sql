-- P1 Scientific Quality — persist measurement provenance and manufacturer limits.
ALTER TABLE "PoolProfile" ADD COLUMN "manufacturerSaltMin" DOUBLE PRECISION;
ALTER TABLE "PoolProfile" ADD COLUMN "manufacturerSaltMax" DOUBLE PRECISION;
ALTER TABLE "PoolProfile" ADD COLUMN "manufacturerChlorineMax" DOUBLE PRECISION;

ALTER TABLE "WaterTest" ADD COLUMN "totalDissolvedSolids" DOUBLE PRECISION;
ALTER TABLE "WaterTest" ADD COLUMN "measuredAt" TIMESTAMP(3);
ALTER TABLE "WaterTest" ADD COLUMN "measurementMethod" TEXT;
ALTER TABLE "WaterTest" ADD COLUMN "measurementMetadata" TEXT;
ALTER TABLE "WaterTest" ADD COLUMN "scientificQualityScore" DOUBLE PRECISION;
ALTER TABLE "WaterTest" ADD COLUMN "scientificMethodVersion" TEXT;
ALTER TABLE "WaterTest" ADD COLUMN "scientificLimitations" TEXT;
ALTER TABLE "WaterTest" ADD COLUMN "lsiMethodVersion" TEXT;

ALTER TABLE "ActionPlan" ADD COLUMN "scientificMethodVersion" TEXT;
ALTER TABLE "ActionPlan" ADD COLUMN "dosageMethodVersion" TEXT;
ALTER TABLE "ActionPlan" ADD COLUMN "swimSafetyMethodVersion" TEXT;
