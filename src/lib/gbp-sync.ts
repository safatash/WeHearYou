import { ReviewSource, ReviewStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getValidGoogleAccessToken, fetchGoogleBusinessLocations, fetchGoogleLocationReviews, normalizeGoogleStarRating } from "@/lib/google-oauth";
import { listGbpQuestions } from "@/lib/gbp-api";
import { isEmailSendingConfigured, sendTeamNotificationEmail } from "@/lib/email";
import { hasGoogleReviewChanged } from "@/lib/google-review-sync";
import { tryAutoSendGoogleReplyForReview } from "@/lib/auto-send-reply";

// ─── GBP Questions sync (existing) ───────────────────────────────────────────

export async function runGbpSync(): Promise<{ locationsProcessed: number; questionsUpserted: number; newUnanswered: number }> {
  let locationsProcessed = 0;
  let questionsUpserted = 0;
  let newUnanswered = 0;

  const locations = await prisma.location.findMany({
    where: { googleConnectionId: { not: null }, googleLocationName: { not: null } },
    include: {
      googleConnection: {
        select: { id: true, accessToken: true, refreshToken: true, expiresAt: true, scope: true, tokenType: true },
      },
      organization: { select: { name: true, users: { include: { user: { select: { email: true } } } } } },
    },
  });

  for (const location of locations) {
    if (!location.googleConnection || !location.googleLocationName) continue;

    const syncedAt = new Date();

    try {
      const accessToken = await getValidGoogleAccessToken(location.googleConnection);
      const questions = await listGbpQuestions(accessToken, location.googleLocationName);

      for (const q of questions) {
        const existingAnswer = q.topAnswers?.[0];
        const existing = await prisma.gbpQuestion.findUnique({ where: { gbpQuestionId: q.name } });
        const isNew = !existing;
        const upserted = await prisma.gbpQuestion.upsert({
          where: { gbpQuestionId: q.name },
          update: {
            questionText: q.text,
            syncedAt,
            ...(existingAnswer ? {
              answerText: existingAnswer.text,
              answeredAt: syncedAt,
              gbpAnswerId: existingAnswer.name,
            } : {}),
          },
          create: {
            locationId: location.id,
            gbpQuestionId: q.name,
            questionText: q.text,
            askedAt: new Date(q.createTime),
            answerText: existingAnswer?.text ?? null,
            answeredAt: existingAnswer ? syncedAt : null,
            gbpAnswerId: existingAnswer?.name ?? null,
            syncedAt,
          },
        });
        questionsUpserted++;

        // Detect newly created unanswered questions (created within this sync run)
        if (isNew && !upserted.answeredAt) {
          newUnanswered++;

          // Send notification to org owners/admins if email is configured
          if (isEmailSendingConfigured()) {
            const locationName = location.name ?? location.googleLocationName;
            for (const membership of location.organization.users) {
              const email = membership.user?.email;
              if (email) {
                await sendTeamNotificationEmail({
                  to: email,
                  contactName: "A customer",
                  locationName,
                  eventType: "NEW_GBP_QUESTION",
                });
              }
            }
          }
        }
      }

      await prisma.gbpSyncLog.create({
        data: { locationId: location.id, syncType: "QUESTIONS", status: "SUCCESS", itemsSynced: questions.length, syncedAt },
      });
      locationsProcessed++;
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown sync error";
      await prisma.gbpSyncLog.create({
        data: { locationId: location.id, syncType: "QUESTIONS", status: "FAILED", error: msg, syncedAt },
      });
    }
  }

  return { locationsProcessed, questionsUpserted, newUnanswered };
}

// ─── Google Reviews sync (cron-safe, no auth guard) ──────────────────────────

function formatGoogleWeekdayDescriptions(weekdayDescriptions?: string[] | null) {
  if (!weekdayDescriptions || weekdayDescriptions.length === 0) return null;
  return weekdayDescriptions.join("\n");
}

export type GoogleReviewSyncResult = {
  locationsProcessed: number;
  locationsFailed: number;
  totalCreated: number;
  totalUpdated: number;
  totalSkipped: number;
  totalFetched: number;
};

