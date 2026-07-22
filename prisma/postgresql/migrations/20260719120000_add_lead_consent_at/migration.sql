-- Migration: add Lead.consentAt
-- Nullable to preserve historical leads without a consent timestamp.
ALTER TABLE "Lead" ADD COLUMN "consentAt" TIMESTAMP(3);
