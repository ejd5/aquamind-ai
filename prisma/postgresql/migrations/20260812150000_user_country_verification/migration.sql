-- AQWELIA Launch offers — vérification du pays (P1#1).
-- User.country garde sa valeur par défaut (FR) mais n'est PLUS considérée comme
-- vérifiée : les nouveaux comptes (credentials/OAuth) n'ont aucune preuve serveur
-- fiable → inéligibles aux restrictions régionales jusqu'à vérification.
-- On ajoute countryVerifiedAt (null = non vérifié) et countrySource (origine de
-- la valeur). Aucun compte existant ne devient automatiquement éligible : la
-- colonne est NULL pour tous les comptes actuels.

ALTER TABLE "User" ADD COLUMN "countryVerifiedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "countrySource" TEXT;
