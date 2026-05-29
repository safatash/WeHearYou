-- CreateEnum
CREATE TYPE "GbpPostType" AS ENUM ('WHATS_NEW', 'OFFER', 'EVENT');

-- CreateEnum
CREATE TYPE "GbpPublishStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'PUBLISHED', 'FAILED');

-- AlterEnum
ALTER TYPE "AutomationStepType" ADD VALUE 'PUBLISH_GBP_REPLY';

-- DropIndex
DROP INDEX "Location_organizationId_slug_key";

-- AlterTable
ALTER TABLE "Review" ADD COLUMN     "replyGbpId" TEXT,
ADD COLUMN     "replyPublishedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "GbpPost" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "postType" "GbpPostType" NOT NULL,
    "content" TEXT NOT NULL,
    "callToAction" JSONB,
    "imageUrl" TEXT,
    "status" "GbpPublishStatus" NOT NULL DEFAULT 'DRAFT',
    "scheduledAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "gbpPostId" TEXT,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GbpPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GbpPhoto" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "storageUrl" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "caption" TEXT,
    "status" "GbpPublishStatus" NOT NULL DEFAULT 'DRAFT',
    "scheduledAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "gbpMediaId" TEXT,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GbpPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GbpQuestion" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "gbpQuestionId" TEXT NOT NULL,
    "questionText" TEXT NOT NULL,
    "askedAt" TIMESTAMP(3) NOT NULL,
    "answerText" TEXT,
    "answeredAt" TIMESTAMP(3),
    "gbpAnswerId" TEXT,
    "syncedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GbpQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GbpSyncLog" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "syncType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "itemsSynced" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GbpSyncLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GbpPost_locationId_idx" ON "GbpPost"("locationId");

-- CreateIndex
CREATE INDEX "GbpPost_status_scheduledAt_idx" ON "GbpPost"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "GbpPhoto_locationId_idx" ON "GbpPhoto"("locationId");

-- CreateIndex
CREATE INDEX "GbpPhoto_status_scheduledAt_idx" ON "GbpPhoto"("status", "scheduledAt");

-- CreateIndex
CREATE UNIQUE INDEX "GbpQuestion_gbpQuestionId_key" ON "GbpQuestion"("gbpQuestionId");

-- CreateIndex
CREATE INDEX "GbpQuestion_locationId_idx" ON "GbpQuestion"("locationId");

-- CreateIndex
CREATE INDEX "GbpQuestion_answeredAt_idx" ON "GbpQuestion"("answeredAt");

-- CreateIndex
CREATE INDEX "GbpSyncLog_locationId_idx" ON "GbpSyncLog"("locationId");

-- AddForeignKey
ALTER TABLE "GbpPost" ADD CONSTRAINT "GbpPost_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GbpPhoto" ADD CONSTRAINT "GbpPhoto_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GbpQuestion" ADD CONSTRAINT "GbpQuestion_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GbpSyncLog" ADD CONSTRAINT "GbpSyncLog_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;
