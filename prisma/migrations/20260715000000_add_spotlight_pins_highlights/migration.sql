-- Add Spotlight, Pins, and Highlights fields to ReviewWidget
-- Also adds cardHeights which was added to schema.prisma but never migrated.
-- All ADD COLUMN IF NOT EXISTS so this is fully idempotent.
ALTER TABLE "ReviewWidget"
  ADD COLUMN IF NOT EXISTS "cardHeights"       TEXT NOT NULL DEFAULT 'equal',
  ADD COLUMN IF NOT EXISTS "spotlightReviewId" TEXT,
  ADD COLUMN IF NOT EXISTS "pinnedReviewIds"   TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "reviewHighlights"  TEXT NOT NULL DEFAULT '';
