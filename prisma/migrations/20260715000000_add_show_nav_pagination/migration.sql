-- AddColumn showNav
ALTER TABLE "ReviewWidget" ADD COLUMN "showNav" BOOLEAN NOT NULL DEFAULT true;

-- AddColumn showPagination  
ALTER TABLE "ReviewWidget" ADD COLUMN "showPagination" BOOLEAN NOT NULL DEFAULT true;
