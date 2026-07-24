-- P1-C — Dispatch Live, geolocation sessions and route coordinates
ALTER TABLE "Organization" ADD COLUMN "locationTrackingEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Organization" ADD COLUMN "locationRetentionDays" INTEGER NOT NULL DEFAULT 60;
ALTER TABLE "Organization" ADD COLUMN "locationNoticeVersion" TEXT NOT NULL DEFAULT '2026-07-dispatch-live-v1';

ALTER TABLE "OrganizationMember" ADD COLUMN "locationSharingEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "OrganizationMember" ADD COLUMN "locationSource" TEXT NOT NULL DEFAULT 'mobile';
ALTER TABLE "OrganizationMember" ADD COLUMN "locationNoticeVersion" TEXT;
ALTER TABLE "OrganizationMember" ADD COLUMN "locationNoticeAcknowledgedAt" DATETIME;

ALTER TABLE "ProClient" ADD COLUMN "latitude" REAL;
ALTER TABLE "ProClient" ADD COLUMN "longitude" REAL;
ALTER TABLE "ProClient" ADD COLUMN "geocodedAt" DATETIME;
ALTER TABLE "ProPool" ADD COLUMN "latitude" REAL;
ALTER TABLE "ProPool" ADD COLUMN "longitude" REAL;
ALTER TABLE "ProPool" ADD COLUMN "geocodedAt" DATETIME;
ALTER TABLE "ProIntervention" ADD COLUMN "routeOrder" INTEGER;

CREATE TABLE "ProTrackingSession" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'mobile',
  "status" TEXT NOT NULL DEFAULT 'active',
  "purpose" TEXT NOT NULL DEFAULT 'dispatch_and_emergency_reassignment',
  "noticeVersion" TEXT NOT NULL,
  "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "pausedAt" DATETIME,
  "endedAt" DATETIME,
  "lastHeartbeatAt" DATETIME,
  "autoStopAt" DATETIME NOT NULL,
  "retentionUntil" DATETIME NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "ProLocationPoint" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "sessionId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "latitude" REAL NOT NULL,
  "longitude" REAL NOT NULL,
  "accuracy" REAL,
  "altitude" REAL,
  "speed" REAL,
  "heading" REAL,
  "battery" REAL,
  "source" TEXT NOT NULL DEFAULT 'mobile',
  "recordedAt" DATETIME NOT NULL,
  "receivedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "ProLocationAccessLog" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "actorUserId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "targetId" TEXT,
  "metadata" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "OrganizationMember_organizationId_locationSharingEnabled_idx" ON "OrganizationMember"("organizationId", "locationSharingEnabled");
CREATE INDEX "ProTrackingSession_organizationId_status_idx" ON "ProTrackingSession"("organizationId", "status");
CREATE INDEX "ProTrackingSession_userId_status_idx" ON "ProTrackingSession"("userId", "status");
CREATE INDEX "ProTrackingSession_retentionUntil_idx" ON "ProTrackingSession"("retentionUntil");
CREATE INDEX "ProLocationPoint_organizationId_recordedAt_idx" ON "ProLocationPoint"("organizationId", "recordedAt");
CREATE INDEX "ProLocationPoint_userId_recordedAt_idx" ON "ProLocationPoint"("userId", "recordedAt");
CREATE INDEX "ProLocationPoint_sessionId_recordedAt_idx" ON "ProLocationPoint"("sessionId", "recordedAt");
CREATE INDEX "ProLocationAccessLog_organizationId_createdAt_idx" ON "ProLocationAccessLog"("organizationId", "createdAt");
CREATE INDEX "ProLocationAccessLog_actorUserId_createdAt_idx" ON "ProLocationAccessLog"("actorUserId", "createdAt");
CREATE INDEX "ProIntervention_technicianId_routeOrder_idx" ON "ProIntervention"("technicianId", "routeOrder");
