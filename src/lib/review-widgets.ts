import crypto from "node:crypto";
import { ReviewSource, ReviewStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireOrganizationAccess } from "@/lib/authz";

export type PublicWidgetReview = {
  id: string;
  reviewerName: string;
  reviewerPhotoUrl: string | null;
  sourceReviewUrl: string | null;
  sourceReplyText: string | null;
  rating: number;
  body: string;
  reviewedAt: string | null;
};

export type PublicWidgetPayload = {
  widget: {
    name: string;
    layout: string;
    theme: string;
    pageSize: number;
    showHeader: boolean;
    showRating: boolean;
    showReviewerName: boolean;
    showDate: boolean;
    showWriteReview: boolean;
  };
  location: {
    name: string;
    avgRating: number | null;
    reviewCount: number;
    reviewLink: string | null;
  };
  reviews: PublicWidgetReview[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    hasMore: boolean;
  };
};

export type ReviewWidgetHealth = {
  reviewCount: number;
  hasMappedGoogleLocation: boolean;
  hasSyncedGoogleReviews: boolean;
  isActive: boolean;
  status: "healthy" | "inactive" | "sync_required" | "mapping_required";
  message: string;
};

export function generateReviewWidgetToken() {
  return `wg_${crypto.randomBytes(16).toString("hex")}`;
}

function buildOrderBy(sort: string) {
  if (sort === "highest") {
    return [{ rating: "desc" as const }, { reviewedAt: "desc" as const }, { createdAt: "desc" as const }];
  }

  if (sort === "lowest") {
    return [{ rating: "asc" as const }, { reviewedAt: "desc" as const }, { createdAt: "desc" as const }];
  }

  return [{ reviewedAt: "desc" as const }, { createdAt: "desc" as const }];
}

export function buildWidgetHealth({
  reviewCount,
  hasMappedGoogleLocation,
  isActive,
}: {
  reviewCount: number;
  hasMappedGoogleLocation: boolean;
  isActive: boolean;
}): ReviewWidgetHealth {
  const hasSyncedGoogleReviews = reviewCount > 0;

  if (!isActive) {
    return {
      reviewCount,
      hasMappedGoogleLocation,
      hasSyncedGoogleReviews,
      isActive,
      status: "inactive",
      message: "Widget is inactive and will not render publicly.",
    };
  }

  if (!hasMappedGoogleLocation) {
    return {
      reviewCount,
      hasMappedGoogleLocation,
      hasSyncedGoogleReviews,
      isActive,
      status: "mapping_required",
      message: "This location needs a mapped Google Business Profile location before the widget can be trusted.",
    };
  }

  if (!hasSyncedGoogleReviews) {
    return {
      reviewCount,
      hasMappedGoogleLocation,
      hasSyncedGoogleReviews,
      isActive,
      status: "sync_required",
      message: "No synced Google reviews yet. Run a Google review sync for this location.",
    };
  }

  return {
    reviewCount,
    hasMappedGoogleLocation,
    hasSyncedGoogleReviews,
    isActive,
    status: "healthy",
    message: `${reviewCount} Google review${reviewCount === 1 ? "" : "s"} ready for this widget.`,
  };
}

export async function getReviewWidgetById(id: string) {
  const widget = await prisma.reviewWidget.findUnique({
    where: { id },
    include: {
      organization: true,
      location: {
        include: {
          publicProfile: true,
        },
      },
    },
  });

  if (!widget) {
    return null;
  }

  await requireOrganizationAccess(widget.organizationId);

  const reviewCount = await prisma.review.count({
    where: {
      locationId: widget.locationId,
      source: ReviewSource.GOOGLE,
      status: ReviewStatus.PUBLISHED,
    },
  });

  return {
    ...widget,
    health: buildWidgetHealth({
      reviewCount,
      hasMappedGoogleLocation: Boolean(widget.location.googleLocationName),
      isActive: widget.isActive,
    }),
  };
}

export async function getReviewWidgetByToken(publicToken: string) {
  return prisma.reviewWidget.findUnique({
    where: { publicToken },
    include: {
      location: {
        include: {
          publicProfile: true,
        },
      },
    },
  });
}

