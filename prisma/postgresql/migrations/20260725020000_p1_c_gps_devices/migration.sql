-- P1-C — Vehicle GPS devices connected to Dispatch Live
ALTER TABLE "ProLocationPoint" ADD COLUMN "deviceId" TEXT;
ALTER TABLE "ProLocationPoint" ADD COLUMN "externalEventId" TEXT;

CREATE TABLE "ProTrackingDevice" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "assignedUserId" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'generic',
  "externalDeviceId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "vehicle" TEXT,
  "tokenHash" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "lastSeenAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProTrackingDevice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProTrackingDevice_tokenHash_key" ON "ProTrackingDevice"("tokenHash");
CREATE UNIQUE INDEX "ProTrackingDevice_organizationId_provider_externalDeviceId_key" ON "ProTrackingDevice"("organizationId", "provider", "externalDeviceId");
CREATE INDEX "ProTrackingDevice_organizationId_status_idx" ON "ProTrackingDevice"("organizationId", "status");
CREATE INDEX "ProTrackingDevice_assignedUserId_status_idx" ON "ProTrackingDevice"("assignedUserId", "status");
CREATE UNIQUE INDEX "ProLocationPoint_sessionId_externalEventId_key" ON "ProLocationPoint"("sessionId", "externalEventId");
CREATE INDEX "ProLocationPoint_deviceId_recordedAt_idx" ON "ProLocationPoint"("deviceId", "recordedAt");
