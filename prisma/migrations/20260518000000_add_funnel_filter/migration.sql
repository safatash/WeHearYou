-- AlterTable
ALTER TABLE "LocationPublicProfile"
  ADD COLUMN "negativeFilterEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "negativeFilterThreshold" INTEGER NOT NULL DEFAULT 4;
