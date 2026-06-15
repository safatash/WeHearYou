import { CampaignStatus, ReviewSource, ReviewStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buildWeeklyBuckets } from "@/lib/time-series";

type ActivityItem = {
  reviewerName: string;
  rating: number | null;
  sourceLabel: string;
  isPrivate: boolean;
  createdAt: Date;
};

export type DashboardMetric = {
  key: "reviews" | "rating" | "response" | "pending";
  label: string;
  value: string;
  suffix?: string;
  delta: number | null;
  deltaLabel: string;
  spark: number[];
  tone: "up" | "down-good" | "down" | "flat";
};

export type DashboardTrendPoint = { t: string; rating: number; volume: number };
export type DashboardSentiment = { name: string; value: number; color: string };
export type DashboardSource = { name: string; value: number; pct: number; color: string };
export type DashboardRecentReview = {
  id: string;
  name: string;
  source: string;
  rating: number;
  time: string;
  status: "pending" | "responded";
  loc: string;
  text: string;
};

const SOURCE_COLORS: Record<string, string> = {
  Google: "var(--src-google)",
  Facebook: "var(--src-facebook)",
  Yelp: "var(--src-yelp)",
  Trustpilot: "var(--src-trustpilot)",
  Review: "var(--ink-400)",
};

function avgOf(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return nums.reduce((s, n) => s + n, 0) / nums.length;
}

function sourceLabelOf(source: ReviewSource): string {
  if (source === ReviewSource.GOOGLE) return "Google";
  if (source === ReviewSource.FACEBOOK) return "Facebook";
  return "Review";
}

function relativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

