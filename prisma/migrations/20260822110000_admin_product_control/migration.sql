-- AQWELIA — ADMIN PRODUCT CONTROL (PR112) · AdminContentBlock + AdminProductFlag.
-- Tables additives et sûres. NON APPLIQUÉES à distance — Staging après validation.

CREATE TABLE "AdminContentBlock" (
    "id"           TEXT     NOT NULL,
    "contentKey"   TEXT     NOT NULL,
    "status"       TEXT     NOT NULL DEFAULT 'DRAFT',
    "translations" TEXT     NOT NULL,
    "updatedById"  TEXT,
    "approvedById" TEXT,
    "approvedAt"   DATETIME,
    "version"      INTEGER  NOT NULL DEFAULT 0,
    "createdAt"    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    DATETIME NOT NULL,
    CONSTRAINT "AdminContentBlock_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AdminContentBlock_contentKey_key" ON "AdminContentBlock"("contentKey");
CREATE INDEX "AdminContentBlock_status_idx" ON "AdminContentBlock"("status");

CREATE TABLE "AdminProductFlag" (
    "id"          TEXT     NOT NULL,
    "key"         TEXT     NOT NULL,
    "enabled"     BOOLEAN  NOT NULL DEFAULT FALSE,
    "reason"      TEXT,
    "updatedById" TEXT,
    "version"     INTEGER  NOT NULL DEFAULT 0,
    "createdAt"   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   DATETIME NOT NULL,
    CONSTRAINT "AdminProductFlag_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AdminProductFlag_key_key" ON "AdminProductFlag"("key");
