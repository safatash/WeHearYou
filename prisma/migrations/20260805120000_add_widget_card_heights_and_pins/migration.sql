-- Widget editor / public embed parity: persist four settings the Widget Studio
-- already exposes but that had no column to write to. `updateReviewWidget` was
-- silently dropping them ("// field not in schema"), so the editor let admins
-- pick a value that the public embed could never receive.
--
--   cardHeights       "natural" | "equal"  — Wall of Love card sizing
--   pinnedReviewIds   CSV of Review.id, admin pin order preserved
--   spotlightReviewId single featured Review.id
--   reviewHighlights  JSON [{reviewId, quote}] of highlighted phrases
--
-- BACKFILL / HISTORICAL REPRESENTATION
-- ------------------------------------
-- There is deliberately **no data backfill** here, and no inversion of existing
-- values. These columns never existed, so no widget has ever stored a
-- cardHeights value of any kind: `getPublicReviewWidgetPayload` hardcoded
-- `?? "equal"` for every widget, and the embed therefore rendered every
-- existing Wall of Love with equal-height cards.
--
-- Defaulting the new column to 'equal' reproduces that rendering byte for byte,
-- so every existing customer widget keeps exactly the appearance it has today.
-- Flipping existing rows to 'natural' would *change* live widgets to something
-- no admin has ever seen, which is why it is not done.
--
-- The other three columns default to empty, which is likewise what the payload
-- builder already substituted for them.
--
-- ROLLBACK
-- --------
-- Reversible with no data loss to any pre-existing setting, because every value
-- in these columns is new:
--
--   ALTER TABLE "ReviewWidget"
--     DROP COLUMN IF EXISTS "cardHeights",
--     DROP COLUMN IF EXISTS "pinnedReviewIds",
--     DROP COLUMN IF EXISTS "spotlightReviewId",
--     DROP COLUMN IF EXISTS "reviewHighlights";
--
-- Dropping them returns every widget to the hardcoded 'equal' / no-pins
-- behaviour that predates this migration.
--
-- Idempotent ADD COLUMN IF NOT EXISTS, matching the convention established by
-- 20260623120000_fix_review_widget_drift, so re-running cannot fail mid-way.

ALTER TABLE "ReviewWidget"
  ADD COLUMN IF NOT EXISTS "cardHeights" TEXT NOT NULL DEFAULT 'equal',
  ADD COLUMN IF NOT EXISTS "pinnedReviewIds" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "spotlightReviewId" TEXT,
  ADD COLUMN IF NOT EXISTS "reviewHighlights" TEXT NOT NULL DEFAULT '';
