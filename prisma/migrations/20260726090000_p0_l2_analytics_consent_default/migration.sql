-- P0-L2 privacy reset: existing analytics consent cannot be inferred from a
-- historical default. All users must make a fresh, versioned choice.
UPDATE "User" SET "consentAnalytics" = false;
