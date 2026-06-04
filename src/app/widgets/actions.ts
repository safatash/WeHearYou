"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { generateReviewWidgetToken } from "@/lib/review-widgets";
import { getCurrentMembership, requireOrganizationAccess } from "@/lib/authz";

export async function createReviewWidget(formData: FormData) {
  const membership = await getCurrentMembership();
  const locationId = String(formData.get("locationId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim() || "Reviews Widget";

  const ALLOWED_LAYOUTS = new Set(["grid", "list", "slider", "badge", "carousel", "masonry", "floating"]);
  const rawLayout = String(formData.get("layout") ?? "").trim();
  const layout = ALLOWED_LAYOUTS.has(rawLayout) ? rawLayout : "grid";

  const ALLOWED_CONTENT_TYPES = new Set(["TEXT", "VIDEO", "MIXED"]);
  const rawContentType = String(formData.get("contentType") ?? "TEXT").trim();
  const contentType = ALLOWED_CONTENT_TYPES.has(rawContentType) ? rawContentType : "TEXT";

  if (!membership) {
    throw new Error("Organization is required");
  }

  const organizationId = membership.organizationId;

  if (!locationId) {
    throw new Error("Location is required");
  }

  await requireOrganizationAccess(organizationId);

  const location = await prisma.location.findFirst({
    where: { id: locationId, organizationId },
    select: { id: true, googleLocationName: true, name: true },
  });

  if (!location) {
    throw new Error("Location not found for this organization");
  }

  if (contentType === "VIDEO") {
    const videoCount = await prisma.videoTestimonial.count({
      where: { locationId: location.id, status: "APPROVED" },
    });
    if (videoCount === 0) {
      redirect(`/widgets?flash=${encodeURIComponent(`Publish at least one video testimonial for ${location.name} before creating a video widget`)}&tone=error`);
    }
  } else {
    if (!location.googleLocationName) {
      redirect(`/widgets?flash=${encodeURIComponent(`Map ${location.name} to Google before creating a widget`)}&tone=error`);
    }

    const reviewCount = await prisma.review.count({
      where: { locationId: location.id, source: "GOOGLE", status: "PUBLISHED" },
    });

    if (reviewCount === 0) {
      redirect(`/widgets?flash=${encodeURIComponent(`Sync Google reviews for ${location.name} before creating a widget`)}&tone=error`);
    }
  }

  const widget = await prisma.reviewWidget.create({
    data: {
      organizationId,
      locationId,
      name,
      layout,
      contentType,
      publicToken: generateReviewWidgetToken(),
    },
  });

  redirect(`/widgets/${widget.id}`);
}

export async function updateReviewWidget(formData: FormData) {
  const widgetId = String(formData.get("widgetId") ?? "").trim();

  if (!widgetId) {
    throw new Error("Widget is required");
  }

  const existing = await prisma.reviewWidget.findUnique({
    where: { id: widgetId },
    select: { id: true, organizationId: true },
  });

  if (!existing) {
    throw new Error("Widget not found");
  }

  await requireOrganizationAccess(existing.organizationId);

  const allowedLayouts = new Set([
    "grid", "list", "slider", "badge", "carousel", "masonry", "floating", "video",
    "video-grid", "video-carousel", "featured-video", "video-wall",
    "mixed-masonry", "featured-video-reviews", "mixed-carousel", "tabbed",
  ]);
  const allowedContentTypes = new Set(["TEXT", "VIDEO", "MIXED"]);
  const allowedWidgetTypes = new Set(["WALL_OF_LOVE", "SINGLE_TESTIMONIAL", "BADGE", "COLLECTING"]);
  const allowedBadgeStyles = new Set(["rating", "compact", "review_cta", "trust"]);
  const allowedAligns = new Set(["left", "center"]);
  const allowedFonts = new Set(["system", "sans", "serif"]);
  const allowedDisplayFreqs = new Set(["always", "50pct", "33pct"]);
  const allowedButtonThemes = new Set(["default", "minimal", "branded"]);
  const allowedMobileBehaviors = new Set(["pill", "hidden"]);
  const allowedCollectPositions = new Set(["left", "right", "bottom-left", "bottom-right"]);

  const rawContentType = String(formData.get("contentType") ?? "TEXT").trim();
  const contentType = allowedContentTypes.has(rawContentType) ? rawContentType : "TEXT";

  const rawWidgetType = String(formData.get("widgetType") ?? "").trim();
  const widgetType = allowedWidgetTypes.has(rawWidgetType) ? rawWidgetType : null;

  const rawBadgeStyle = String(formData.get("badgeStyle") ?? "").trim();
  const badgeStyle = allowedBadgeStyles.has(rawBadgeStyle) ? rawBadgeStyle : null;

  const showSourceLogo = String(formData.get("showSourceLogo") ?? "") === "on";

  // Single testimonial IDs — enforce mutual exclusion
  const rawSingleReviewId = String(formData.get("singleTestimonialReviewId") ?? "").trim();
  const rawSingleVideoId = String(formData.get("singleTestimonialVideoId") ?? "").trim();
  let singleTestimonialReviewId: string | null = null;
  let singleTestimonialVideoId: string | null = null;
  if (widgetType === "SINGLE_TESTIMONIAL") {
    if (rawSingleVideoId) {
      singleTestimonialVideoId = rawSingleVideoId;
    } else if (rawSingleReviewId) {
      singleTestimonialReviewId = rawSingleReviewId;
    }
  }

  const rawCollectDisplayFreq = String(formData.get("collectDisplayFreq") ?? "").trim();
  const rawCollectButtonTheme = String(formData.get("collectButtonTheme") ?? "").trim();
  const rawCollectMobileBehavior = String(formData.get("collectMobileBehavior") ?? "").trim();
  const rawCollectButtonPosition = String(formData.get("collectButtonPosition") ?? "").trim();
  const rawCollectButtonColor = String(formData.get("collectButtonColor") ?? "").trim();

  const rawLayout = String(formData.get("layout") ?? "grid");
  const rawAlign = String(formData.get("headerAlign") ?? "left");
  const rawFont = String(formData.get("fontFamily") ?? "system");
  const rawMinRating = Number(formData.get("minRating") ?? 1);
  const rawPageSize = Number(formData.get("pageSize") ?? 12);
  const rawBodyMaxChars = Number(formData.get("bodyMaxChars") ?? 280);

  const hexColor = (raw: FormDataEntryValue | null, fallback: string) => {
    const value = String(raw ?? "").trim();
    return /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;
  };

  await prisma.reviewWidget.update({
    where: { id: widgetId },
    data: {
      name: String(formData.get("name") ?? "").trim(),
      layout: allowedLayouts.has(rawLayout) ? rawLayout : "grid",
      contentType,
      widgetType,
      badgeStyle,
      showSourceLogo,
      singleTestimonialReviewId,
      singleTestimonialVideoId,
      theme: String(formData.get("theme") ?? "light"),
      sort: String(formData.get("sort") ?? "newest"),
      minRating: Number.isFinite(rawMinRating) ? Math.max(1, Math.min(5, Math.floor(rawMinRating))) : 1,
      pageSize: Number.isFinite(rawPageSize) ? Math.max(1, Math.min(50, Math.floor(rawPageSize))) : 12,
      isActive: String(formData.get("isActive") ?? "") === "on",

      // Header panel
      showHeader: String(formData.get("showHeader") ?? "") === "on",
      showAvgRating: String(formData.get("showAvgRating") ?? "") === "on",
      showReviewCount: String(formData.get("showReviewCount") ?? "") === "on",
      headerAlign: allowedAligns.has(rawAlign) ? rawAlign : "left",

      // Reviews panel
      showRating: String(formData.get("showRating") ?? "") === "on",
      showReviewerName: String(formData.get("showReviewerName") ?? "") === "on",
      showDate: String(formData.get("showDate") ?? "") === "on",
      showWriteReview: String(formData.get("showWriteReview") ?? "") === "on",
      showResponses: String(formData.get("showResponses") ?? "") === "on",
      bodyMaxChars: Number.isFinite(rawBodyMaxChars) ? Math.max(40, Math.min(2000, Math.floor(rawBodyMaxChars))) : 280,

      // Appearance panel
      primaryColor: hexColor(formData.get("primaryColor"), "#4338ca"),
      starColor: hexColor(formData.get("starColor"), "#f59e0b"),
      backgroundColor: hexColor(formData.get("backgroundColor"), "#ffffff"),
      textColor: hexColor(formData.get("textColor"), "#0f172a"),
      fontFamily: allowedFonts.has(rawFont) ? rawFont : "system",

      // Collecting Widget
      collectDisplayFreq: allowedDisplayFreqs.has(rawCollectDisplayFreq) ? rawCollectDisplayFreq : null,
      collectButtonColor: /^#[0-9a-fA-F]{6}$/.test(rawCollectButtonColor) ? rawCollectButtonColor : null,
      collectButtonTheme: allowedButtonThemes.has(rawCollectButtonTheme) ? rawCollectButtonTheme : null,
      collectMobileBehavior: allowedMobileBehaviors.has(rawCollectMobileBehavior) ? rawCollectMobileBehavior : null,
      collectButtonPosition: allowedCollectPositions.has(rawCollectButtonPosition) ? rawCollectButtonPosition : null,
    },
  });

  redirect(`/widgets/${widgetId}?flash=Widget+updated&tone=success`);
}

export async function deleteReviewWidget(formData: FormData) {
  const widgetId = String(formData.get("widgetId") ?? "").trim();
  if (!widgetId) throw new Error("Widget is required");

  const existing = await prisma.reviewWidget.findUnique({
    where: { id: widgetId },
    select: { id: true, organizationId: true },
  });
  if (!existing) throw new Error("Widget not found");

  await requireOrganizationAccess(existing.organizationId);
  await prisma.reviewWidget.delete({ where: { id: widgetId } });

  redirect("/widgets?flash=Widget+deleted&tone=success");
}

export async function regenerateReviewWidgetToken(formData: FormData) {
  const widgetId = String(formData.get("widgetId") ?? "").trim();

  if (!widgetId) {
    throw new Error("Widget is required");
  }

  const existing = await prisma.reviewWidget.findUnique({
    where: { id: widgetId },
    select: { id: true, organizationId: true },
  });

  if (!existing) {
    throw new Error("Widget not found");
  }

  await requireOrganizationAccess(existing.organizationId);

  await prisma.reviewWidget.update({
    where: { id: widgetId },
    data: {
      publicToken: generateReviewWidgetToken(),
    },
  });

  redirect(`/widgets/${widgetId}?flash=Embed+token+regenerated&tone=success`);
}
