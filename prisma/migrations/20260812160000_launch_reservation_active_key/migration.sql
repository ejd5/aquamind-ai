-- AQWELIA Launch offers — une seule réservation ACTIVE par (campaignId, userId).
-- Ajoute une colonne nullable unique activeUserKey sur PromotionReservation.
-- SQLite ne permet pas d'ajouter une contrainte UNIQUE par ALTER TABLE : on
-- recrée la table (avec ses index) en préservant les données existantes.

CREATE TABLE "PromotionReservation_new" (
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
    "activeUserKey"      TEXT,
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

-- Copie des données : activeUserKey n'est renseigné QUE pour les réservations
-- ACTIVE encore valides (aucun doublon possible dans les données existantes
-- grâce au contrôle applicatif ; si un doublon subsistait, il faudrait le
-- nettoyer — en pratique la contrainte garantit désormais l'unicité).
INSERT INTO "PromotionReservation_new" (
  "id", "campaignId", "variantId", "allocationId", "userId", "planId",
  "platform", "status", "expiresAt", "idempotencyKey", "activeUserKey",
  "providerCheckoutId", "signedTokenHash", "createdAt", "updatedAt"
)
SELECT "id", "campaignId", "variantId", "allocationId", "userId", "planId",
       "platform", "status", "expiresAt", "idempotencyKey",
       CASE WHEN "status" = 'ACTIVE' AND "expiresAt" > CURRENT_TIMESTAMP
            THEN 'u:' || "userId" || ':c:' || "campaignId"
            ELSE NULL END,
       "providerCheckoutId", "signedTokenHash", "createdAt", "updatedAt"
FROM "PromotionReservation";

DROP TABLE "PromotionReservation";
ALTER TABLE "PromotionReservation_new" RENAME TO "PromotionReservation";

CREATE UNIQUE INDEX "PromotionReservation_idempotencyKey_key" ON "PromotionReservation"("idempotencyKey");
CREATE UNIQUE INDEX "PromotionReservation_activeUserKey_key" ON "PromotionReservation"("activeUserKey");
CREATE INDEX "PromotionReservation_campaignId_userId_status_idx" ON "PromotionReservation"("campaignId", "userId", "status");
CREATE INDEX "PromotionReservation_expiresAt_idx" ON "PromotionReservation"("expiresAt");
