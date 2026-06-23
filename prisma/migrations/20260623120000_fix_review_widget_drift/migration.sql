-- Fix ReviewWidget schema drift: these columns were added to schema.prisma
-- during the Widget Studio work without a corresponding migration, so the
-- live database was missing them and every ReviewWidget query (e.g. /widgets)
-- failed with "column does not exist". Idempotent so it is safe to re-run.

ALTER TABLE "ReviewWidget"
  ADD COLUMN IF NOT EXISTS "cardStyle" TEXT NOT NULL DEFAULT 'border',
  ADD COLUMN IF NOT EXISTS "collectSubtitle" TEXT,
  ADD COLUMN IF NOT EXISTS "collectTitle" TEXT,
  ADD COLUMN IF NOT EXISTS "cornerRadius" INTEGER NOT NULL DEFAULT 12,
  ADD COLUMN IF NOT EXISTS "density" TEXT NOT NULL DEFAULT 'cozy',
  ADD COLUMN IF NOT EXISTS "gridColumns" TEXT NOT NULL DEFAULT 'auto',
  ADD COLUMN IF NOT EXISTS "showBranding" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "starColorMode" TEXT NOT NULL DEFAULT 'gold',
  ADD COLUMN IF NOT EXISTS "wallStyle" TEXT NOT NULL DEFAULT 'varied';

-- enabledSources: backfill any NULLs and set the default so Prisma never reads
-- a NULL into the non-nullable String field. (We intentionally do NOT add a
-- NOT NULL constraint or DROP a column here — those are non-idempotent and can
-- fail mid-migration; they are unnecessary to fix the runtime error.)
UPDATE "ReviewWidget" SET "enabledSources" = '' WHERE "enabledSources" IS NULL;
ALTER TABLE "ReviewWidget" ALTER COLUMN "enabledSources" SET DEFAULT '';
