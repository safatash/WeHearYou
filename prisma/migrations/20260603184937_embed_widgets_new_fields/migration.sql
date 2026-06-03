-- AlterTable
ALTER TABLE "ReviewWidget" ADD COLUMN     "badgeStyle" TEXT,
ADD COLUMN     "showSourceLogo" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "singleTestimonialReviewId" TEXT,
ADD COLUMN     "singleTestimonialVideoId" TEXT,
ADD COLUMN     "widgetType" TEXT;
