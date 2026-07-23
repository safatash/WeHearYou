-- Allow Organization.planId to be NULL so a cancelled/ended subscription can be
-- represented as "no active plan" (rather than silently reverting to starter).
-- Idempotent: DROP NOT NULL on an already-nullable column is a no-op in Postgres.
ALTER TABLE "Organization" ALTER COLUMN "planId" DROP NOT NULL;