/* Build 12 weekly buckets carrying both volume and average rating. */
function buildWeeklyRatingBuckets(
  reviews: { rating: number | null; reviewedAt: Date | null; createdAt: Date }[],
  weeks = 12,
): DashboardTrendPoint[] {
  const now = new Date();
  const buckets = Array.from({ length: weeks }, () => ({ sum: 0, count: 0 }));
  for (const r of reviews) {
    const d = r.reviewedAt ?? r.createdAt;
    const diffWeeks = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24 * 7));
    if (diffWeeks < 0 || diffWeeks >= weeks) continue;
    const idx = weeks - 1 - diffWeeks;
    buckets[idx].sum += r.rating ?? 0;
    buckets[idx].count += 1;
  }
  let lastRating = 4.5;
  return buckets.map((b, i) => {
    const label = new Date(now.getTime() - (weeks - 1 - i) * 7 * 86400000).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    const rating = b.count > 0 ? b.sum / b.count : lastRating;
    lastRating = rating;
    return { t: label, rating: Number(rating.toFixed(2)), volume: b.count };
  });
}

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
      metrics: [] as DashboardMetric[],
      weeklyTrend: [] as DashboardTrendPoint[],
      sentiment: [] as DashboardSentiment[],
      positivePct: 0,
      sources: [] as DashboardSource[],
      recentReviews: [] as DashboardRecentReview[],
      runningCampaigns: 0,
    };
  }

  const locationWhere = locationIds && locationIds.length > 0 ? { in: locationIds } : undefined;

  const [reviews, campaigns, locations] = await Promise.all([
    prisma.review.findMany({
      where: locationWhere ? { locationId: locationWhere } : undefined,
      orderBy: [{ createdAt: "desc" }],
      select: {
        id: true,
        rating: true,
        source: true,
        status: true,
        isTestimonial: true,
        isWidgetVisible: true,
        reviewerName: true,
        reviewedAt: true,
        createdAt: true,
        body: true,
        title: true,
        sourceReplyText: true,
        location: { select: { name: true } },
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

  const testimonials = reviews.filter((review) => review.isTestimonial).length;
  const nonTestimonialReviews = reviews.filter(
    (review) => !review.isTestimonial && review.status !== ReviewStatus.PRIVATE_FEEDBACK,
  );
  const totalReviews = nonTestimonialReviews.length;
  const averageRating =
    totalReviews > 0
      ? (nonTestimonialReviews.reduce((sum, review) => sum + (review.rating ?? 0), 0) / totalReviews).toFixed(1)
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
    (r) => r.source === ReviewSource.GOOGLE && !r.isTestimonial && r.status !== ReviewStatus.PRIVATE_FEEDBACK,
  );
  const googleAvgRating =
    googleReviewsOnly.length > 0
      ? (
          googleReviewsOnly.reduce((sum, r) => sum + (r.rating ?? 0), 0) /
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
      sourceLabel: sourceLabelOf(r.source),
      isPrivate: r.status === ReviewStatus.PRIVATE_FEEDBACK,
      createdAt: r.createdAt,
    }));

  // ---- Weekly rating + volume trend (real data) ----
  const weeklyTrend = buildWeeklyRatingBuckets(
    nonTestimonialReviews.map((r) => ({ rating: r.rating, reviewedAt: r.reviewedAt, createdAt: r.createdAt })),
  );

  // ---- Sentiment breakdown from ratings ----
  const rated = nonTestimonialReviews.filter((r) => typeof r.rating === "number");
  const positive = rated.filter((r) => (r.rating ?? 0) >= 4).length;
  const neutral = rated.filter((r) => (r.rating ?? 0) === 3).length;
  const negative = rated.filter((r) => (r.rating ?? 0) > 0 && (r.rating ?? 0) <= 2).length;
  const sentimentTotal = positive + neutral + negative || 1;
  const positivePct = Math.round((positive / sentimentTotal) * 100);
  const sentiment: DashboardSentiment[] = [
    { name: "Positive", value: positivePct, color: "var(--success)" },
    { name: "Neutral", value: Math.round((neutral / sentimentTotal) * 100), color: "var(--ink-300)" },
    { name: "Negative", value: Math.round((negative / sentimentTotal) * 100), color: "var(--danger)" },
  ];

  // ---- Review sources breakdown ----
  const sourceCounts = new Map<string, number>();
  for (const r of nonTestimonialReviews) {
    const label = sourceLabelOf(r.source);
    sourceCounts.set(label, (sourceCounts.get(label) ?? 0) + 1);
  }
  const sourcesTotal = nonTestimonialReviews.length || 1;
  const sources: DashboardSource[] = [...sourceCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({
      name,
      value,
      pct: Math.round((value / sourcesTotal) * 100),
      color: SOURCE_COLORS[name] ?? "var(--ink-400)",
    }));

  // ---- Metric deltas from the weekly trend (last 4 weeks vs prior 4) ----
  const recentVol = weeklyTrend.slice(-4).reduce((s, p) => s + p.volume, 0);
  const priorVol = weeklyTrend.slice(-8, -4).reduce((s, p) => s + p.volume, 0);
  const reviewsDelta = priorVol > 0 ? Number((((recentVol - priorVol) / priorVol) * 100).toFixed(1)) : null;
  const recentRatingAvg = avgOf(weeklyTrend.slice(-4).map((p) => p.rating));
  const priorRatingAvg = avgOf(weeklyTrend.slice(-8, -4).map((p) => p.rating));
  const ratingDelta =
    recentRatingAvg !== null && priorRatingAvg !== null
      ? Number((recentRatingAvg - priorRatingAvg).toFixed(1))
      : null;

  const metrics: DashboardMetric[] = [
    {
      key: "reviews",
      label: "Total reviews",
      value: totalReviews.toLocaleString(),
      delta: reviewsDelta,
      deltaLabel: "vs last 30d",
      spark: weeklyTrend.map((p) => p.volume),
      tone: reviewsDelta !== null && reviewsDelta < 0 ? "down" : "up",
    },
    {
      key: "rating",
      label: "Average rating",
      value: averageRating,
      suffix: "★",
      delta: ratingDelta,
      deltaLabel: "vs last 30d",
      spark: weeklyTrend.map((p) => p.rating),
      tone: ratingDelta !== null && ratingDelta < 0 ? "down" : "up",
    },
    {
      key: "response",
      label: "Response rate",
      value: requestConversion.replace("%", ""),
      suffix: "%",
      delta: null,
      deltaLabel: "of requests converted",
      spark: weeklyTrend.map((p) => p.volume),
      tone: "flat",
    },
    {
      key: "pending",
      label: "Pending replies",
      value: awaitingResponse.toLocaleString(),
      delta: null,
      deltaLabel: "awaiting a reply",
      spark: weeklyTrend.map((p) => Math.max(0, p.volume)).reverse(),
      tone: "down-good",
    },
  ];

  // ---- Recent reviews (real, with text) ----
  const recentReviews: DashboardRecentReview[] = reviews
    .filter((r) => !r.isTestimonial && r.status !== ReviewStatus.PRIVATE_FEEDBACK)
    .slice(0, 6)
    .map((r) => ({
      id: r.id,
      name: r.reviewerName,
      source: sourceLabelOf(r.source),
      rating: r.rating ?? 0,
      time: relativeTime(r.reviewedAt ?? r.createdAt),
      status: r.sourceReplyText ? "responded" : "pending",
      loc: r.location?.name ?? "",
      text: r.body || r.title || "",
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
    metrics,
    weeklyTrend,
    sentiment,
    positivePct,
    sources,
    recentReviews,
    runningCampaigns: campaigns.length,
  };
}
