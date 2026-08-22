-- AQWELIA — ADMIN COMPLETION CORE (PR111) · AdminContentAnnouncement.
-- Table additive et sûre : aucune donnée existante modifiée.
-- NON APPLIQUÉE à distance — Staging uniquement après validation humaine.

CREATE TABLE "AdminContentAnnouncement" (
    "id"               TEXT     NOT NULL,
    "internalName"     TEXT     NOT NULL,
    "status"           TEXT     NOT NULL DEFAULT 'DRAFT',
    "translations"     TEXT     NOT NULL,
    "ctaTranslations"  TEXT,
    "ctaUrl"           TEXT,
    "targeting"        TEXT,
    "startAt"          DATETIME,
    "endAt"            DATETIME,
    "priority"         INTEGER  NOT NULL DEFAULT 0,
    "createdById"      TEXT,
    "updatedById"      TEXT,
    "approvedById"     TEXT,
    "approvedAt"       DATETIME,
    "version"          INTEGER  NOT NULL DEFAULT 0,
    "createdAt"        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        DATETIME NOT NULL,
    CONSTRAINT "AdminContentAnnouncement_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AdminContentAnnouncement_status_idx" ON "AdminContentAnnouncement"("status");
