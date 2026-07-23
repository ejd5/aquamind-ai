-- CreateTable
CREATE TABLE "OfflineMutation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'processing',
    "statusCode" INTEGER,
    "contentType" TEXT,
    "responseBody" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "expiresAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "OfflineMutation_userId_idempotencyKey_key"
ON "OfflineMutation"("userId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "OfflineMutation_expiresAt_idx" ON "OfflineMutation"("expiresAt");

-- CreateIndex
CREATE INDEX "OfflineMutation_state_createdAt_idx"
ON "OfflineMutation"("state", "createdAt");
