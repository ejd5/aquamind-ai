-- AQWELIA — ADMIN PRODUCT CONTROL (PR112) · AdminContentBlock + AdminProductFlag (PostgreSQL).
-- Miroir de la migration SQLite 20260822110000_admin_product_control.

CREATE TABLE "AdminContentBlock" (
    "id"           TEXT    NOT NULL,
    "contentKey"   TEXT    NOT NULL,
    "status"       TEXT    NOT NULL DEFAULT 'DRAFT',
    "translations" TEXT    NOT NULL,
    "updatedById"  TEXT,
    "approvedById" TEXT,
    "approvedAt"   TIMESTAMP(3),
    "version"      INTEGER NOT NULL DEFAULT 0,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AdminContentBlock_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AdminContentBlock_contentKey_key" ON "AdminContentBlock"("contentKey");
CREATE INDEX "AdminContentBlock_status_idx" ON "AdminContentBlock"("status");

CREATE TABLE "AdminProductFlag" (
    "id"          TEXT    NOT NULL,
    "key"         TEXT    NOT NULL,
    "enabled"     BOOLEAN NOT NULL DEFAULT FALSE,
    "reason"      TEXT,
    "updatedById" TEXT,
    "version"     INTEGER NOT NULL DEFAULT 0,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AdminProductFlag_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AdminProductFlag_key_key" ON "AdminProductFlag"("key");
