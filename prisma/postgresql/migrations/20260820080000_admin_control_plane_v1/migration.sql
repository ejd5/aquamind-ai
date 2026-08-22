-- AQWELIA — ADMIN CONTROL PLANE V1 (PostgreSQL).
-- Miroir de la migration SQLite 20260820080000_admin_control_plane_v1.
-- Migration additive et sûre. NE PAS l'appliquer en Production sans validation.

CREATE TABLE "AdminContentBanner" (
    "id"               TEXT    NOT NULL,
    "internalName"     TEXT    NOT NULL,
    "status"           TEXT    NOT NULL DEFAULT 'DRAFT',
    "translations"     TEXT    NOT NULL,
    "variant"          TEXT    NOT NULL DEFAULT 'LAGOON',
    "ctaTranslations"  TEXT,
    "ctaUrl"           TEXT,
    "targeting"        TEXT,
    "startAt"          TIMESTAMP(3),
    "endAt"            TIMESTAMP(3),
    "priority"         INTEGER NOT NULL DEFAULT 0,
    "createdById"      TEXT,
    "updatedById"      TEXT,
    "approvedById"     TEXT,
    "approvedAt"       TIMESTAMP(3),
    "version"          INTEGER NOT NULL DEFAULT 0,
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AdminContentBanner_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AdminContentBanner_status_idx" ON "AdminContentBanner"("status");

CREATE TABLE "AdminContentPopup" (
    "id"               TEXT    NOT NULL,
    "internalName"     TEXT    NOT NULL,
    "status"           TEXT    NOT NULL DEFAULT 'DRAFT',
    "translations"     TEXT    NOT NULL,
    "imageUrl"         TEXT,
    "ctaTranslations"  TEXT,
    "ctaUrl"           TEXT,
    "trigger"          TEXT    NOT NULL DEFAULT 'ON_LOAD',
    "frequency"        TEXT    NOT NULL DEFAULT 'ONCE',
    "reminderDays"     INTEGER NOT NULL DEFAULT 0,
    "targeting"        TEXT,
    "startAt"          TIMESTAMP(3),
    "endAt"            TIMESTAMP(3),
    "priority"         INTEGER NOT NULL DEFAULT 0,
    "createdById"      TEXT,
    "updatedById"      TEXT,
    "approvedById"     TEXT,
    "approvedAt"       TIMESTAMP(3),
    "version"          INTEGER NOT NULL DEFAULT 0,
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AdminContentPopup_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AdminContentPopup_status_idx" ON "AdminContentPopup"("status");

CREATE TABLE "AdminAuditLog" (
    "id"         TEXT    NOT NULL,
    "actor"      TEXT    NOT NULL,
    "action"     TEXT    NOT NULL,
    "entityType" TEXT    NOT NULL,
    "entityId"   TEXT,
    "before"     TEXT,
    "after"      TEXT,
    "metadata"   TEXT,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AdminAuditLog_entityType_entityId_createdAt_idx" ON "AdminAuditLog"("entityType", "entityId", "createdAt");
CREATE INDEX "AdminAuditLog_createdAt_idx" ON "AdminAuditLog"("createdAt");

CREATE TABLE "AdminAgentProposal" (
    "id"               TEXT    NOT NULL,
    "agent"            TEXT    NOT NULL,
    "type"             TEXT    NOT NULL,
    "status"           TEXT    NOT NULL DEFAULT 'NEEDS_REVIEW',
    "title"            TEXT    NOT NULL,
    "rationale"        TEXT    NOT NULL,
    "payload"          TEXT,
    "confidence"       DOUBLE PRECISION NOT NULL DEFAULT 0,
    "riskLevel"        TEXT    NOT NULL DEFAULT 'LOW',
    "blockedReasons"   TEXT,
    "linkedEntityType" TEXT,
    "linkedEntityId"   TEXT,
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt"       TIMESTAMP(3),
    "reviewedBy"       TEXT,
    "executedAt"       TIMESTAMP(3),
    CONSTRAINT "AdminAgentProposal_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AdminAgentProposal_status_createdAt_idx" ON "AdminAgentProposal"("status", "createdAt");
CREATE INDEX "AdminAgentProposal_agent_createdAt_idx" ON "AdminAgentProposal"("agent", "createdAt");
