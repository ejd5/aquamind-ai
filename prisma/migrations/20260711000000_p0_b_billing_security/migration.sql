-- AQWELIA P0-B: Billing security migration
-- Adds subscription status, store, Stripe/RC fields, BillingEvent model
-- with composite unique [source, eventId] for idempotency

-- AlterTable: add new columns to Subscription
ALTER TABLE "Subscription" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'inactive';
ALTER TABLE "Subscription" ADD COLUMN "store" TEXT;
ALTER TABLE "Subscription" ADD COLUMN "cancelAt" DATETIME;
ALTER TABLE "Subscription" ADD COLUMN "trialEndsAt" DATETIME;
ALTER TABLE "Subscription" ADD COLUMN "currentPeriodStart" DATETIME;
ALTER TABLE "Subscription" ADD COLUMN "currentPeriodEnd" DATETIME;
ALTER TABLE "Subscription" ADD COLUMN "stripeCustomerId" TEXT;
ALTER TABLE "Subscription" ADD COLUMN "stripeSubscriptionId" TEXT;
ALTER TABLE "Subscription" ADD COLUMN "providerSubscriptionId" TEXT;
ALTER TABLE "Subscription" ADD COLUMN "lastProviderEventId" TEXT;
ALTER TABLE "Subscription" ADD COLUMN "lastProviderEventAt" DATETIME;

-- CreateIndex: unique constraints on provider identity fields
-- SQLite allows multiple NULLs in a unique column, so inactive subscriptions
-- without a provider ID coexist without conflict.
CREATE UNIQUE INDEX "Subscription_stripeSubscriptionId_key" ON "Subscription"("stripeSubscriptionId");
CREATE UNIQUE INDEX "Subscription_providerSubscriptionId_key" ON "Subscription"("providerSubscriptionId");
CREATE INDEX "Subscription_status_idx" ON "Subscription"("status");

-- CreateTable: BillingEvent (idempotency log with retry support)
CREATE TABLE "BillingEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "userId" TEXT,
    "payload" TEXT,
    "result" TEXT NOT NULL DEFAULT 'processing',
    "ignoredReason" TEXT,
    "errorMessage" TEXT,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "processingStartedAt" DATETIME,
    "processedAt" DATETIME,
    "nextRetryAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex: composite unique [source, eventId] — prevents collision
-- between Stripe and RevenueCat event IDs
CREATE UNIQUE INDEX "BillingEvent_source_eventId_key" ON "BillingEvent"("source", "eventId");

-- CreateIndex: query helpers
CREATE INDEX "BillingEvent_source_eventType_idx" ON "BillingEvent"("source", "eventType");
CREATE INDEX "BillingEvent_userId_idx" ON "BillingEvent"("userId");
CREATE INDEX "BillingEvent_result_idx" ON "BillingEvent"("result");
CREATE INDEX "BillingEvent_nextRetryAt_idx" ON "BillingEvent"("nextRetryAt");

-- ═══════════════════════════════════════════════════════════════════════════
-- BACKFILL: Set status for existing subscriptions based on their current data
-- ═══════════════════════════════════════════════════════════════════════════
-- Rule: only use what we can prove from existing data.
--   active=true AND expiresAt > now  → 'active' (proven by active flag + not expired)
--   active=true AND expiresAt <= now → 'expired' (was active but has expired)
--   active=true AND expiresAt IS NULL → 'active' (no expiry = treat as active)
--   active=false → 'inactive' (explicitly deactivated)
-- We do NOT invent trialing, canceled, past_due, or grace_period — those
-- require provider event data that doesn't exist in the pre-P0-B schema.

-- Step 1: active=true with future or no expiry → status='active'
UPDATE "Subscription"
SET "status" = 'active'
WHERE "active" = 1
  AND ("expiresAt" IS NULL OR "expiresAt" > CURRENT_TIMESTAMP);

-- Step 2: active=true with past expiry → status='expired'
UPDATE "Subscription"
SET "status" = 'expired', "active" = 0
WHERE "active" = 1
  AND "expiresAt" IS NOT NULL
  AND "expiresAt" <= CURRENT_TIMESTAMP;

-- Step 3: active=false → status='inactive' (already the default, but be explicit)
UPDATE "Subscription"
SET "status" = 'inactive'
WHERE "active" = 0
  AND "status" = 'inactive';
