-- AI Review Assistant: new event types
ALTER TYPE "ReviewLinkEventType" ADD VALUE 'AI_ASSIST_VIEWED';
ALTER TYPE "ReviewLinkEventType" ADD VALUE 'AI_ASSIST_GENERATED';
ALTER TYPE "ReviewLinkEventType" ADD VALUE 'AI_ASSIST_REGENERATED';
ALTER TYPE "ReviewLinkEventType" ADD VALUE 'AI_ASSIST_EDITED';
ALTER TYPE "ReviewLinkEventType" ADD VALUE 'AI_ASSIST_COPIED';
ALTER TYPE "ReviewLinkEventType" ADD VALUE 'AI_ASSIST_DEST_GOOGLE';
ALTER TYPE "ReviewLinkEventType" ADD VALUE 'AI_ASSIST_DEST_YELP';
ALTER TYPE "ReviewLinkEventType" ADD VALUE 'AI_ASSIST_DEST_FACEBOOK';
ALTER TYPE "ReviewLinkEventType" ADD VALUE 'AI_ASSIST_DEST_TRUSTPILOT';
ALTER TYPE "ReviewLinkEventType" ADD VALUE 'AI_ASSIST_WEHEARYOU_SUBMITTED';

-- AI Review Assistant: settings on LocationPublicProfile
ALTER TABLE "LocationPublicProfile"
  ADD COLUMN "aiAssistantEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "aiAssistantAllowGeneration" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "aiAssistantAllowTone" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "aiAssistantAllowLength" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "aiAssistantAllowRegenerate" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "aiAssistantAllowNotes" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "aiAssistantIncludeBusiness" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "aiAssistantIncludeCity" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "aiAssistantIncludeService" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "aiAssistantUseReviewThemes" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "aiAssistantCustomChips" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "trustpilotReviewUrl" TEXT,
  ADD COLUMN "wehearyouReviewsEnabled" BOOLEAN NOT NULL DEFAULT true;

-- AI Review Assistant: per-session record
CREATE TABLE "ReviewAssistantSession" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "locationId" TEXT NOT NULL,
  "campaignRecipientId" TEXT,
  "rating" INTEGER NOT NULL,
  "selectedPhrases" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "service" TEXT,
  "staffMember" TEXT,
  "notes" TEXT,
  "generatedReview" TEXT,
  "tone" TEXT,
  "length" TEXT,
  "destination" TEXT,
  "reviewCopied" BOOLEAN NOT NULL DEFAULT false,
  "destinationClicked" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ReviewAssistantSession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ReviewAssistantSession_locationId_createdAt_idx" ON "ReviewAssistantSession"("locationId", "createdAt");
CREATE INDEX "ReviewAssistantSession_organizationId_createdAt_idx" ON "ReviewAssistantSession"("organizationId", "createdAt");

ALTER TABLE "ReviewAssistantSession" ADD CONSTRAINT "ReviewAssistantSession_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReviewAssistantSession" ADD CONSTRAINT "ReviewAssistantSession_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;
