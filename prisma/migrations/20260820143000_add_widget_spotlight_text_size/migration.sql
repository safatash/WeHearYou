-- Wall of Love spotlight typography: preserve existing behavior while allowing
-- a dedicated, validated review-text size for the accent spotlight card.
ALTER TABLE "ReviewWidget"
  ADD COLUMN IF NOT EXISTS "spotlightTextSize" INTEGER NOT NULL DEFAULT 18;
