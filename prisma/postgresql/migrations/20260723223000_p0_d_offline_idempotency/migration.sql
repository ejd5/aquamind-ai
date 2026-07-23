-- CreateTable
CREATE TABLE "OfflineMutation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'processing',
    "statusCode" INTEGER,
    "contentType" TEXT,
    "responseBody" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OfflineMutation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OfflineMutation_userId_idempotencyKey_key"
ON "OfflineMutation"("userId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "OfflineMutation_expiresAt_idx" ON "OfflineMutation"("expiresAt");

-- CreateIndex
CREATE INDEX "OfflineMutation_state_createdAt_idx"
ON "OfflineMutation"("state", "createdAt");
