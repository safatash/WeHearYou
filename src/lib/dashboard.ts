import { CampaignStatus, ReviewSource, ReviewStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buildWeeklyBuckets } from "@/lib/time-series";

type ActivityItem = {
  reviewerName: string;
  rating: number;
  sourceLabel: string;
  isPrivate: boolean;
  createdAt: Date;
};

const completedCampaignStatuses = new Set<CampaignStatus>([
  CampaignStatus.COMPLETED,
  CampaignStatus.CLICKED,
  CampaignStatus.OPENED,
]);

export async function getDashboardData(locationIds?: string[]) {
  // If locationIds is explicitly provided but empty, the user has no locations — return empty data
  if (locationIds !== undefined && locationIds.length === 0) {
    return {
      totalReviews: 0,
      averageRating: "0.0 ★",
      requestConversion: "0.0%",
      reviewTrendBars: Array.from({ length: 12 }, () => 0),
      funnelOutcomes: {
        redirectedToGoogle: 0,
        privateFeedback: 0,
        awaitingResponse: 0,
        webhookTriggered: 0,
        testimonials: 0,
        widgetTestimonials: 0,
      },
      channelBreakdown: {
        google: 0,
        facebook: 0,
        privateFeedback: 0,
      },
      locations: [],
      googleAvgRating: "0.0",
      googleReviewsThisMonth: 0,
      googleReviewCount: 0,
      recentActivity: [] as ActivityItem[],
    };
  }

  const locationWhere = locationIds && locationIds.length > 0 ? { in: locationIds } : undefined;

  const [reviews, campaigns, locations] = await Promise.all([
    prisma.review.findMany({
      where: locationWhere ? { locationId: locationWhere } : undefined,
      orderBy: [{ createdAt: "desc" }],
      select: {
        rating: true,
        source: true,
        status: true,
        isTestimonial: true,
        isWidgetVisible: true,
        reviewerName: true,
        reviewedAt: true,
        createdAt: true,
      },
    }),
    prisma.campaignRecipient.findMany({
      where: locationWhere ? { campaign: { locationId: locationWhere } } : undefined,
      orderBy: [{ createdAt: "desc" }],
      select: {
        status: true,
        outcome: true,
        campaign: {
          select: {
            workflowName: true,
          },
        },
      },
    }),
    prisma.location.findMany({
      where: locationWhere ? { id: locationWhere } : undefined,
      orderBy: [{ createdAt: "asc" }],
      select: {
        id: true,
        name: true,
        status: true,
        avgRating: true,
        _count: { select: { reviews: { where: { isTestimonial: false } } } },
      },
    }),
  ]);

  const totalReviews = reviews.filter((review) => !review.isTestimonial).length;
  const testimonials = reviews.filter((review) => review.isTestimonial).length;
  const averageRating =
    totalReviews > 0
      ? (reviews.filter((review) => !review.isTestimonial).reduce((sum, review) => sum + review.rating, 0) / totalReviews).toFixed(1)
      : "0.0";

  const completedRequests = campaigns.filter((campaign) => completedCampaignStatuses.has(campaign.status)).length;
  const requestConversion = campaigns.length
    ? `${((completedRequests / campaigns.length) * 100).toFixed(1)}%`
    : "0.0%";

  const redirectedToGoogle = campaigns.filter((campaign) => campaign.outcome?.includes("Google")).length;
  const privateFeedback = reviews.filter((review) => review.status === ReviewStatus.PRIVATE_FEEDBACK).length;
  const widgetTestimonials = reviews.filter((review) => review.isTestimonial && review.isWidgetVisible).length;
  const awaitingResponse = campaigns.filter((campaign) => campaign.status === CampaignStatus.SENT).length;
  const webhookTriggered = campaigns.filter((campaign) => campaign.campaign.workflowName?.toLowerCase().includes("webhook")).length;

  const reviewTrendBars = buildWeeklyBuckets(
    reviews.filter((review) => !review.isTestimonial),
    (review) => review.reviewedAt ?? review.createdAt,
  ).map((bucket) => Math.max(bucket.count, 2));
  const googleReviewCount = reviews.filter((review) => review.source === ReviewSource.GOOGLE).length;
  const facebookReviewCount = reviews.filter((review) => review.source === ReviewSource.FACEBOOK).length;

  const now = new Date();
  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  const googleReviewsOnly = reviews.filter(
    (r) => r.source === ReviewSource.GOOGLE && !r.isTestimonial,
  );
  const googleAvgRating =
    googleReviewsOnly.length > 0
      ? (
          googleReviewsOnly.reduce((sum, r) => sum + r.rating, 0) /
          googleReviewsOnly.length
        ).toFixed(1)
      : "0.0";
  const googleReviewsThisMonth = googleReviewsOnly.filter(
    (r) => (r.reviewedAt ?? r.createdAt) >= startOfMonth,
  ).length;

  const recentActivity = reviews
    .filter((r) => !r.isTestimonial)
    .slice(0, 10)
    .map((r) => ({
      reviewerName: r.reviewerName,
      rating: r.rating,
      sourceLabel:
        r.source === ReviewSource.GOOGLE
          ? "Google"
          : r.source === ReviewSource.FACEBOOK
            ? "Facebook"
            : "Review",
      isPrivate: r.status === ReviewStatus.PRIVATE_FEEDBACK,
      createdAt: r.createdAt,
    }));

  return {
    totalReviews,
    averageRating: `${averageRating} ★`,
    requestConversion,
    reviewTrendBars,
    funnelOutcomes: {
      redirectedToGoogle,
      privateFeedback,
      awaitingResponse,
      webhookTriggered,
      testimonials,
      widgetTestimonials,
    },
    channelBreakdown: {
      google: googleReviewCount,
      facebook: facebookReviewCount,
      privateFeedback,
    },
    locations,
    googleAvgRating,
    googleReviewsThisMonth,
    googleReviewCount: googleReviewsOnly.length,
    recentActivity,
  };
}
