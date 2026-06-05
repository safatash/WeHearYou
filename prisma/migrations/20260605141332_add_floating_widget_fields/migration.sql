-- AlterTable
ALTER TABLE "ReviewWidget" ADD COLUMN     "floatingAccentColor" TEXT,
ADD COLUMN     "floatingAccentColorMode" TEXT,
ADD COLUMN     "floatingApprovedOnly" BOOLEAN,
ADD COLUMN     "floatingCardStyle" TEXT,
ADD COLUMN     "floatingDisplayFrequency" TEXT,
ADD COLUMN     "floatingMinRating" INTEGER,
ADD COLUMN     "floatingMobileBehavior" TEXT,
ADD COLUMN     "floatingPosition" TEXT,
ADD COLUMN     "floatingRotationEnabled" BOOLEAN,
ADD COLUMN     "floatingRotationIntervalSec" INTEGER,
ADD COLUMN     "floatingVariation" TEXT;