export async function runGoogleReviewSync(): Promise<GoogleReviewSyncResult> {
  let locationsProcessed = 0;
  let locationsFailed = 0;
  let totalCreated = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;
  let totalFetched = 0;

  const locations = await prisma.location.findMany({
    where: { googleConnectionId: { not: null }, googleLocationName: { not: null } },
    include: {
      googleConnection: {
        select: { id: true, accessToken: true, refreshToken: true, expiresAt: true, scope: true, tokenType: true },
      },
    },
  });

  for (const location of locations) {
    if (!location.googleConnection || !location.googleLocationName) continue;

    const syncedAt = new Date();

    try {
      const accessToken = await getValidGoogleAccessToken(location.googleConnection);

      // Build the correct review location name (may need account prefix)
      const googleLocations = await fetchGoogleBusinessLocations(accessToken);
      const googleLocationDetails = googleLocations.find((l) => l.name === location.googleLocationName);
      const googleReviewLocationName = googleLocationDetails?.accountResourceName
        ? `${googleLocationDetails.accountResourceName}/${location.googleLocationName}`
        : location.googleLocationName;

      const googleReviews = await fetchGoogleLocationReviews({
        accessToken,
        googleLocationName: googleReviewLocationName,
      });

      let createdCount = 0;
      let updatedCount = 0;
      let skippedCount = 0;

      for (const review of googleReviews) {
        if (!review.reviewId) continue;

        const reviewedAt = review.updateTime
          ? new Date(review.updateTime)
          : review.createTime
          ? new Date(review.createTime)
          : null;

        const normalizedReviewerName = review.reviewer?.displayName?.trim() || "Google reviewer";
        const normalizedReviewerPhotoUrl = review.reviewer?.profilePhotoUrl?.trim() || null;
        const normalizedRating = normalizeGoogleStarRating(review.starRating);
        const normalizedBody = review.comment?.trim() || "No written review provided.";
        const normalizedSourceReviewUrl = review.reviewUrl?.trim() || null;
        const normalizedSourceReplyText = review.reviewReply?.comment?.trim() || null;
        const sourceUpdatedAt = review.updateTime
          ? new Date(review.updateTime)
          : review.createTime
          ? new Date(review.createTime)
          : null;

        const existingReview = await prisma.review.findFirst({
          where: { locationId: location.id, externalId: review.reviewId, source: ReviewSource.GOOGLE },
          select: { id: true, reviewerName: true, rating: true, body: true, status: true, reviewedAt: true, sourceUpdatedAt: true },
        });

        if (existingReview) {
          const changed = hasGoogleReviewChanged(
            { ...existingReview, rating: existingReview.rating ?? 0 },
            { reviewerName: normalizedReviewerName, rating: normalizedRating, body: normalizedBody, reviewedAt, sourceUpdatedAt },
          );

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
            updatedCount++;
          } else {
            skippedCount++;
          }
        } else {
          const newReview = await prisma.review.create({
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
          createdCount++;

          // Attempt auto-send reply if enabled for this location
          await tryAutoSendGoogleReplyForReview(newReview.id).catch(() => {
            // Silently fail — does not block sync
          });
        }
      }

      // Recompute avg rating from all published Google reviews
      const publishedReviews = await prisma.review.findMany({
        where: { locationId: location.id, source: ReviewSource.GOOGLE, status: ReviewStatus.PUBLISHED },
        select: { rating: true },
      });
      const avgRating = publishedReviews.length
        ? publishedReviews.reduce((sum, r) => sum + (r.rating ?? 0), 0) / publishedReviews.length
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
          lastSyncAt: syncedAt,
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
        data: { lastSyncedAt: syncedAt },
      });

      await prisma.gbpSyncLog.create({
        data: { locationId: location.id, syncType: "REVIEWS", status: "SUCCESS", itemsSynced: googleReviews.length, syncedAt },
      });

      totalCreated += createdCount;
      totalUpdated += updatedCount;
      totalSkipped += skippedCount;
      totalFetched += googleReviews.length;
      locationsProcessed++;
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown review sync error";

      await prisma.location.update({
        where: { id: location.id },
        data: { lastSyncStatus: "error", lastSyncMessage: msg, lastSyncAt: syncedAt },
      });

      await prisma.gbpSyncLog.create({
        data: { locationId: location.id, syncType: "REVIEWS", status: "FAILED", error: msg, syncedAt },
      });

      locationsFailed++;
    }
  }

  return { locationsProcessed, locationsFailed, totalCreated, totalUpdated, totalSkipped, totalFetched };
}
