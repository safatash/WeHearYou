import { revalidatePath } from "next/cache";
import { ReviewSource, ReviewStatus } from "@prisma/client";
import { fetchGoogleBusinessLocations, fetchGoogleLocationReviews, getValidGoogleAccessToken, normalizeGoogleStarRating } from "@/lib/google-oauth";
import { hasGoogleReviewChanged } from "@/lib/google-review-sync";
import { aggregateGoogleSyncCounts, type AggregatedGoogleSyncCounts, type GoogleSyncCounts } from "@/lib/google-sync-summary";
import { prisma } from "@/lib/prisma";

export type GoogleReviewLocationSyncResult = GoogleSyncCounts & {
  locationId: string;
  locationName: string;
};

export type GoogleReviewCronSyncResult = AggregatedGoogleSyncCounts & {
  failedLocations: number;
  failedLocationNames: string[];
};

function formatGoogleWeekdayDescriptions(weekdayDescriptions?: string[] | null) {
  if (!weekdayDescriptions || weekdayDescriptions.length === 0) {
    return null;
  }

  return weekdayDescriptions.join("\n");
}

async function markLocationSyncError(locationId: string, message: string) {
  await prisma.location.update({
    where: { id: locationId },
    data: {
      lastSyncStatus: "error",
      lastSyncMessage: message,
      lastSyncSkippedCount: null,
      lastSyncAt: new Date(),
    },
  });
}

