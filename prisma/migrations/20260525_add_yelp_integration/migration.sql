-- Add YELP to ReviewSource enum
ALTER TYPE "ReviewSource" ADD VALUE 'YELP';

-- Add Yelp fields to Location
ALTER TABLE "Location" ADD COLUMN "yelpBusinessUrl" TEXT;
ALTER TABLE "Location" ADD COLUMN "yelpBusinessName" TEXT;
ALTER TABLE "Location" ADD COLUMN "yelpBusinessId" TEXT;
ALTER TABLE "Location" ADD COLUMN "yelpConnectedAt" TIMESTAMP(3);
ALTER TABLE "Location" ADD COLUMN "yelpLastSyncAt" TIMESTAMP(3);
ALTER TABLE "Location" ADD COLUMN "yelpLastSyncStatus" TEXT;
ALTER TABLE "Location" ADD COLUMN "yelpLastSyncCount" INTEGER;
