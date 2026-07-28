-- CreateTable
CREATE TABLE "ArqweliaProject" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "publicId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'created',
    "locale" TEXT NOT NULL DEFAULT 'fr',
    "projectType" TEXT,
    "timeline" TEXT,
    "budgetRange" TEXT,
    "style" TEXT,
    "knownMeasureLabel" TEXT,
    "knownMeasureValue" REAL,
    "knownMeasureUnit" TEXT DEFAULT 'm',
    "selectedConcept" TEXT,
    "postalCode" TEXT,
    "realityScoreDemo" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "expiresAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ArqweliaLeadConsent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "consentVersion" TEXT NOT NULL,
    "consentedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL DEFAULT 'arqwelia_lot1',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ArqweliaLeadConsent_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ArqweliaProject" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ArqweliaPartnerWaitlist" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyName" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "postalCode" TEXT,
    "radiusKm" INTEGER,
    "consentVersion" TEXT NOT NULL,
    "consentedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "ArqweliaProject_publicId_key" ON "ArqweliaProject"("publicId");

-- CreateIndex
CREATE INDEX "ArqweliaProject_status_createdAt_idx" ON "ArqweliaProject"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ArqweliaProject_expiresAt_idx" ON "ArqweliaProject"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "ArqweliaLeadConsent_projectId_key" ON "ArqweliaLeadConsent"("projectId");

-- CreateIndex
CREATE INDEX "ArqweliaLeadConsent_email_idx" ON "ArqweliaLeadConsent"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ArqweliaPartnerWaitlist_email_key" ON "ArqweliaPartnerWaitlist"("email");

-- CreateIndex
CREATE INDEX "ArqweliaPartnerWaitlist_postalCode_idx" ON "ArqweliaPartnerWaitlist"("postalCode");

