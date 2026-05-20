-- CreateEnum
CREATE TYPE "VideoTestimonialStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "VideoTestimonial" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "submitterName" TEXT,
    "submitterEmail" TEXT,
    "videoUrl" TEXT,
    "mimeType" TEXT,
    "durationSeconds" INTEGER,
    "status" "VideoTestimonialStatus" NOT NULL DEFAULT 'PENDING',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoTestimonial_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VideoTestimonial_token_key" ON "VideoTestimonial"("token");

-- CreateIndex
CREATE INDEX "VideoTestimonial_locationId_idx" ON "VideoTestimonial"("locationId");

-- CreateIndex
CREATE INDEX "VideoTestimonial_token_idx" ON "VideoTestimonial"("token");

-- CreateIndex
CREATE INDEX "VideoTestimonial_status_idx" ON "VideoTestimonial"("status");

-- AddForeignKey
ALTER TABLE "VideoTestimonial" ADD CONSTRAINT "VideoTestimonial_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;
