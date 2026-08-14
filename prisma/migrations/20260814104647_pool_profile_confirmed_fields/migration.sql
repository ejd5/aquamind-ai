-- AQWELIA — P5-MULTIPOOL-PDF / P0-1 Round 2.
-- Ajoute une colonne NULLABLE `confirmedFields` sur PoolProfile.
--
-- Pourquoi : les colonnes métier (treatmentType, filterType, sunExposure,
-- usageLevel, shape, surfaceType, waterBodyType, saltSystem, covered, …) sont
-- NOT NULL avec des valeurs par défaut techniques (ex. treatmentType='chlorine').
-- Ces défauts ne doivent PAS être interprétés comme un choix utilisateur.
-- `confirmedFields` enregistre la liste (JSON) des champs réellement confirmés
-- par l'utilisateur. Le moteur de recommandation doit consulter cette colonne
-- avant de traiter une valeur métier comme la vérité utilisateur.
--
-- Migration additive et sûre : colonne nullable, aucune donnée existante
-- modifiée. NE PAS l'appliquer en Production sans validation préalable.

ALTER TABLE "PoolProfile" ADD COLUMN "confirmedFields" TEXT;
