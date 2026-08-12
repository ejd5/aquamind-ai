-- AQWELIA Launch offers — quota global atomique (spec v1.0 §3).
-- Ajoute un compteur global de consommations confirmées sur la campagne pour
-- garantir que la confirmation (y compris tardive) applique atomiquement le
-- quota global ET par allocation.

ALTER TABLE "PromotionCampaign" ADD COLUMN "confirmedCount" INTEGER NOT NULL DEFAULT 0;
