import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sortFeaturedFirst } from "@/lib/review-filtering";

/**
 * Upper bound on reviews loaded for a public mini-site. The admin-configured
 * `miniSiteReviewsPerPage` controls how many show before "Show more"; this
 * caps the total set available for client-side reveal so the query/DOM stay
 * bounded for locations with very large review counts.
 */
export const MINISITE_MAX_REVIEWS = 100;

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
    orderBy: [{ isFeatured: "desc" }, { reviewedAt: "desc" }, { createdAt: "desc" }],
    take: MINISITE_MAX_REVIEWS,
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

  const visible = location.reviews.filter(
    (review) =>
      !review.isTestimonial &&
      !review.isHiddenFromMiniSite &&
      (review.source === "GOOGLE" || review.source === "FACEBOOK" || review.source === "INTERNAL"),
  );
  return sortFeaturedFirst(visible);
}

export function getVisibleTestimonials(location: PublicLocationProfile) {
  const showTestimonials = location.publicProfile?.showTestimonials ?? true;
  if (!showTestimonials) {
    return [];
  }

  return location.reviews.filter((review) => review.isTestimonial && review.isWidgetVisible && !review.isHiddenFromMiniSite);
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