export async function getPublicReviewWidgetPayload(publicToken: string, page = 1): Promise<PublicWidgetPayload | null> {
  const widget = await getReviewWidgetByToken(publicToken);

  if (!widget || !widget.isActive) {
    return null;
  }

  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const pageSize = Math.max(1, Math.min(widget.pageSize, 50));
  const skip = (safePage - 1) * pageSize;

  const where = {
    locationId: widget.locationId,
    source: ReviewSource.GOOGLE,
    status: ReviewStatus.PUBLISHED,
    rating: {
      gte: widget.minRating,
    },
  };

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where,
      orderBy: buildOrderBy(widget.sort),
      skip,
      take: pageSize,
      select: {
        id: true,
        reviewerName: true,
        reviewerPhotoUrl: true,
        sourceReviewUrl: true,
        sourceReplyText: true,
        rating: true,
        body: true,
        reviewedAt: true,
      },
    }),
    prisma.review.count({ where }),
  ]);

  return {
    widget: {
      name: widget.name,
      layout: widget.layout,
      theme: widget.theme,
      pageSize,
      showHeader: widget.showHeader,
      showRating: widget.showRating,
      showReviewerName: widget.showReviewerName,
      showDate: widget.showDate,
      showWriteReview: widget.showWriteReview,
    },
    location: {
      name: widget.location.name,
      avgRating: widget.location.avgRating ?? null,
      reviewCount: total,
      reviewLink: widget.location.reviewLink ?? null,
    },
    reviews: reviews.map((review) => ({
      id: review.id,
      reviewerName: review.reviewerName,
      reviewerPhotoUrl: review.reviewerPhotoUrl ?? null,
      sourceReviewUrl: review.sourceReviewUrl ?? null,
      sourceReplyText: review.sourceReplyText ?? null,
      rating: review.rating,
      body: review.body,
      reviewedAt: review.reviewedAt ? review.reviewedAt.toISOString() : null,
    })),
    pagination: {
      page: safePage,
      pageSize,
      total,
      hasMore: skip + reviews.length < total,
    },
  };
}

export async function getOrganizationReviewWidgets(organizationId: string) {
  await requireOrganizationAccess(organizationId);

  const widgets = await prisma.reviewWidget.findMany({
    where: { organizationId },
    include: {
      location: true,
    },
    orderBy: [{ createdAt: "desc" }],
  });

  return Promise.all(
    widgets.map(async (widget) => {
      const reviewCount = await prisma.review.count({
        where: {
          locationId: widget.locationId,
          source: ReviewSource.GOOGLE,
          status: ReviewStatus.PUBLISHED,
        },
      });

      return {
        ...widget,
        health: buildWidgetHealth({
          reviewCount,
          hasMappedGoogleLocation: Boolean(widget.location.googleLocationName),
          isActive: widget.isActive,
        }),
      };
    }),
  );
}

export async function getWidgetEligibleLocations(organizationId: string) {
  await requireOrganizationAccess(organizationId);

  const locations = await prisma.location.findMany({
    where: { organizationId },
    orderBy: [{ name: "asc" }],
    select: {
      id: true,
      name: true,
      googleLocationName: true,
      lastSyncStatus: true,
    },
  });

  return Promise.all(
    locations.map(async (location) => {
      const reviewCount = await prisma.review.count({
        where: {
          locationId: location.id,
          source: ReviewSource.GOOGLE,
          status: ReviewStatus.PUBLISHED,
        },
      });

      const hasMappedGoogleLocation = Boolean(location.googleLocationName);
      const canCreateWidget = hasMappedGoogleLocation && reviewCount > 0;

      return {
        ...location,
        reviewCount,
        hasMappedGoogleLocation,
        canCreateWidget,
        guidance: !hasMappedGoogleLocation
          ? "Map this location to Google first"
          : reviewCount === 0
            ? "Sync Google reviews before creating a widget"
            : "Ready",
      };
    }),
  );
}
