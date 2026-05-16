-- AlterTable
ALTER TABLE "ReviewWidget"
  ADD COLUMN "showAvgRating"   BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "showReviewCount" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "headerAlign"     TEXT    NOT NULL DEFAULT 'left',
  ADD COLUMN "bodyMaxChars"    INTEGER NOT NULL DEFAULT 280,
  ADD COLUMN "primaryColor"    TEXT    NOT NULL DEFAULT '#4338ca',
  ADD COLUMN "starColor"       TEXT    NOT NULL DEFAULT '#f59e0b',
  ADD COLUMN "backgroundColor" TEXT    NOT NULL DEFAULT '#ffffff',
  ADD COLUMN "textColor"       TEXT    NOT NULL DEFAULT '#0f172a',
  ADD COLUMN "fontFamily"      TEXT    NOT NULL DEFAULT 'system';