export async function syncGoogleReviewsForLocationInternal(locationId: string): Promise<GoogleReviewLocationSyncResult> {
  const location = await prisma.location.findUnique({
    where: { id: locationId },
    include: {
      googleConnection: true,
    },
  });

  if (!location?.googleConnection || !location.googleLocationName) {
    const message = "Connect and map a Google Business Profile location before syncing reviews";
    await markLocationSyncError(locationId, message);
    throw new Error(message);
  }

  let googleReviews;
  let googleLocationDetails:
    | {
        metadata?: { mapsUri?: string };
        regularHours?: { weekdayDescriptions?: string[] };
      }
    | undefined;

  try {
    const accessToken = await getValidGoogleAccessToken({
      id: location.googleConnection.id,
      accessToken: location.googleConnection.accessToken,
      refreshToken: location.googleConnection.refreshToken,
      expiresAt: location.googleConnection.expiresAt,
      scope: location.googleConnection.scope,
      tokenType: location.googleConnection.tokenType,
    });

    const googleLocations = await fetchGoogleBusinessLocations(accessToken);
    googleLocationDetails = googleLocations.find((googleLocation) => googleLocation.name === location.googleLocationName);

    googleReviews = await fetchGoogleLocationReviews({
      accessToken,
      googleLocationName: location.googleLocationName,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Google review sync failed";
    await markLocationSyncError(location.id, message);
    throw error;
  }

  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;

  for (const review of googleReviews) {
    if (!review.reviewId) {
      continue;
    }

    const reviewedAt = review.updateTime ? new Date(review.updateTime) : review.createTime ? new Date(review.createTime) : null;
    const normalizedReviewerName = review.reviewer?.displayName?.trim() || "Google reviewer";
    const normalizedReviewerPhotoUrl = review.reviewer?.profilePhotoUrl?.trim() || null;
    const normalizedRating = normalizeGoogleStarRating(review.starRating);
    const normalizedBody = review.comment?.trim() || "No written review provided.";
    const normalizedSourceReviewUrl = review.reviewUrl?.trim() || null;
    const normalizedSourceReplyText = review.reviewReply?.comment?.trim() || null;
    const sourceUpdatedAt = review.updateTime ? new Date(review.updateTime) : review.createTime ? new Date(review.createTime) : null;

    const existingReview = await prisma.review.findFirst({
      where: {
        locationId: location.id,
        externalId: review.reviewId,
        source: ReviewSource.GOOGLE,
      },
      select: {
        id: true,
        reviewerName: true,
        rating: true,
        body: true,
        status: true,
        reviewedAt: true,
        sourceUpdatedAt: true,
      },
    });

    if (existingReview) {
      const changed = hasGoogleReviewChanged(existingReview, {
        reviewerName: normalizedReviewerName,
        rating: normalizedRating,
        body: normalizedBody,
        reviewedAt,
        sourceUpdatedAt,
      });

      if (changed) {
        await prisma.review.update({
          where: { id: existingReview.id },
          data: {
            reviewerName: normalizedReviewerName,
            reviewerPhotoUrl: normalizedReviewerPhotoUrl,
            sourceReviewUrl: normalizedSourceReviewUrl,
            sourceReplyText: normalizedSourceReplyText,
            rating: normalizedRating,
            body: normalizedBody,
            status: ReviewStatus.PUBLISHED,
            reviewedAt,
            publishedExternally: true,
            sourceUpdatedAt,
            lastImportedAt: new Date(),
          },
        });
        updatedCount += 1;
      } else {
        skippedCount += 1;
      }
    } else {
      await prisma.review.create({
        data: {
          locationId: location.id,
          source: ReviewSource.GOOGLE,
          externalId: review.reviewId,
          reviewerName: normalizedReviewerName,
          reviewerPhotoUrl: normalizedReviewerPhotoUrl,
          sourceReviewUrl: normalizedSourceReviewUrl,
          sourceReplyText: normalizedSourceReplyText,
          rating: normalizedRating,
          status: ReviewStatus.PUBLISHED,
          body: normalizedBody,
          reviewedAt,
          publishedExternally: true,
          sourceUpdatedAt,
          lastImportedAt: new Date(),
        },
      });
      createdCount += 1;
    }
  }

  const publishedReviews = await prisma.review.findMany({
    where: {
      locationId: location.id,
      source: ReviewSource.GOOGLE,
      status: ReviewStatus.PUBLISHED,
    },
    select: {
      rating: true,
    },
  });

  const avgRating = publishedReviews.length
    ? publishedReviews.reduce((sum, review) => sum + review.rating, 0) / publishedReviews.length
    : null;

  await prisma.location.update({
    where: { id: location.id },
    data: {
      avgRating,
      lastSyncStatus: "success",
      lastSyncMessage: null,
      lastSyncImportedCount: createdCount,
      lastSyncUpdatedCount: updatedCount,
      lastSyncSkippedCount: skippedCount,
      lastSyncFetchedCount: googleReviews.length,
      lastSyncAt: new Date(),
      publicProfile: {
        upsert: {
          update: {
            googleMapsUrl: googleLocationDetails?.metadata?.mapsUri ?? undefined,
            googleHours: formatGoogleWeekdayDescriptions(googleLocationDetails?.regularHours?.weekdayDescriptions) ?? undefined,
          },
          create: {
            googleMapsUrl: googleLocationDetails?.metadata?.mapsUri ?? null,
            googleHours: formatGoogleWeekdayDescriptions(googleLocationDetails?.regularHours?.weekdayDescriptions),
          },
        },
      },
    },
  });

  await prisma.googleAccountConnection.update({
    where: { id: location.googleConnectionId! },
    data: {
      lastSyncedAt: new Date(),
    },
  });

  revalidatePath("/");
  revalidatePath("/reviews");
  revalidatePath("/integrations");
  revalidatePath(`/locations/${location.id}`);
  revalidatePath(`/b/${location.slug}`);

  return {
    locationId: location.id,
    locationName: location.name,
    createdCount,
    updatedCount,
    skippedCount,
    totalCount: googleReviews.length,
  };
}

export async function syncMappedGoogleReviewLocations(options: { googleConnectionId?: string } = {}): Promise<GoogleReviewCronSyncResult> {
  const locations = await prisma.location.findMany({
    where: {
      googleConnectionId: options.googleConnectionId,
      googleLocationName: {
        not: null,
      },
    },
    orderBy: {
      createdAt: "asc",
    },
    select: {
      id: true,
      name: true,
    },
  });

  const results: GoogleReviewLocationSyncResult[] = [];
  const failedLocationNames: string[] = [];

  for (const location of locations) {
    try {
      const result = await syncGoogleReviewsForLocationInternal(location.id);
      results.push(result);
    } catch {
      failedLocationNames.push(location.name);
    }
  }

  const totals = aggregateGoogleSyncCounts(results);

  return {
    ...totals,
    failedLocations: failedLocationNames.length,
    failedLocationNames,
  };
}
