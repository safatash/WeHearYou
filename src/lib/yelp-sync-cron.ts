import { prisma } from "@/lib/prisma";
import { ReviewSource, ReviewStatus } from "@prisma/client";
import { scrapeYelpBusiness } from "@/lib/yelp-scraper";

export async function syncAllYelpLocations(): Promise<{ synced: number; failed: number }> {
  const locations = await prisma.location.findMany({
    where: { yelpBusinessUrl: { not: null } },
    select: { id: true, yelpBusinessUrl: true },
  });

  let synced = 0;
  let failed = 0;

  for (const location of locations) {
    if (!location.yelpBusinessUrl) continue;

    try {
      const result = await scrapeYelpBusiness(location.yelpBusinessUrl);
      let imported = 0;
      let updated = 0;

      for (const review of result.reviews) {
        const existing = await prisma.review.findFirst({
          where: { locationId: location.id, source: ReviewSource.YELP, externalId: review.externalId },
          select: { id: true, body: true, rating: true },
        });

        if (!existing) {
          await prisma.review.create({
            data: {
              locationId: location.id,
              source: ReviewSource.YELP,
              externalId: review.externalId,
              reviewerName: review.reviewerName,
              rating: review.rating,
              body: review.body,
              reviewedAt: review.reviewedAt,
              sourceReviewUrl: review.sourceReviewUrl,
              status: ReviewStatus.PUBLISHED,
            },
          });
          imported++;
        } else if (existing.body !== review.body || existing.rating !== review.rating) {
          await prisma.review.update({
            where: { id: existing.id },
            data: { body: review.body, rating: review.rating },
          });
          updated++;
        }
      }

      await prisma.location.update({
        where: { id: location.id },
        data: {
          yelpLastSyncAt: new Date(),
          yelpLastSyncStatus: "success",
          yelpLastSyncCount: result.reviews.length,
        },
      });

      console.log(`[yelp-cron] ${location.id}: ${imported} imported, ${updated} updated`);
      synced++;
    } catch (err) {
      console.error(`[yelp-cron] ${location.id} failed:`, err instanceof Error ? err.message : err);
      await prisma.location.update({
        where: { id: location.id },
        data: { yelpLastSyncAt: new Date(), yelpLastSyncStatus: "error", yelpLastSyncCount: 0 },
      });
      failed++;
    }
  }

  return { synced, failed };
}
