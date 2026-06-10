-- AlterTable
ALTER TABLE "LocationPublicProfile" ADD COLUMN     "customReviewUrl" TEXT,
ADD COLUMN     "facebookReviewUrl" TEXT,
ADD COLUMN     "highRatingDestinations" TEXT[] DEFAULT ARRAY['GOOGLE']::TEXT[],
ADD COLUMN     "highRatingMode" TEXT NOT NULL DEFAULT 'SINGLE',
ADD COLUMN     "highRatingPrimaryDestination" TEXT,
ADD COLUMN     "lowRatingCustomUrl" TEXT,
ADD COLUMN     "lowRatingDestination" TEXT NOT NULL DEFAULT 'PRIVATE';

-- Carry over the previously-added positiveReviewDestination so existing
-- WeHearYou-capture locations keep their behavior under the new model.
UPDATE "LocationPublicProfile"
  SET "highRatingDestinations" = ARRAY['WEHEARYOU']::TEXT[]
  WHERE "positiveReviewDestination" = 'WEHEARYOU';
