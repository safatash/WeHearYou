-- CreateTable MetaAccountConnection
CREATE TABLE "MetaAccountConnection" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "pageId" TEXT,
    "pageName" TEXT,
    "accessToken" TEXT,
    "tokenType" TEXT,
    "expiresAt" TIMESTAMP(3),
    "lastSyncedAt" TIMESTAMP(3),
    "lastBatchSyncStatus" TEXT,
    "lastBatchSyncMessage" TEXT,
    "lastBatchSyncedCount" INTEGER,
    "lastBatchFailedCount" INTEGER,
    "lastBatchFailedNames" TEXT,
    "lastBatchImportedCount" INTEGER,
    "lastBatchUpdatedCount" INTEGER,
    "lastBatchSkippedCount" INTEGER,
    "lastBatchFetchedCount" INTEGER,
    "lastBatchSyncAt" TIMESTAMP(3),
    "reviewCount" INTEGER DEFAULT 0,
    "connectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MetaAccountConnection_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "MetaAccountConnection" ADD CONSTRAINT "MetaAccountConnection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE;

-- CreateIndex
CREATE INDEX "MetaAccountConnection_organizationId_idx" ON "MetaAccountConnection"("organizationId");

-- AlterTable Location
ALTER TABLE "Location" ADD COLUMN "metaConnectionId" TEXT;

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_metaConnectionId_fkey" FOREIGN KEY ("metaConnectionId") REFERENCES "MetaAccountConnection" ("id") ON DELETE SET NULL;

-- CreateIndex
CREATE INDEX "Location_metaConnectionId_idx" ON "Location"("metaConnectionId");
