-- CreateEnum
CREATE TYPE "ThumbnailSource" AS ENUM ('DEFAULT', 'CUSTOM', 'CAPTURED');

-- AlterTable
ALTER TABLE "VideoTestimonial" ADD COLUMN     "capturedFrameTimestamp" DOUBLE PRECISION,
ADD COLUMN     "capturedFrameUrl" TEXT,
ADD COLUMN     "customThumbnailUrl" TEXT,
ADD COLUMN     "thumbnailSource" "ThumbnailSource" NOT NULL DEFAULT 'DEFAULT';
