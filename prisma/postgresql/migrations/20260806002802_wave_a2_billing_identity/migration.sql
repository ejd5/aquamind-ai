-- Wave A2 — canonical RevenueCat identity + provider coexistence (PostgreSQL).
--
--  1. Add provider + environment to Subscription. Existing rows are backfilled:
--     any row carrying a Stripe subscription id is 'stripe', otherwise
--     'revenuecat'. Ambiguous rows must be caught by the preflight script
--     (scripts/preflight-subscription-provider.mjs) BEFORE this migration runs.
--  2. Create BillingIdentity mapping (provider, externalUserId) to exactly one
--     User with a real FK + cascade. RevenueCat uses the same App User ID for
--     sandbox and production, so the identity is canonical per provider; the
--     billing environment is NOT stored here.
--  3. BillingEvent gains environment; idempotency becomes
--     [source, environment, eventId].

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
CREATE INDEX "Subscription_provider_environment_idx" ON "Subscription"("provider", "environment");

CREATE TABLE "BillingIdentity" (
    "id"             TEXT    NOT NULL,
    "userId"         TEXT    NOT NULL,
    "provider"       TEXT    NOT NULL,
    "externalUserId" TEXT    NOT NULL,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingIdentity_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "BillingIdentity_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "BillingIdentity_provider_externalUserId_key"
    ON "BillingIdentity"("provider", "externalUserId");
CREATE INDEX "BillingIdentity_userId_idx" ON "BillingIdentity"("userId");

-- Wave A2: idempotency is scoped by environment ([source, environment, eventId]).
ALTER TABLE "BillingEvent" ADD COLUMN "environment" TEXT NOT NULL DEFAULT 'production';
DROP INDEX "BillingEvent_source_eventId_key";
CREATE UNIQUE INDEX "BillingEvent_source_environment_eventId_key"
    ON "BillingEvent"("source", "environment", "eventId");
