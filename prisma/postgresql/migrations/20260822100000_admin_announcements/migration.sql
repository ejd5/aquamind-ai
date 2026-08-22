-- AQWELIA — ADMIN COMPLETION CORE (PR111) · AdminContentAnnouncement (PostgreSQL).
-- Miroir de la migration SQLite 20260822100000_admin_announcements.

CREATE TABLE "AdminContentAnnouncement" (
    "id"               TEXT    NOT NULL,
    "internalName"     TEXT    NOT NULL,
    "status"           TEXT    NOT NULL DEFAULT 'DRAFT',
    "translations"     TEXT    NOT NULL,
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
    CONSTRAINT "AdminContentAnnouncement_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AdminContentAnnouncement_status_idx" ON "AdminContentAnnouncement"("status");
