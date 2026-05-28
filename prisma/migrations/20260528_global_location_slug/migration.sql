-- Resolve duplicate slugs across orgs before enforcing global uniqueness.
-- For each group of locations sharing the same slug, the earliest-created row
-- keeps the slug as-is; subsequent rows get "-2", "-3", etc.
DO $$
DECLARE
  rec RECORD;
  counter INT;
  new_slug TEXT;
BEGIN
  FOR rec IN
    SELECT id, slug, "createdAt",
           ROW_NUMBER() OVER (PARTITION BY slug ORDER BY "createdAt") AS rn
    FROM "Location"
    WHERE slug IN (
      SELECT slug FROM "Location" GROUP BY slug HAVING COUNT(*) > 1
    )
    ORDER BY slug, "createdAt"
  LOOP
    IF rec.rn > 1 THEN
      counter := rec.rn;
      LOOP
        new_slug := rec.slug || '-' || counter;
        EXIT WHEN NOT EXISTS (SELECT 1 FROM "Location" WHERE slug = new_slug);
        counter := counter + 1;
      END LOOP;
      UPDATE "Location" SET slug = new_slug WHERE id = rec.id;
    END IF;
  END LOOP;
END $$;

-- Drop old composite unique constraint
ALTER TABLE "Location" DROP CONSTRAINT IF EXISTS "Location_organizationId_slug_key";

-- Add global unique constraint
ALTER TABLE "Location" ADD CONSTRAINT "Location_slug_key" UNIQUE ("slug");
