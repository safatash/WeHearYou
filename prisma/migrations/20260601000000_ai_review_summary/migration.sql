-- prisma/migrations/20260601000000_ai_review_summary/migration.sql
ALTER TABLE "LocationPublicProfile"
  ADD COLUMN "showAiReviewSummary"        BOOLEAN   NOT NULL DEFAULT false,
  ADD COLUMN "aiReviewSummary"            TEXT,
  ADD COLUMN "aiReviewSummaryAt"          TIMESTAMP(3),
  ADD COLUMN "aiReviewSummaryReviewCount" INTEGER;
