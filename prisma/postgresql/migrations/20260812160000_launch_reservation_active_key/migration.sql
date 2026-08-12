-- AQWELIA Launch offers — une seule réservation ACTIVE par (campaignId, userId).
-- Ajoute une colonne nullable unique activeUserKey sur PromotionReservation.
-- PostgreSQL : ALTER TABLE suffit (contrainte unique partielle).

ALTER TABLE "PromotionReservation" ADD COLUMN "activeUserKey" TEXT;
CREATE UNIQUE INDEX "PromotionReservation_activeUserKey_key" ON "PromotionReservation"("activeUserKey");
-- Renseigne la clé pour les réservations ACTIVE encore valides.
UPDATE "PromotionReservation"
SET "activeUserKey" = 'u:' || "userId" || ':c:' || "campaignId"
WHERE "status" = 'ACTIVE' AND "expiresAt" > CURRENT_TIMESTAMP;
