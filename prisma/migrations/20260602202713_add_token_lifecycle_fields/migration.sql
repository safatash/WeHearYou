-- AlterTable
ALTER TABLE "CampaignRecipient" ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "revokedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "VideoTestimonial" ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "revokedAt" TIMESTAMP(3),
ADD COLUMN     "usedAt" TIMESTAMP(3);
