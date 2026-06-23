-- New enums
CREATE TYPE "ResolutionStatus" AS ENUM ('NEW', 'NEEDS_RESPONSE', 'CONTACTED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');
CREATE TYPE "ResolutionPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE "ResolutionContactPreference" AS ENUM ('PHONE', 'EMAIL', 'NONE');

-- New ReviewLinkEventType values
ALTER TYPE "ReviewLinkEventType" ADD VALUE 'RESOLUTION_VIEWED';
ALTER TYPE "ReviewLinkEventType" ADD VALUE 'RESOLUTION_ISSUE_SELECTED';
ALTER TYPE "ReviewLinkEventType" ADD VALUE 'RESOLUTION_FEEDBACK_STARTED';
ALTER TYPE "ReviewLinkEventType" ADD VALUE 'RESOLUTION_AI_REWRITE_GENERATED';
ALTER TYPE "ReviewLinkEventType" ADD VALUE 'RESOLUTION_AI_REWRITE_ACCEPTED';
ALTER TYPE "ReviewLinkEventType" ADD VALUE 'RESOLUTION_FEEDBACK_SUBMITTED';
ALTER TYPE "ReviewLinkEventType" ADD VALUE 'RESOLUTION_CONTACT_REQUESTED';
ALTER TYPE "ReviewLinkEventType" ADD VALUE 'RESOLUTION_CASE_CREATED';
ALTER TYPE "ReviewLinkEventType" ADD VALUE 'RESOLUTION_RESPONSE_DRAFTED';
ALTER TYPE "ReviewLinkEventType" ADD VALUE 'RESOLUTION_CASE_RESOLVED';
ALTER TYPE "ReviewLinkEventType" ADD VALUE 'RESOLUTION_FOLLOWUP_SENT';
ALTER TYPE "ReviewLinkEventType" ADD VALUE 'RESOLUTION_FOLLOWUP_COMPLETED';

-- ResolutionAssistantSettings
CREATE TABLE "ResolutionAssistantSettings" (
  "id" TEXT NOT NULL,
  "locationId" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "allowAiRewrite" BOOLEAN NOT NULL DEFAULT true,
  "allowAiSummary" BOOLEAN NOT NULL DEFAULT true,
  "allowPriorityClassification" BOOLEAN NOT NULL DEFAULT true,
  "allowAiResponseDrafts" BOOLEAN NOT NULL DEFAULT true,
  "followUpEnabled" BOOLEAN NOT NULL DEFAULT true,
  "notifyOnNewFeedback" BOOLEAN NOT NULL DEFAULT true,
  "notifyOnlyHighCritical" BOOLEAN NOT NULL DEFAULT false,
  "notifyEmails" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "notifySmsRecipients" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ResolutionAssistantSettings_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ResolutionAssistantSettings_locationId_key" ON "ResolutionAssistantSettings"("locationId");
ALTER TABLE "ResolutionAssistantSettings" ADD CONSTRAINT "ResolutionAssistantSettings_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ResolutionCase
CREATE TABLE "ResolutionCase" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "locationId" TEXT NOT NULL,
  "campaignRecipientId" TEXT,
  "reviewId" TEXT,
  "contactId" TEXT,
  "rating" INTEGER NOT NULL,
  "issueCategories" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "originalFeedback" TEXT NOT NULL,
  "aiClearFeedback" TEXT,
  "finalFeedback" TEXT NOT NULL,
  "contactPreference" "ResolutionContactPreference" NOT NULL DEFAULT 'NONE',
  "customerName" TEXT,
  "customerEmail" TEXT,
  "customerPhone" TEXT,
  "requestedOutcome" TEXT,
  "aiSummary" TEXT,
  "priority" "ResolutionPriority" NOT NULL DEFAULT 'MEDIUM',
  "status" "ResolutionStatus" NOT NULL DEFAULT 'NEW',
  "assignedToMembershipId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "resolvedAt" TIMESTAMP(3),
  "closedAt" TIMESTAMP(3),
  CONSTRAINT "ResolutionCase_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ResolutionCase_reviewId_key" ON "ResolutionCase"("reviewId");
CREATE INDEX "ResolutionCase_locationId_status_createdAt_idx" ON "ResolutionCase"("locationId", "status", "createdAt");
CREATE INDEX "ResolutionCase_organizationId_createdAt_idx" ON "ResolutionCase"("organizationId", "createdAt");
CREATE INDEX "ResolutionCase_priority_idx" ON "ResolutionCase"("priority");
ALTER TABLE "ResolutionCase" ADD CONSTRAINT "ResolutionCase_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ResolutionCase" ADD CONSTRAINT "ResolutionCase_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ResolutionCase" ADD CONSTRAINT "ResolutionCase_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ResolutionCase" ADD CONSTRAINT "ResolutionCase_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ResolutionCase" ADD CONSTRAINT "ResolutionCase_assignedToMembershipId_fkey" FOREIGN KEY ("assignedToMembershipId") REFERENCES "UserMembership"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ResolutionCaseNote
CREATE TABLE "ResolutionCaseNote" (
  "id" TEXT NOT NULL,
  "caseId" TEXT NOT NULL,
  "membershipId" TEXT,
  "kind" TEXT NOT NULL DEFAULT 'NOTE',
  "body" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ResolutionCaseNote_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ResolutionCaseNote_caseId_createdAt_idx" ON "ResolutionCaseNote"("caseId", "createdAt");
ALTER TABLE "ResolutionCaseNote" ADD CONSTRAINT "ResolutionCaseNote_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "ResolutionCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ResolutionCaseNote" ADD CONSTRAINT "ResolutionCaseNote_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "UserMembership"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ResolutionFollowUp
CREATE TABLE "ResolutionFollowUp" (
  "id" TEXT NOT NULL,
  "caseId" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "channel" TEXT,
  "sentAt" TIMESTAMP(3),
  "response" TEXT,
  "responseDetail" TEXT,
  "respondedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ResolutionFollowUp_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ResolutionFollowUp_token_key" ON "ResolutionFollowUp"("token");
CREATE INDEX "ResolutionFollowUp_caseId_idx" ON "ResolutionFollowUp"("caseId");
ALTER TABLE "ResolutionFollowUp" ADD CONSTRAINT "ResolutionFollowUp_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "ResolutionCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
