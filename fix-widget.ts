import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function fixWidget() {
  const widgetId = "cmpexo30m002vopah901xr051";

  const updated = await prisma.reviewWidget.update({
    where: { id: widgetId },
    data: {
      showHeader: true,
      showAvgRating: true,
      showReviewCount: true,
      showRating: true,
      showReviewerName: true,
      showDate: true,
      showWriteReview: true,
    },
  });

  console.log("Widget updated:", updated);
  process.exit(0);
}

fixWidget().catch((err) => {
  console.error(err);
  process.exit(1);
});
