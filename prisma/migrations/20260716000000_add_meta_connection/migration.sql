-- CreateTable MetaAccountConnection
CREATE TABLE "MetaAccountConnection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "pageId" TEXT,
    "pageName" TEXT,
    "accessToken" TEXT,
    "tokenType" TEXT,
    "expiresAt" DATETIME,
    "lastSyncedAt" DATETIME,
    "lastBatchSyncStatus" TEXT,
    "lastBatchSyncMessage" TEXT,
    "lastBatchSyncedCount" INTEGER,
    "lastBatchFailedCount" INTEGER,
    "lastBatchFailedNames" TEXT,
    "lastBatchImportedCount" INTEGER,
    "lastBatchUpdatedCount" INTEGER,
    "lastBatchSkippedCount" INTEGER,
    "lastBatchFetchedCount" INTEGER,
    "lastBatchSyncAt" DATETIME,
    "reviewCount" INTEGER DEFAULT 0,
    "connectedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MetaAccountConnection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE
);

-- CreateIndex
CREATE INDEX "MetaAccountConnection_organizationId_idx" ON "MetaAccountConnection"("organizationId");

-- AlterTable Location
ALTER TABLE "Location" ADD COLUMN "metaConnectionId" TEXT;

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_metaConnectionId_fkey" FOREIGN KEY ("metaConnectionId") REFERENCES "MetaAccountConnection" ("id") ON DELETE SET NULL;

-- CreateIndex
CREATE INDEX "Location_metaConnectionId_idx" ON "Location"("metaConnectionId");
