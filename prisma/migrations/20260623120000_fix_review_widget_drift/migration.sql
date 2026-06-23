-- Fix ReviewWidget schema drift: these columns were added to schema.prisma
-- during the Widget Studio work without a corresponding migration, so the
-- database was missing them and every ReviewWidget query (e.g. /widgets)
-- failed with "column does not exist".
--
-- Pure ADD COLUMN IF NOT EXISTS so it is fully idempotent and cannot fail
-- mid-migration: safe whether none of the columns exist (production / fresh
-- DBs) or some already do (dev). Each column carries its schema default, so
-- existing rows get valid non-null values.

ALTER TABLE "ReviewWidget"
  ADD COLUMN IF NOT EXISTS "cardStyle" TEXT NOT NULL DEFAULT 'border',
  ADD COLUMN IF NOT EXISTS "collectSubtitle" TEXT,
  ADD COLUMN IF NOT EXISTS "collectTitle" TEXT,
  ADD COLUMN IF NOT EXISTS "cornerRadius" INTEGER NOT NULL DEFAULT 12,
  ADD COLUMN IF NOT EXISTS "density" TEXT NOT NULL DEFAULT 'cozy',
  ADD COLUMN IF NOT EXISTS "enabledSources" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "gridColumns" TEXT NOT NULL DEFAULT 'auto',
  ADD COLUMN IF NOT EXISTS "showBranding" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "starColorMode" TEXT NOT NULL DEFAULT 'gold',
  ADD COLUMN IF NOT EXISTS "wallStyle" TEXT NOT NULL DEFAULT 'varied';
