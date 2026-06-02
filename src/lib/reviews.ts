import { ReviewSource, ReviewStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type ReviewSort = "newest" | "highest" | "lowest";
export type ReviewStatusFilter = "all" | "published" | "private-feedback" | "needs-follow-up" | "testimonials";
export type ReviewSourceFilter = "all" | "google" | "facebook" | "internal";

const reviewInclude = {
  location: true,
  contact: true,
  ownerMembership: {
    include: {
      user: true,
    },
  },
  replySentByMembership: {
    include: {
      user: true,
    },
  },
} satisfies Prisma.ReviewInclude;

export type ReviewWithRelations = Prisma.ReviewGetPayload<{
  include: typeof reviewInclude;
}>;

export async function getReviews(
  sort: ReviewSort = "newest",
  filters?: {
    status?: ReviewStatusFilter;
    source?: ReviewSourceFilter;
    locationId?: string | null;
    locationIds?: string[];
  },
) {
  const orderBy =
    sort === "highest"
      ? [{ rating: "desc" as const }, { reviewedAt: "desc" as const }, { createdAt: "desc" as const }]
      : sort === "lowest"
        ? [{ rating: "asc" as const }, { reviewedAt: "desc" as const }, { createdAt: "desc" as const }]
        : [{ reviewedAt: "desc" as const }, { createdAt: "desc" as const }];

  const where: Prisma.ReviewWhereInput = {};

  if (filters?.locationIds && filters.locationIds.length > 0) {
    where.locationId = { in: filters.locationIds };
  }

  if (filters?.locationId) {
    where.locationId = filters.locationId;
  }

  if (filters?.source && filters.source !== "all") {
    where.source = filters.source.toUpperCase() as ReviewSource;
  }

  if (filters?.status === "published") {
    where.status = "PUBLISHED";
    where.isTestimonial = false;
  } else if (filters?.status === "private-feedback") {
    where.status = "PRIVATE_FEEDBACK";
  } else if (filters?.status === "needs-follow-up") {
    where.status = "NEEDS_FOLLOW_UP";
  } else if (filters?.status === "testimonials") {
    where.isTestimonial = true;
  }

  return prisma.review.findMany({
    where,
    include: reviewInclude,
    orderBy,
  });
}

export async function getReviewFilterOptions(locationIds?: string[]) {
  const [locations, owners] = await Promise.all([
    prisma.location.findMany({
      where: locationIds ? { id: { in: locationIds } } : undefined,
      select: {
        id: true,
        name: true,
      },
      orderBy: [{ createdAt: "asc" }],
    }),
    prisma.userMembership.findMany({
      where: {
        status: "ACTIVE",
      },
      include: {
        user: true,
      },
      orderBy: [{ createdAt: "asc" }],
    }),
  ]);

  return {
    locations,
    owners,
  };
}

export async function getReviewById(id: string, locationIds?: string[]) {
  return prisma.review.findFirst({
    where: {
      id,
      ...(locationIds && locationIds.length > 0 ? { locationId: { in: locationIds } } : {}),
    },
    include: reviewInclude,
  });
}

export function formatReviewSource(source: ReviewSource, isTestimonial = false) {
  if (source === "INTERNAL" && isTestimonial) {
    return "Testimonial";
  }

  switch (source) {
    case "FACEBOOK":
      return "Facebook";
    case "INTERNAL":
      return "Internal";
    case "GOOGLE":
    default:
      return "Google";
  }
}

export function formatReviewStatus(status: ReviewStatus, isTestimonial = false) {
  if (isTestimonial) {
    return "Testimonial";
  }

  switch (status) {
    case "NEEDS_FOLLOW_UP":
      return "Needs follow-up";
    case "PRIVATE_FEEDBACK":
      return "Private feedback";
    case "PUBLISHED":
    default:
      return "Published";
  }
}

export function formatReviewDate(date: Date | null) {
  if (!date) {
    return "No review date";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function formatSentiment(sentiment: string | null) {
  if (!sentiment) {
    return "Neutral";
  }

  return sentiment.charAt(0).toUpperCase() + sentiment.slice(1);
}

export function stars(rating: number) {
  return "★".repeat(rating) + "☆".repeat(5 - rating);
}

export function buildReviewPageStats(reviews: ReviewWithRelations[]) {
  const publishedReviews = reviews.filter((review) => review.status === "PUBLISHED");
  const googleReviews = reviews.filter((review) => review.source === "GOOGLE");
  const privateFeedback = reviews.filter((review) => review.status === "PRIVATE_FEEDBACK");
  const testimonials = reviews.filter((review) => review.isTestimonial);
  const ratedReviews = reviews.filter((review) => typeof review.rating === "number");

  const averageRating = ratedReviews.length
    ? (ratedReviews.reduce((sum, review) => sum + (review.rating ?? 0), 0) / ratedReviews.length).toFixed(1)
    : "0.0";

  return {
    totalReviews: reviews.length,
    publishedReviews: publishedReviews.length,
    googleReviews: googleReviews.length,
    privateFeedback: privateFeedback.length,
    testimonials: testimonials.length,
    averageRating: `${averageRating} ★`,
  };
}

export function truncateReviewBody(body: string, maxLength = 220) {
  if (body.length <= maxLength) {
    return body;
  }

  const candidate = body.slice(0, maxLength);
  const lastSpace = candidate.lastIndexOf(" ");
  const trimmed = lastSpace > Math.floor(maxLength * 0.6) ? candidate.slice(0, lastSpace) : candidate;

  return `${trimmed.trim()}...`;
}

export function buildReviewReplyDraft(reviewerName: string, rating: number) {
  const firstName = reviewerName.trim().split(/\s+/)[0] || "there";

  if (rating >= 4) {
    return `Hi ${firstName}, thanks for taking the time to share your experience. We really appreciate the kind words and are glad the visit left a strong impression.`;
  }

  return `Hi ${firstName}, thank you for sharing your feedback. We take experiences like this seriously and would like the chance to make things right.`;
}
