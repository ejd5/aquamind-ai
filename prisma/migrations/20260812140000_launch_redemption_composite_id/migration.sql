-- AQWELIA Launch offers — idempotence paiement (P2#4).
-- L'identité d'une redemption est composite (provider, providerTransactionId) :
-- un même ID brut peut exister chez deux fournisseurs (Stripe/Apple/Google) sans
-- désigner le même paiement. On remplace l'unicité sur providerTransactionId seul
-- par une unicité composite, et on supprime l'index non-unique devenu redondant.

DROP INDEX IF EXISTS "PromotionRedemption_providerTransactionId_key";
DROP INDEX IF EXISTS "PromotionRedemption_provider_providerTransactionId_idx";
CREATE UNIQUE INDEX "PromotionRedemption_provider_providerTransactionId_key" ON "PromotionRedemption"("provider", "providerTransactionId");
