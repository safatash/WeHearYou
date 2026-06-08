-- AlterTable
ALTER TABLE "AutomationRun" ADD COLUMN     "completedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "automationRunId" TEXT;

-- CreateTable
CREATE TABLE "AutomationStepExecution" (
    "id" TEXT NOT NULL,
    "automationRunId" TEXT NOT NULL,
    "automationStepId" TEXT NOT NULL,
    "automationJobId" TEXT,
    "campaignId" TEXT,
    "status" TEXT NOT NULL,
    "detail" TEXT,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AutomationStepExecution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AutomationStepExecution_automationJobId_key" ON "AutomationStepExecution"("automationJobId");

-- CreateIndex
CREATE UNIQUE INDEX "AutomationStepExecution_campaignId_key" ON "AutomationStepExecution"("campaignId");

-- CreateIndex
CREATE INDEX "AutomationStepExecution_automationRunId_idx" ON "AutomationStepExecution"("automationRunId");

-- CreateIndex
CREATE INDEX "AutomationStepExecution_automationStepId_idx" ON "AutomationStepExecution"("automationStepId");

-- CreateIndex
CREATE INDEX "Campaign_automationRunId_idx" ON "Campaign"("automationRunId");

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_automationRunId_fkey" FOREIGN KEY ("automationRunId") REFERENCES "AutomationRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationStepExecution" ADD CONSTRAINT "AutomationStepExecution_automationRunId_fkey" FOREIGN KEY ("automationRunId") REFERENCES "AutomationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationStepExecution" ADD CONSTRAINT "AutomationStepExecution_automationStepId_fkey" FOREIGN KEY ("automationStepId") REFERENCES "AutomationStep"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationStepExecution" ADD CONSTRAINT "AutomationStepExecution_automationJobId_fkey" FOREIGN KEY ("automationJobId") REFERENCES "AutomationJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationStepExecution" ADD CONSTRAINT "AutomationStepExecution_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;
