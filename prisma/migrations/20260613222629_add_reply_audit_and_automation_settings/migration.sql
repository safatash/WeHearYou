-- AlterTable
ALTER TABLE "Location" ADD COLUMN     "googleAutoReplyDailyCap" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "googleAutoReplyEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "googleAutoReplyLastUsedAt" TIMESTAMP(3),
ADD COLUMN     "googleAutoReplyThreshold" INTEGER NOT NULL DEFAULT 4;

-- CreateTable
CREATE TABLE "ReplyAuditLog" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "resultStatus" TEXT NOT NULL,
    "draftText" TEXT,
    "errorMessage" TEXT,
    "safetyClassification" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReplyAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReplyAuditLog_reviewId_idx" ON "ReplyAuditLog"("reviewId");

-- CreateIndex
CREATE INDEX "ReplyAuditLog_locationId_idx" ON "ReplyAuditLog"("locationId");

-- CreateIndex
CREATE INDEX "ReplyAuditLog_userId_idx" ON "ReplyAuditLog"("userId");

-- CreateIndex
CREATE INDEX "ReplyAuditLog_action_idx" ON "ReplyAuditLog"("action");

-- CreateIndex
CREATE INDEX "ReplyAuditLog_resultStatus_idx" ON "ReplyAuditLog"("resultStatus");
