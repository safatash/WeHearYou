-- Add per-widget AI summary toggle (idempotent for drift safety).
ALTER TABLE "ReviewWidget" ADD COLUMN IF NOT EXISTS "showAiSummary" BOOLEAN NOT NULL DEFAULT true;
