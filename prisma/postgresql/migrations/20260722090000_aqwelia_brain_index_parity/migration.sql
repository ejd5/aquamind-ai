-- AQWELIA Brain — index parity with prisma/postgresql/schema.prisma

CREATE INDEX IF NOT EXISTS "RecommendationExecution_userId_idx"
  ON "RecommendationExecution"("userId");
CREATE INDEX IF NOT EXISTS "RecommendationExecution_poolId_createdAt_idx"
  ON "RecommendationExecution"("poolId", "createdAt");
CREATE INDEX IF NOT EXISTS "RecommendationExecution_status_idx"
  ON "RecommendationExecution"("status");

CREATE INDEX IF NOT EXISTS "RecommendationOutcome_userId_idx"
  ON "RecommendationOutcome"("userId");
CREATE INDEX IF NOT EXISTS "RecommendationOutcome_poolId_createdAt_idx"
  ON "RecommendationOutcome"("poolId", "createdAt");
CREATE INDEX IF NOT EXISTS "RecommendationOutcome_status_idx"
  ON "RecommendationOutcome"("status");

CREATE INDEX IF NOT EXISTS "BrainFeedback_userId_idx"
  ON "BrainFeedback"("userId");
CREATE INDEX IF NOT EXISTS "BrainFeedback_poolId_idx"
  ON "BrainFeedback"("poolId");
CREATE INDEX IF NOT EXISTS "BrainFeedback_contextType_contextId_idx"
  ON "BrainFeedback"("contextType", "contextId");
CREATE INDEX IF NOT EXISTS "BrainFeedback_status_createdAt_idx"
  ON "BrainFeedback"("status", "createdAt");

CREATE INDEX IF NOT EXISTS "KnowledgeArticle_status_audience_idx"
  ON "KnowledgeArticle"("status", "audience");
CREATE INDEX IF NOT EXISTS "KnowledgeArticle_category_idx"
  ON "KnowledgeArticle"("category");

CREATE INDEX IF NOT EXISTS "KnowledgeRevision_articleId_locale_idx"
  ON "KnowledgeRevision"("articleId", "locale");
CREATE INDEX IF NOT EXISTS "KnowledgeRevision_reviewedAt_idx"
  ON "KnowledgeRevision"("reviewedAt");

CREATE INDEX IF NOT EXISTS "BrainEventOutbox_aggregateType_aggregateId_idx"
  ON "BrainEventOutbox"("aggregateType", "aggregateId");
CREATE INDEX IF NOT EXISTS "BrainEventOutbox_type_createdAt_idx"
  ON "BrainEventOutbox"("type", "createdAt");
