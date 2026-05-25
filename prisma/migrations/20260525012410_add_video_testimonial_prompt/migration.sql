-- AlterTable
ALTER TABLE "ReviewWidget" ADD COLUMN     "contentType" TEXT NOT NULL DEFAULT 'TEXT';

-- AlterTable
ALTER TABLE "VideoTestimonial" ADD COLUMN     "prompt" TEXT;
