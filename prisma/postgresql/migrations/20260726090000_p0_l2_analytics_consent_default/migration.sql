-- P0-L2 privacy reset: consent must be explicit and evidenced.
ALTER TABLE "User" ALTER COLUMN "consentAnalytics" SET DEFAULT false;
UPDATE "User" SET "consentAnalytics" = false;
