-- AQWELIA Launch offers (campagne "Offres de lancement", spec v1.0).
-- SQLite — tables de campagne/quotas/réservations/récompenses/audit.
-- Montants en unités mineures entières (cents), dérivés du catalogue ou des stores.

CREATE TABLE "PromotionCampaign" (
    "id"                             TEXT    NOT NULL,
    "code"                           TEXT    NOT NULL,
    "name"                           TEXT    NOT NULL,
    "status"                         TEXT    NOT NULL DEFAULT 'DRAFT',
    "totalQuota"                     INTEGER NOT NULL DEFAULT 500,
    "startsAt"                       DATETIME,
    "endsAt"                         DATETIME,
    "reservationTtlSeconds"          INTEGER NOT NULL DEFAULT 1800,
    "exactRemainingThresholdRatio"   REAL    NOT NULL DEFAULT 0.25,
    "eligibleCountries"              TEXT,
    "eligiblePlanIds"                TEXT,
    "version"                        INTEGER NOT NULL DEFAULT 0,
    "createdAt"                      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"                      DATETIME NOT NULL,
    CONSTRAINT "PromotionCampaign_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PromotionCampaign_code_key" ON "PromotionCampaign"("code");

CREATE TABLE "PromotionVariant" (
    "id"                TEXT    NOT NULL,
    "campaignId"        TEXT    NOT NULL,
    "code"              TEXT    NOT NULL,
    "status"            TEXT    NOT NULL DEFAULT 'ACTIVE',
    "quota"             INTEGER NOT NULL,
    "billingPeriod"     TEXT    NOT NULL,
    "discountKind"      TEXT    NOT NULL,
    "discountValue"     INTEGER NOT NULL,
    "eligiblePlanIds"   TEXT,
    "createdAt"         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"         DATETIME NOT NULL,
    CONSTRAINT "PromotionVariant_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PromotionVariant_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "PromotionCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PromotionVariant_campaignId_code_key" ON "PromotionVariant"("campaignId", "code");
CREATE INDEX "PromotionVariant_campaignId_idx" ON "PromotionVariant"("campaignId");

CREATE TABLE "PromotionAllocation" (
    "id"              TEXT    NOT NULL,
    "variantId"       TEXT    NOT NULL,
    "platform"        TEXT    NOT NULL,
    "planId"          TEXT,
    "quota"           INTEGER NOT NULL,
    "confirmedCount"  INTEGER NOT NULL DEFAULT 0,
    "reservedCount"   INTEGER NOT NULL DEFAULT 0,
    "safetyBuffer"    INTEGER NOT NULL DEFAULT 0,
    "providerLimit"   INTEGER,
    "version"         INTEGER NOT NULL DEFAULT 0,
    "createdAt"       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       DATETIME NOT NULL,
    CONSTRAINT "PromotionAllocation_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PromotionAllocation_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "PromotionVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PromotionAllocation_variantId_platform_planId_key" ON "PromotionAllocation"("variantId", "platform", "planId");
CREATE INDEX "PromotionAllocation_variantId_idx" ON "PromotionAllocation"("variantId");

CREATE TABLE "PromotionReservation" (
    "id"                 TEXT    NOT NULL,
    "campaignId"         TEXT    NOT NULL,
    "variantId"          TEXT    NOT NULL,
    "allocationId"       TEXT    NOT NULL,
    "userId"             TEXT    NOT NULL,
    "planId"             TEXT    NOT NULL,
    "platform"           TEXT    NOT NULL,
    "status"             TEXT    NOT NULL DEFAULT 'ACTIVE',
    "expiresAt"          DATETIME NOT NULL,
    "idempotencyKey"     TEXT    NOT NULL,
    "providerCheckoutId" TEXT,
    "signedTokenHash"    TEXT,
    "createdAt"          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"          DATETIME NOT NULL,
    CONSTRAINT "PromotionReservation_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PromotionReservation_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "PromotionCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PromotionReservation_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "PromotionVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PromotionReservation_allocationId_fkey" FOREIGN KEY ("allocationId") REFERENCES "PromotionAllocation"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PromotionReservation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PromotionReservation_idempotencyKey_key" ON "PromotionReservation"("idempotencyKey");
CREATE INDEX "PromotionReservation_campaignId_userId_status_idx" ON "PromotionReservation"("campaignId", "userId", "status");
CREATE INDEX "PromotionReservation_expiresAt_idx" ON "PromotionReservation"("expiresAt");

CREATE TABLE "PromotionRedemption" (
    "id"                            TEXT    NOT NULL,
    "campaignId"                    TEXT    NOT NULL,
    "variantId"                     TEXT    NOT NULL,
    "allocationId"                  TEXT    NOT NULL,
    "reservationId"                 TEXT,
    "userId"                        TEXT    NOT NULL,
    "subscriptionId"                TEXT,
    "planId"                        TEXT    NOT NULL,
    "platform"                      TEXT    NOT NULL,
    "provider"                      TEXT    NOT NULL,
    "providerTransactionId"         TEXT    NOT NULL,
    "providerOriginalTransactionId" TEXT,
    "normalAmountMinor"             INTEGER NOT NULL,
    "paidAmountMinor"               INTEGER NOT NULL,
    "discountAmountMinor"           INTEGER NOT NULL,
    "currency"                      TEXT    NOT NULL DEFAULT 'EUR',
    "status"                        TEXT    NOT NULL DEFAULT 'CONFIRMED',
    "confirmedAt"                   DATETIME,
    "metadata"                      TEXT,
    "createdAt"                     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PromotionRedemption_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PromotionRedemption_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "PromotionCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PromotionRedemption_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "PromotionVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PromotionRedemption_allocationId_fkey" FOREIGN KEY ("allocationId") REFERENCES "PromotionAllocation"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PromotionRedemption_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "PromotionReservation"("id"),
    CONSTRAINT "PromotionRedemption_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PromotionRedemption_providerTransactionId_key" ON "PromotionRedemption"("providerTransactionId");
CREATE UNIQUE INDEX "PromotionRedemption_campaignId_userId_key" ON "PromotionRedemption"("campaignId", "userId");
CREATE INDEX "PromotionRedemption_provider_providerTransactionId_idx" ON "PromotionRedemption"("provider", "providerTransactionId");

CREATE TABLE "PromotionAuditLog" (
    "id"         TEXT    NOT NULL,
    "campaignId" TEXT    NOT NULL,
    "actor"      TEXT    NOT NULL,
    "action"     TEXT    NOT NULL,
    "before"     TEXT,
    "after"      TEXT,
    "reason"     TEXT,
    "createdAt"  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PromotionAuditLog_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PromotionAuditLog_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "PromotionCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "PromotionAuditLog_campaignId_createdAt_idx" ON "PromotionAuditLog"("campaignId", "createdAt");
