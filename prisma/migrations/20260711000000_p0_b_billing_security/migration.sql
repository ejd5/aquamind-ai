-- AQWELIA P0-B: Billing security migration
-- Adds subscription status, store, Stripe/RC fields, and BillingEvent model

-- AlterTable: add new columns to Subscription
ALTER TABLE "Subscription" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'inactive';
ALTER TABLE "Subscription" ADD COLUMN "store" TEXT;
ALTER TABLE "Subscription" ADD COLUMN "cancelAt" DATETIME;
ALTER TABLE "Subscription" ADD COLUMN "trialEndsAt" DATETIME;
ALTER TABLE "Subscription" ADD COLUMN "currentPeriodStart" DATETIME;
ALTER TABLE "Subscription" ADD COLUMN "currentPeriodEnd" DATETIME;
ALTER TABLE "Subscription" ADD COLUMN "stripeCustomerId" TEXT;
ALTER TABLE "Subscription" ADD COLUMN "stripeSubscriptionId" TEXT;
ALTER TABLE "Subscription" ADD COLUMN "lastProviderEventId" TEXT;
ALTER TABLE "Subscription" ADD COLUMN "lastProviderEventAt" DATETIME;

-- CreateIndex
CREATE INDEX "Subscription_stripeSubscriptionId_idx" ON "Subscription"("stripeSubscriptionId");
CREATE INDEX "Subscription_status_idx" ON "Subscription"("status");

-- CreateTable: BillingEvent (idempotency log)
CREATE TABLE "BillingEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "userId" TEXT,
    "payload" TEXT,
    "processedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "result" TEXT NOT NULL,
    "errorMessage" TEXT
);

-- CreateIndex: unique constraint on eventId
CREATE UNIQUE INDEX "BillingEvent_eventId_key" ON "BillingEvent"("eventId");

-- CreateIndex: composite index for source + eventType queries
CREATE INDEX "BillingEvent_source_eventType_idx" ON "BillingEvent"("source", "eventType");

-- CreateIndex: userId for user-scoped queries
CREATE INDEX "BillingEvent_userId_idx" ON "BillingEvent"("userId");
