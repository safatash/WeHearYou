import { CampaignStatus, ReviewSource } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buildWeeklyBuckets } from "@/lib/time-series";

const engagedCampaignStatuses = new Set<CampaignStatus>([
  CampaignStatus.OPENED,
  CampaignStatus.CLICKED,
  CampaignStatus.COMPLETED,
]);

export async function getAnalyticsData() {
  const [reviews, recipients] = await Promise.all([
    prisma.review.findMany({
      orderBy: [{ reviewedAt: "desc" }, { createdAt: "desc" }],
      select: {
        rating: true,
        source: true,
        status: true,
        sentiment: true,
        reviewedAt: true,
        createdAt: true,
      },
    }),
    prisma.campaignRecipient.findMany({
      orderBy: [{ sentAt: "desc" }, { createdAt: "desc" }],
      select: {
        status: true,
        sentAt: true,
        openedAt: true,
        completedAt: true,
        outcome: true,
      },
    }),
  ]);

  const reviewVolume = reviews.length;
  const averageRating = reviewVolume ? `${(reviews.reduce((sum, review) => sum + review.rating, 0) / reviewVolume).toFixed(1)} ★` : "0.0 ★";
  const responseRate = recipients.length
    ? `${((recipients.filter((recipient) => engagedCampaignStatuses.has(recipient.status)).length / recipients.length) * 100).toFixed(1)}%`
    : "0.0%";

  const responseHours = recipients
    .filter((recipient) => recipient.sentAt && (recipient.openedAt || recipient.completedAt))
    .map((recipient) => {
      const end = recipient.completedAt ?? recipient.openedAt;
      return (end!.getTime() - recipient.sentAt!.getTime()) / (1000 * 60 * 60);
    });

  const avgResponseTime = responseHours.length
    ? `${Math.round(responseHours.reduce((sum, hours) => sum + hours, 0) / responseHours.length)}h`
    : "0h";

  const reviewGrowthBars = buildWeeklyBuckets(
    reviews,
    (review) => review.reviewedAt ?? review.createdAt,
  ).map((bucket) => Math.max(bucket.count, 2));

  const sentimentBuckets = {
    Positive: reviews.filter((review) => review.sentiment === "positive").length,
    Neutral: reviews.filter((review) => !review.sentiment || review.sentiment === "neutral").length,
    Negative: reviews.filter((review) => review.sentiment === "negative").length,
  };

  const responseTimeBars = buildWeeklyBuckets(
    recipients.filter((recipient) => recipient.sentAt && (recipient.openedAt || recipient.completedAt)),
    (recipient) => recipient.completedAt ?? recipient.openedAt ?? recipient.sentAt,
  ).map((bucket) => Math.max(bucket.count, 2));

  const googleCount = reviews.filter((review) => review.source === ReviewSource.GOOGLE).length;
  const facebookCount = reviews.filter((review) => review.source === ReviewSource.FACEBOOK).length;
  const privateFeedbackCount = reviews.filter((review) => review.status === "PRIVATE_FEEDBACK").length;

  return {
    reviewVolume: String(reviewVolume),
    averageRating,
    responseRate,
    avgResponseTime,
    reviewGrowthBars,
    sentimentMix: [
      {
        label: "Positive",
        value: `${reviewVolume ? Math.round((sentimentBuckets.Positive / reviewVolume) * 100) : 0}%`,
        tone: "positive" as const,
      },
      {
        label: "Neutral",
        value: `${reviewVolume ? Math.round((sentimentBuckets.Neutral / reviewVolume) * 100) : 0}%`,
        tone: "neutral" as const,
      },
      {
        label: "Negative",
        value: `${reviewVolume ? Math.round((sentimentBuckets.Negative / reviewVolume) * 100) : 0}%`,
        tone: "warning" as const,
      },
    ],
    responseTimeBars,
    channelBreakdown: [
      {
        label: "Google",
        volume: `${googleCount} reviews`,
        trend: googleCount > 0 ? "Live" : "Quiet",
      },
      {
        label: "Facebook",
        volume: `${facebookCount} reviews`,
        trend: facebookCount > 0 ? "Live" : "Quiet",
      },
      {
        label: "Private feedback",
        volume: `${privateFeedbackCount} responses`,
        trend: privateFeedbackCount > 0 ? "Tracked" : "Quiet",
      },
    ],
  };
}
