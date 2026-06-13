import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const publicLocationInclude = {
  publicProfile: true,
  reviews: {
    where: {
      OR: [
        { source: "GOOGLE", status: "PUBLISHED" },
        { source: "FACEBOOK", status: "PUBLISHED" },
        { source: "INTERNAL", status: "PUBLISHED" },
        { isTestimonial: true, isWidgetVisible: true },
      ],
    },
    orderBy: [{ reviewedAt: "desc" }, { createdAt: "desc" }],
    take: 12,
  },
} satisfies Prisma.LocationInclude;

export type PublicLocationProfile = Prisma.LocationGetPayload<{
  include: typeof publicLocationInclude;
}>;

export async function getPublicLocationBySlug(slug: string) {
  return prisma.location.findFirst({
    where: { slug },
    include: publicLocationInclude,
  });
}

export function getVisiblePublicReviews(location: PublicLocationProfile) {
  const showReviews = location.publicProfile?.showReviews ?? true;
  if (!showReviews) {
    return [];
  }

  return location.reviews.filter((review) => !review.isTestimonial && (review.source === "GOOGLE" || review.source === "FACEBOOK" || review.source === "INTERNAL"));
}

export function getVisibleTestimonials(location: PublicLocationProfile) {
  const showTestimonials = location.publicProfile?.showTestimonials ?? true;
  if (!showTestimonials) {
    return [];
  }

  return location.reviews.filter((review) => review.isTestimonial && review.isWidgetVisible);
}

export function getPublicProfileStats(location: PublicLocationProfile) {
  const visibleReviews = [...getVisiblePublicReviews(location), ...getVisibleTestimonials(location)];
  const ratingCount = visibleReviews.length;
  const averageRating = ratingCount
    ? (visibleReviews.reduce((sum, review) => sum + (review.rating ?? 0), 0) / ratingCount).toFixed(1)
    : location.avgRating?.toFixed(1) ?? "0.0";

  return {
    ratingCount,
    averageRating,
    publicReviewCount: getVisiblePublicReviews(location).length,
    testimonialCount: getVisibleTestimonials(location).length,
  };
}
