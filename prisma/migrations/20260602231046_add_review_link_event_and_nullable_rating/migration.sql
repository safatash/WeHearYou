-- CreateEnum
CREATE TYPE "ReviewLinkEventType" AS ENUM ('LINK_VIEWED', 'HAPPY_CLICKED', 'UNHAPPY_CLICKED', 'GOOGLE_REDIRECT_CLICKED', 'FEEDBACK_STARTED', 'FEEDBACK_SUBMITTED');

-- AlterTable
ALTER TABLE "Review" ALTER COLUMN "rating" DROP NOT NULL;

-- CreateTable
CREATE TABLE "ReviewLinkEvent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "eventType" "ReviewLinkEventType" NOT NULL,
    "source" TEXT,
    "medium" TEXT,
    "placement" TEXT,
    "referrer" TEXT,
    "sessionId" TEXT,
    "clientIp" TEXT,
    "reviewLinkId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewLinkEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReviewLinkEvent_organizationId_createdAt_idx" ON "ReviewLinkEvent"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "ReviewLinkEvent_locationId_createdAt_idx" ON "ReviewLinkEvent"("locationId", "createdAt");

-- CreateIndex
CREATE INDEX "ReviewLinkEvent_locationId_eventType_createdAt_idx" ON "ReviewLinkEvent"("locationId", "eventType", "createdAt");

-- CreateIndex
CREATE INDEX "ReviewLinkEvent_locationId_source_createdAt_idx" ON "ReviewLinkEvent"("locationId", "source", "createdAt");

-- CreateIndex
CREATE INDEX "ReviewLinkEvent_locationId_sessionId_createdAt_idx" ON "ReviewLinkEvent"("locationId", "sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "ReviewLinkEvent_locationId_clientIp_createdAt_idx" ON "ReviewLinkEvent"("locationId", "clientIp", "createdAt");

-- AddForeignKey
ALTER TABLE "ReviewLinkEvent" ADD CONSTRAINT "ReviewLinkEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewLinkEvent" ADD CONSTRAINT "ReviewLinkEvent_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
