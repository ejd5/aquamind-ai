-- Wave A2 — canonical RevenueCat identity + provider coexistence.
--
--  1. Add provider + environment to Subscription (defaults preserve existing
--     rows: existing rows are treated as 'revenuecat' / 'production').
--  2. Create BillingIdentity mapping (provider, environment, externalUserId)
--     to exactly one User.

ALTER TABLE "Subscription" ADD COLUMN "provider" TEXT NOT NULL DEFAULT 'revenuecat';
ALTER TABLE "Subscription" ADD COLUMN "environment" TEXT NOT NULL DEFAULT 'production';

-- Backfill: existing Stripe rows are identified by their Stripe ids.
UPDATE "Subscription" SET "provider" = 'stripe'
WHERE "stripeSubscriptionId" IS NOT NULL;

-- Wave A2: providerSubscriptionId uniqueness is scoped to (provider,
-- environment) so sandbox and production (and Stripe/RevenueCat) never collide
-- on the same provider id. Drops the global unique index first.
DROP INDEX "Subscription_providerSubscriptionId_key";
CREATE UNIQUE INDEX "Subscription_provider_environment_providerSubscriptionId_key"
    ON "Subscription"("provider", "environment", "providerSubscriptionId");

CREATE TABLE "BillingIdentity" (
    "id"             TEXT    NOT NULL,
    "userId"         TEXT    NOT NULL,
    "provider"       TEXT    NOT NULL,
    "environment"    TEXT    NOT NULL DEFAULT 'production',
    "externalUserId" TEXT    NOT NULL,
    "createdAt"      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      DATETIME NOT NULL,

    CONSTRAINT "BillingIdentity_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BillingIdentity_provider_environment_externalUserId_key"
    ON "BillingIdentity"("provider", "environment", "externalUserId");
CREATE INDEX "BillingIdentity_userId_idx" ON "BillingIdentity"("userId");
CREATE INDEX "BillingIdentity_provider_environment_idx" ON "BillingIdentity"("provider", "environment");
CREATE INDEX "Subscription_provider_environment_idx" ON "Subscription"("provider", "environment");

-- Wave A2: idempotency is scoped by environment ([source, environment, eventId]).
ALTER TABLE "BillingEvent" ADD COLUMN "environment" TEXT NOT NULL DEFAULT 'production';
DROP INDEX "BillingEvent_source_eventId_key";
CREATE UNIQUE INDEX "BillingEvent_source_environment_eventId_key"
    ON "BillingEvent"("source", "environment", "eventId");
