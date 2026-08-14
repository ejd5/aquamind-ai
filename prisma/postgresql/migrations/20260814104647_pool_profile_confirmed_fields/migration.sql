-- AQWELIA — P5-MULTIPOOL-PDF / P0-1 Round 2.
-- Ajoute une colonne NULLABLE `confirmedFields` sur PoolProfile.
--
-- Les colonnes métier (treatmentType, filterType, sunExposure, usageLevel,
-- shape, surfaceType, waterBodyType, saltSystem, covered, …) sont NOT NULL
-- avec des défauts techniques. `confirmedFields` (JSON array) enregistre les
-- champs réellement confirmés par l'utilisateur pour que le moteur de
-- recommandation distingue vérité métier vs valeur technique par défaut.
--
-- Migration additive et sûre. NE PAS l'appliquer en Production sans validation.

ALTER TABLE "PoolProfile" ADD COLUMN "confirmedFields" TEXT;
