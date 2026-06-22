import crypto from "node:crypto";
import { ReviewSource, ReviewStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireOrganizationAccess } from "@/lib/authz";
import { resolveEmbedRenderKind, isKnownWidgetType, normalizeMarqueeSpeed, type EmbedRenderKind } from "@/lib/widget-embed";

export type PublicWidgetReview = {
  id: string;
  reviewerName: string;
  reviewerPhotoUrl: string | null;
  sourceReviewUrl: string | null;
  sourceReplyText: string | null;
  rating: number;
  body: string;
  reviewedAt: string | null;
  source: string; // "GOOGLE" | "FACEBOOK" | "YELP" | "INTERNAL"
};

export type PublicWidgetVideoTestimonial = {
  id: string;
  submitterName: string | null;
  videoUrl: string;
  durationSeconds: number | null;
  caption: string | null;
  publishedAt: string | null;
  customThumbnailUrl: string | null;
  capturedFrameUrl: string | null;
  capturedFrameTimestamp: number | null;
  thumbnailSource: string;
};

export type PublicWidgetPayload = {
  widget: {
    name: string;
    layout: string;
    renderKind: EmbedRenderKind;
    marqueeSpeed: string;
    theme: string;
    pageSize: number;
    contentType: string;
    widgetType: string | null;
    badgeStyle: string | null;
    // Header
    showHeader: boolean;
    showAvgRating: boolean;
    showReviewCount: boolean;
    headerAlign: string;
    // Reviews
    showRating: boolean;
    showReviewerName: boolean;
    showDate: boolean;
    showWriteReview: boolean;
    showResponses: boolean;
    showSourceLogo: boolean;
    showAiSummary: boolean;
    bodyMaxChars: number;
    // Appearance
    primaryColor: string;
    starColor: string;
    backgroundColor: string;
    textColor: string;
    fontFamily: string;
    // Collecting Widget
    collectDisplayFreq: string | null;
    collectButtonColor: string | null;
    collectButtonTheme: string | null;
    collectMobileBehavior: string | null;
    collectButtonPosition: string | null;
    // Floating Widget
    floatingCardStyle: string | null;
    floatingVariation: string | null;
    floatingPosition: string | null;
    floatingRotationEnabled: boolean | null;
    floatingRotationIntervalSec: number | null;
    floatingAccentColorMode: string | null;
    floatingAccentColor: string | null;
    floatingMobileBehavior: string | null;
    floatingApprovedOnly: boolean | null;
    floatingMinRating: number | null;
    floatingDisplayFrequency: string | null;
  };
  location: {
    name: string;
    slug: string;
    avgRating: number | null;
    reviewCount: number;
    reviewLink: string | null;
    aiReviewSummary: string | null;
    aiReviewSummaryReviewCount: number | null;
  };
  reviews: PublicWidgetReview[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    hasMore: boolean;
  };
  videoTestimonials?: PublicWidgetVideoTestimonial[];
  singleItemUnavailable?: boolean;
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
      source: { in: [ReviewSource.GOOGLE, ReviewSource.INTERNAL] },
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

  // Surface genuinely unknown widget types instead of silently rendering the
  // default review list for them.
  if (!isKnownWidgetType(widget.widgetType)) {
    console.warn(`[widget-embed] Unknown widgetType "${widget.widgetType}" for widget ${widget.id} — falling back to review list.`);
  }

  // Shared widget sub-object builder
  const buildWidgetObj = (ps: number) => ({
    name: widget.name,
    layout: widget.layout,
    renderKind: resolveEmbedRenderKind(widget.widgetType, widget.layout),
    marqueeSpeed: normalizeMarqueeSpeed(widget.marqueeSpeed),
    theme: widget.theme,
    pageSize: ps,
    contentType: widget.contentType,
    widgetType: widget.widgetType ?? null,
    badgeStyle: widget.badgeStyle ?? null,
    showHeader: widget.showHeader,
    showAvgRating: widget.showAvgRating,
    showReviewCount: widget.showReviewCount,
    headerAlign: widget.headerAlign,
    showRating: widget.showRating,
    showReviewerName: widget.showReviewerName,
    showDate: widget.showDate,
    showWriteReview: widget.showWriteReview,
    showResponses: widget.showResponses,
    showSourceLogo: widget.showSourceLogo,
    showAiSummary: widget.showAiSummary,
    bodyMaxChars: widget.bodyMaxChars,
    primaryColor: widget.primaryColor,
    starColor: widget.starColor,
    backgroundColor: widget.backgroundColor,
    textColor: widget.textColor,
    fontFamily: widget.fontFamily,
    collectDisplayFreq: widget.collectDisplayFreq ?? null,
    collectButtonColor: widget.collectButtonColor ?? null,
    collectButtonTheme: widget.collectButtonTheme ?? null,
    collectMobileBehavior: widget.collectMobileBehavior ?? null,
    collectButtonPosition: widget.collectButtonPosition ?? null,
    floatingCardStyle: widget.floatingCardStyle ?? null,
    floatingVariation: widget.floatingVariation ?? null,
    floatingPosition: widget.floatingPosition ?? null,
    floatingRotationEnabled: widget.floatingRotationEnabled ?? null,
    floatingRotationIntervalSec: widget.floatingRotationIntervalSec ?? null,
    floatingAccentColorMode: widget.floatingAccentColorMode ?? null,
    floatingAccentColor: widget.floatingAccentColor ?? null,
    floatingMobileBehavior: widget.floatingMobileBehavior ?? null,
    floatingApprovedOnly: widget.floatingApprovedOnly ?? null,
    floatingMinRating: widget.floatingMinRating ?? null,
    floatingDisplayFrequency: widget.floatingDisplayFrequency ?? null,
  });

  const buildLocationObj = (reviewCount: number) => ({
    name: widget.location.name,
    slug: widget.location.slug,
    avgRating: widget.location.avgRating ?? null,
    reviewCount,
    reviewLink: widget.location.reviewLink ?? null,
    aiReviewSummary: widget.location.publicProfile?.showAiReviewSummary
      ? (widget.location.publicProfile.aiReviewSummary ?? null)
      : null,
    aiReviewSummaryReviewCount: widget.location.publicProfile?.showAiReviewSummary
      ? (widget.location.publicProfile.aiReviewSummaryReviewCount ?? null)
      : null,
  });

  // ── Single Testimonial: fetch exactly the pinned item ─────────────────────
  if (widget.widgetType === "SINGLE_TESTIMONIAL") {
    let singleReviews: PublicWidgetReview[] = [];
    let singleVideos: PublicWidgetVideoTestimonial[] = [];
    let singleItemUnavailable = false;

    if (widget.contentType === "VIDEO" && widget.singleTestimonialVideoId) {
      const vt = await prisma.videoTestimonial.findFirst({
        where: {
          id: widget.singleTestimonialVideoId,
          status: "APPROVED",
          videoUrl: { not: null },
        },
        select: { id: true, submitterName: true, videoUrl: true, durationSeconds: true, caption: true, publishedAt: true, customThumbnailUrl: true, capturedFrameUrl: true, capturedFrameTimestamp: true, thumbnailSource: true },
      });
      if (vt?.videoUrl) {
        singleVideos = [{
          id: vt.id,
          submitterName: vt.submitterName,
          videoUrl: vt.videoUrl,
          durationSeconds: vt.durationSeconds,
          caption: vt.caption,
          publishedAt: vt.publishedAt ? vt.publishedAt.toISOString() : null,
          customThumbnailUrl: vt.customThumbnailUrl,
          capturedFrameUrl: vt.capturedFrameUrl,
          capturedFrameTimestamp: vt.capturedFrameTimestamp,
          thumbnailSource: vt.thumbnailSource,
        }];
      } else {
        singleItemUnavailable = true;
      }
    } else if (widget.singleTestimonialReviewId) {
      const rev = await prisma.review.findFirst({
        where: { id: widget.singleTestimonialReviewId, status: ReviewStatus.PUBLISHED },
        select: {
          id: true, reviewerName: true, reviewerPhotoUrl: true, sourceReviewUrl: true,
          sourceReplyText: true, replyDraft: true, replyPublishedAt: true, replySentAt: true,
          rating: true, body: true, reviewedAt: true, source: true,
        },
      });
      if (rev) {
        singleReviews = [{
          id: rev.id,
          reviewerName: rev.reviewerName,
          reviewerPhotoUrl: rev.reviewerPhotoUrl ?? null,
          sourceReviewUrl: rev.sourceReviewUrl ?? null,
          sourceReplyText: rev.sourceReplyText ?? null,
          rating: rev.rating ?? 0,
          body: rev.body,
          reviewedAt: rev.reviewedAt ? rev.reviewedAt.toISOString() : null,
          source: rev.source as string,
        }];
      } else {
        singleItemUnavailable = true;
      }
    }

    return {
      widget: buildWidgetObj(1),
      location: buildLocationObj(singleReviews.length),
      reviews: singleReviews,
      pagination: { page: 1, pageSize: 1, total: singleReviews.length, hasMore: false },
      ...(singleVideos.length > 0 ? { videoTestimonials: singleVideos } : {}),
      ...(singleItemUnavailable ? { singleItemUnavailable: true } : {}),
    };
  }

  // ── Floating Widget: return up to 20 reviews for client-side rotation ────────
  if (widget.widgetType === "FLOATING") {
    const minRating = widget.floatingMinRating ?? 4;
    const floatingReviews = await prisma.review.findMany({
      where: {
        locationId: widget.locationId,
        source: { in: [ReviewSource.GOOGLE, ReviewSource.INTERNAL] },
        status: ReviewStatus.PUBLISHED,
        rating: { gte: minRating },
      },
      orderBy: [{ reviewedAt: "desc" }, { createdAt: "desc" }],
      take: 20,
      select: {
        id: true, reviewerName: true, reviewerPhotoUrl: true,
        sourceReviewUrl: true, sourceReplyText: true,
        replyDraft: true, replyPublishedAt: true, replySentAt: true,
        rating: true, body: true, reviewedAt: true, source: true,
      },
    });

    return {
      widget: buildWidgetObj(floatingReviews.length),
      location: buildLocationObj(floatingReviews.length),
      reviews: floatingReviews.map((r) => ({
        id: r.id,
        reviewerName: r.reviewerName,
        reviewerPhotoUrl: r.reviewerPhotoUrl ?? null,
        sourceReviewUrl: r.sourceReviewUrl ?? null,
        sourceReplyText: r.source === ReviewSource.INTERNAL
          ? (r.replyPublishedAt ? r.replyDraft : null)
          : (r.sourceReplyText ?? ((r.replyPublishedAt || r.replySentAt) ? r.replyDraft : null) ?? null),
        rating: r.rating ?? 5,
        body: r.body,
        reviewedAt: r.reviewedAt ? r.reviewedAt.toISOString() : null,
        source: r.source as string,
      })),
      pagination: { page: 1, pageSize: 20, total: floatingReviews.length, hasMore: false },
    };
  }

  // ── Normal Wall of Love / Badge flow ─────────────────────────────────────
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const pageSize = Math.max(1, Math.min(widget.pageSize, 50));
  const skip = (safePage - 1) * pageSize;

  const where = {
    locationId: widget.locationId,
    source: { in: [ReviewSource.GOOGLE, ReviewSource.INTERNAL] },
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
        replyDraft: true,
        replyPublishedAt: true,
        replySentAt: true,
        rating: true,
        body: true,
        reviewedAt: true,
        source: true,
      },
    }),
    prisma.review.count({ where }),
  ]);

  const videoTestimonials: PublicWidgetVideoTestimonial[] = [];
  if (widget.contentType === "VIDEO" || widget.contentType === "MIXED") {
    const vts = await prisma.videoTestimonial.findMany({
      where: {
        locationId: widget.locationId,
        status: "APPROVED",
        videoUrl: { not: null },
      },
      orderBy: { publishedAt: "desc" },
      select: {
        id: true,
        submitterName: true,
        videoUrl: true,
        durationSeconds: true,
        caption: true,
        publishedAt: true,
        customThumbnailUrl: true,
        capturedFrameUrl: true,
        capturedFrameTimestamp: true,
        thumbnailSource: true,
      },
    });
    videoTestimonials.push(
      ...vts
        .filter((v): v is typeof v & { videoUrl: string } => v.videoUrl !== null)
        .map((v) => ({
          id: v.id,
          submitterName: v.submitterName,
          videoUrl: v.videoUrl,
          durationSeconds: v.durationSeconds,
          caption: v.caption,
          publishedAt: v.publishedAt ? v.publishedAt.toISOString() : null,
          customThumbnailUrl: v.customThumbnailUrl,
          capturedFrameUrl: v.capturedFrameUrl,
          capturedFrameTimestamp: v.capturedFrameTimestamp,
          thumbnailSource: v.thumbnailSource,
        }))
    );
  }

  return {
    widget: buildWidgetObj(pageSize),
    location: buildLocationObj(total),
    reviews: reviews.map((review) => ({
      id: review.id,
      reviewerName: review.reviewerName,
      reviewerPhotoUrl: review.reviewerPhotoUrl ?? null,
      sourceReviewUrl: review.sourceReviewUrl ?? null,
      sourceReplyText: review.source === ReviewSource.INTERNAL
        ? (review.replyPublishedAt ? review.replyDraft : null)
        : (review.sourceReplyText ?? ((review.replyPublishedAt || review.replySentAt) ? review.replyDraft : null) ?? null),
      rating: review.rating ?? 0,
      body: review.body,
      reviewedAt: review.reviewedAt ? review.reviewedAt.toISOString() : null,
      source: review.source as string,
    })),
    pagination: {
      page: safePage,
      pageSize,
      total,
      hasMore: skip + reviews.length < total,
    },
    ...(videoTestimonials.length > 0 ? { videoTestimonials } : {}),
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
          source: { in: [ReviewSource.GOOGLE, ReviewSource.INTERNAL] },
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
          source: { in: [ReviewSource.GOOGLE, ReviewSource.INTERNAL] },
          status: ReviewStatus.PUBLISHED,
        },
      });

      const videoTestimonialCount = await prisma.videoTestimonial.count({
        where: { locationId: location.id, status: "APPROVED" },
      });

      const hasMappedGoogleLocation = Boolean(location.googleLocationName);
      const canCreateWidget = hasMappedGoogleLocation && reviewCount > 0;

      return {
        ...location,
        reviewCount,
        videoTestimonialCount,
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

export async function getWidgetPickerData(locationId: string) {
  const [reviews, videos] = await Promise.all([
    prisma.review.findMany({
      where: {
        locationId,
        source: { in: [ReviewSource.GOOGLE, ReviewSource.INTERNAL] },
        status: ReviewStatus.PUBLISHED,
      },
      orderBy: [{ reviewedAt: "desc" }, { createdAt: "desc" }],
      take: 50,
      select: {
        id: true,
        reviewerName: true,
        reviewerPhotoUrl: true,
        rating: true,
        body: true,
        reviewedAt: true,
        source: true,
      },
    }),
    prisma.videoTestimonial.findMany({
      where: {
        locationId,
        status: "APPROVED",
        videoUrl: { not: null },
      },
      orderBy: { publishedAt: "desc" },
      select: {
        id: true,
        submitterName: true,
        videoUrl: true,
        durationSeconds: true,
        caption: true,
        publishedAt: true,
        customThumbnailUrl: true,
        capturedFrameUrl: true,
        capturedFrameTimestamp: true,
        thumbnailSource: true,
      },
    }),
  ]);

  return {
    reviews: reviews.map((r) => ({
      id: r.id,
      reviewerName: r.reviewerName,
      reviewerPhotoUrl: r.reviewerPhotoUrl ?? null,
      rating: r.rating ?? 0,
      body: r.body,
      reviewedAt: r.reviewedAt ? r.reviewedAt.toISOString() : null,
      source: r.source as string,
    })),
    videos: videos
      .filter((v): v is typeof v & { videoUrl: string } => v.videoUrl !== null)
      .map((v) => ({
        id: v.id,
        submitterName: v.submitterName ?? null,
        videoUrl: v.videoUrl,
        durationSeconds: v.durationSeconds ?? null,
        caption: v.caption ?? null,
        publishedAt: v.publishedAt ? v.publishedAt.toISOString() : null,
        customThumbnailUrl: v.customThumbnailUrl,
        capturedFrameUrl: v.capturedFrameUrl,
        capturedFrameTimestamp: v.capturedFrameTimestamp,
        thumbnailSource: v.thumbnailSource,
      })),
  };
}
