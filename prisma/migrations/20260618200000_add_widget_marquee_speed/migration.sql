-- Add marquee scroll speed for the Review Marquee widget layout.
ALTER TABLE "ReviewWidget" ADD COLUMN IF NOT EXISTS "marqueeSpeed" TEXT NOT NULL DEFAULT 'normal';
