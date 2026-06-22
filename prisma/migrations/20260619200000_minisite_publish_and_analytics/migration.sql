-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.

ALTER TYPE "ReviewLinkEventType" ADD VALUE 'MINISITE_VIEWED';
ALTER TYPE "ReviewLinkEventType" ADD VALUE 'MINISITE_CLICK_REVIEW';
ALTER TYPE "ReviewLinkEventType" ADD VALUE 'MINISITE_CLICK_CALL';
ALTER TYPE "ReviewLinkEventType" ADD VALUE 'MINISITE_CLICK_WEBSITE';
ALTER TYPE "ReviewLinkEventType" ADD VALUE 'MINISITE_CLICK_DIRECTIONS';
ALTER TYPE "ReviewLinkEventType" ADD VALUE 'MINISITE_CLICK_CTA';

-- AlterTable
ALTER TABLE "Location" ADD COLUMN     "miniSitePublished" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "miniSitePublishedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "LocationPublicProfile" ADD COLUMN     "accentColor" TEXT,
ADD COLUMN     "ctaType" TEXT DEFAULT 'REVIEW',
ADD COLUMN     "enabledReviewSources" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "reviewHighlights" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "secondaryCtaLabel" TEXT,
ADD COLUMN     "secondaryCtaType" TEXT,
ADD COLUMN     "services" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "showFeaturedReviews" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "showPoweredBy" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "showReviewSummary" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "showServices" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "showSourceBadges" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "showVerifiedBadge" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "timezone" TEXT,
ADD COLUMN     "websiteUrl" TEXT;

-- AlterTable
ALTER TABLE "Review" ADD COLUMN     "isHiddenFromMiniSite" BOOLEAN NOT NULL DEFAULT false;
