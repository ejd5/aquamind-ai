-- CreateTable
CREATE TABLE "ArqweliaProject" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'created',
    "locale" TEXT NOT NULL DEFAULT 'fr',
    "projectType" TEXT,
    "timeline" TEXT,
    "budgetRange" TEXT,
    "style" TEXT,
    "knownMeasureLabel" TEXT,
    "knownMeasureValue" DOUBLE PRECISION,
    "knownMeasureUnit" TEXT DEFAULT 'm',
    "selectedConcept" TEXT,
    "postalCode" TEXT,
    "realityScoreDemo" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArqweliaProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArqweliaLeadConsent" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "consentVersion" TEXT NOT NULL,
    "consentedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL DEFAULT 'arqwelia_lot1',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArqweliaLeadConsent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArqweliaPartnerWaitlist" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "postalCode" TEXT,
    "radiusKm" INTEGER,
    "consentVersion" TEXT NOT NULL,
    "consentedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArqweliaPartnerWaitlist_pkey" PRIMARY KEY ("id")
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

-- AddForeignKey
ALTER TABLE "ArqweliaLeadConsent" ADD CONSTRAINT "ArqweliaLeadConsent_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ArqweliaProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

