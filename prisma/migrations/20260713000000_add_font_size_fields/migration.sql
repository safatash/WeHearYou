-- AddColumn fontSizeBase
ALTER TABLE "ReviewWidget" ADD COLUMN "fontSizeBase" INTEGER NOT NULL DEFAULT 14;

-- AddColumn fontSizeNames
ALTER TABLE "ReviewWidget" ADD COLUMN "fontSizeNames" INTEGER NOT NULL DEFAULT 13;

-- AddColumn fontSizeHeader
ALTER TABLE "ReviewWidget" ADD COLUMN "fontSizeHeader" INTEGER NOT NULL DEFAULT 20;

-- AddColumn fontSizeLabel
ALTER TABLE "ReviewWidget" ADD COLUMN "fontSizeLabel" INTEGER NOT NULL DEFAULT 12;

-- AddColumn fontSizeSummary
ALTER TABLE "ReviewWidget" ADD COLUMN "fontSizeSummary" INTEGER NOT NULL DEFAULT 14;
