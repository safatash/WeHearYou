-- CreateTable
CREATE TABLE "FacebookPageConnection" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT,
    "userName" TEXT,
    "userEmail" TEXT,
    "accessToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "lastSyncedAt" TIMESTAMP(3),
    "lastSyncStatus" TEXT,
    "lastSyncMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FacebookPageConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FacebookPage" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "pageName" TEXT NOT NULL,
    "pageAccessToken" TEXT NOT NULL,
    "locationId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncedAt" TIMESTAMP(3),
    "lastSyncStatus" TEXT,
    "lastSyncMessage" TEXT,
    "lastSyncImportedCount" INTEGER,
    "lastSyncUpdatedCount" INTEGER,
    "lastSyncSkippedCount" INTEGER,
    "lastSyncFetchedCount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FacebookPage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FacebookPageConnection_organizationId_idx" ON "FacebookPageConnection"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "FacebookPage_locationId_key" ON "FacebookPage"("locationId");

-- CreateIndex
CREATE UNIQUE INDEX "FacebookPage_connectionId_pageId_key" ON "FacebookPage"("connectionId", "pageId");

-- CreateIndex
CREATE INDEX "FacebookPage_connectionId_idx" ON "FacebookPage"("connectionId");

-- AddForeignKey
ALTER TABLE "FacebookPageConnection" ADD CONSTRAINT "FacebookPageConnection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacebookPage" ADD CONSTRAINT "FacebookPage_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "FacebookPageConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacebookPage" ADD CONSTRAINT "FacebookPage_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;
