"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ReviewSource, ReviewStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generateReviewWidgetToken } from "@/lib/review-widgets";
import { getCurrentMembership, requireOrganizationAccess } from "@/lib/authz";
import { generateAiReviewSummary } from "@/lib/ai-summary";
import { limitReached } from "@/lib/plan-features";

const WIDGET_LIMIT_FLASH = "You've reached your plan's widget limit. Upgrade to add more.";

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

  const floatingDefaults = layout === "floating" ? {
    widgetType: "FLOATING",
    floatingCardStyle: "dark_solid_pill",
    floatingVariation: "standard",
    floatingPosition: "bottom-right",
    floatingRotationEnabled: true,
    floatingRotationIntervalSec: 8,
    floatingAccentColorMode: "inherit",
    floatingMobileBehavior: "show",
    floatingApprovedOnly: true,
    floatingMinRating: 4,
    floatingDisplayFrequency: "always",
  } : {};

  const widget = await prisma.reviewWidget.create({
    data: {
      organizationId,
      locationId,
      name,
      layout,
      contentType,
      publicToken: generateReviewWidgetToken(),
      ...floatingDefaults,
    },
  });

  redirect(`/widgets/${widget.id}`);
}

// Create a blank draft for the first eligible location and open it in the
// editor. Opens with ?new=1 so the editor knows to allow type selection.
export async function createDraftReviewWidget() {
  const membership = await getCurrentMembership();
  if (!membership) {
    throw new Error("Organization is required");
  }
  const organizationId = membership.organizationId;
  await requireOrganizationAccess(organizationId);

  if (limitReached(membership.organization.planId, "widgets", await prisma.reviewWidget.count({ where: { organizationId } }))) {
    redirect(`/widgets?flash=${encodeURIComponent(WIDGET_LIMIT_FLASH)}&tone=error`);
  }

  const locations = await prisma.location.findMany({
    where: { organizationId },
    select: { id: true, googleLocationName: true },
    orderBy: { name: "asc" },
  });

  let chosenLocationId: string | null = null;
  for (const loc of locations) {
    if (!loc.googleLocationName) continue;
    const reviewCount = await prisma.review.count({
      where: { locationId: loc.id, source: "GOOGLE", status: "PUBLISHED" },
    });
    if (reviewCount > 0) {
      chosenLocationId = loc.id;
      break;
    }
  }

  if (!chosenLocationId) {
    redirect(`/widgets?flash=${encodeURIComponent("Sync Google reviews for a location before creating a widget")}&tone=error`);
  }

  const widget = await prisma.reviewWidget.create({
    data: {
      organizationId,
      locationId: chosenLocationId,
      name: "Untitled widget",
      layout: "masonry",
      contentType: "TEXT",
      publicToken: generateReviewWidgetToken(),
    },
  });

  redirect(`/widgets/${widget.id}?new=1`);
}

// Create a draft widget with a specific type chosen upfront by the user.
export async function createDraftReviewWidgetWithType(formData: FormData) {
  const membership = await getCurrentMembership();
  if (!membership) throw new Error("Organization is required");
  const organizationId = membership.organizationId;
  await requireOrganizationAccess(organizationId);

  if (limitReached(membership.organization.planId, "widgets", await prisma.reviewWidget.count({ where: { organizationId } }))) {
    redirect(`/widgets?flash=${encodeURIComponent(WIDGET_LIMIT_FLASH)}&tone=error`);
  }

  const typeKey = String(formData.get("typeKey") ?? "").trim();
  const TYPE_TO_FIELDS: Record<string, { widgetType: string; layout: string }> = {
    grid:       { widgetType: "WALL_OF_LOVE",       layout: "masonry"  },
    carousel:   { widgetType: "WALL_OF_LOVE",       layout: "carousel" },
    single:     { widgetType: "SINGLE_TESTIMONIAL", layout: "grid"     },
    badge:      { widgetType: "BADGE",              layout: "badge"    },
    collecting: { widgetType: "COLLECTING",         layout: "grid"     },
    floating:   { widgetType: "FLOATING",           layout: "floating" },
  };
  const fields = TYPE_TO_FIELDS[typeKey] ?? TYPE_TO_FIELDS["grid"];

  const locations = await prisma.location.findMany({
    where: { organizationId },
    select: { id: true, googleLocationName: true },
    orderBy: { name: "asc" },
  });
  let chosenLocationId: string | null = null;
  for (const loc of locations) {
    if (!loc.googleLocationName) continue;
    const reviewCount = await prisma.review.count({
      where: { locationId: loc.id, source: "GOOGLE", status: "PUBLISHED" },
    });
    if (reviewCount > 0) { chosenLocationId = loc.id; break; }
  }
  if (!chosenLocationId) {
    redirect(`/widgets?flash=${encodeURIComponent("Sync Google reviews for a location before creating a widget")}&tone=error`);
  }

  const floatingDefaults = fields.widgetType === "FLOATING" ? {
    floatingCardStyle: "dark_solid_pill",
    floatingVariation: "standard",
    floatingPosition: "bottom-right",
    floatingRotationEnabled: true,
    floatingRotationIntervalSec: 8,
    floatingAccentColorMode: "inherit",
    floatingMobileBehavior: "show",
    floatingApprovedOnly: true,
    floatingMinRating: 4,
    floatingDisplayFrequency: "always",
  } : {};

  const widget = await prisma.reviewWidget.create({
    data: {
      organizationId,
      locationId: chosenLocationId,
      name: "Untitled widget",
      layout: fields.layout,
      widgetType: fields.widgetType,
      contentType: "TEXT",
      publicToken: generateReviewWidgetToken(),
      ...floatingDefaults,
    },
  });
  redirect(`/widgets/${widget.id}?new=1`);
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
  const allowedWidgetTypes = new Set(["WALL_OF_LOVE", "SINGLE_TESTIMONIAL", "BADGE", "COLLECTING", "FLOATING"]);
  const allowedBadgeStyles = new Set(["rating", "compact", "review_cta", "trust"]);
  const allowedAligns = new Set(["left", "center"]);
  const allowedFonts = new Set(["system", "sans", "serif"]);
  const allowedDisplayFreqs = new Set(["always", "50pct", "33pct"]);
  const allowedButtonThemes = new Set(["default", "minimal", "branded"]);
  const allowedMobileBehaviors = new Set(["pill", "hidden"]);
  const allowedCollectPositions = new Set(["left", "right", "bottom-left", "bottom-right"]);

  const allowedFloatingCardStyles = new Set(["dark_solid_pill", "frosted_glass_pill", "below_card", "notification_compact"]);
  const allowedFloatingVariations = new Set(["compact", "standard", "rich"]);
  const allowedFloatingPositions = new Set(["bottom-right", "bottom-left", "left", "right"]);
  const allowedFloatingMobileBehaviors = new Set(["show", "compact", "hide"]);
  const allowedFloatingAccentModes = new Set(["inherit", "custom"]);
  const allowedFloatingFrequencies = new Set(["always", "half", "third"]);

  const rawFloatingCardStyle = String(formData.get("floatingCardStyle") ?? "").trim();
  const rawFloatingVariation = String(formData.get("floatingVariation") ?? "").trim();
  const rawFloatingPosition = String(formData.get("floatingPosition") ?? "").trim();
  const rawFloatingRotationIntervalSec = Number(formData.get("floatingRotationIntervalSec") ?? 8);
  const rawFloatingAccentColorMode = String(formData.get("floatingAccentColorMode") ?? "").trim();
  const rawFloatingAccentColor = String(formData.get("floatingAccentColor") ?? "").trim();
  const rawFloatingMobileBehavior = String(formData.get("floatingMobileBehavior") ?? "").trim();
  const rawFloatingMinRating = Number(formData.get("floatingMinRating") ?? 4);
  const rawFloatingDisplayFrequency = String(formData.get("floatingDisplayFrequency") ?? "").trim();

  const rawContentType = String(formData.get("contentType") ?? "TEXT").trim();
  const contentType = allowedContentTypes.has(rawContentType) ? rawContentType : "TEXT";

  const rawWidgetType = String(formData.get("widgetType") ?? "").trim();
  const widgetType = allowedWidgetTypes.has(rawWidgetType) ? rawWidgetType : null;

  const rawBadgeStyle = String(formData.get("badgeStyle") ?? "").trim();
  const badgeStyle = allowedBadgeStyles.has(rawBadgeStyle) ? rawBadgeStyle : null;

  const showSourceLogo = String(formData.get("showSourceLogo") ?? "") === "on";
  const showAiSummary = String(formData.get("showAiSummary") ?? "") === "on";
  const showNav = String(formData.get("showNav") ?? "") === "on";
  const showPagination = String(formData.get("showPagination") ?? "") === "on";

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
  const rawStarColorMode = String(formData.get("starColorMode") ?? "gold");
  const rawCornerRadius = parseInt(formData.get("cornerRadius") as string) || 12;
  const rawCardStyle = String(formData.get("cardStyle") ?? "border");
  const rawDensity = String(formData.get("density") ?? "cozy");
  const rawGridColumns = String(formData.get("gridColumns") ?? "auto");
  const rawWallStyle = String(formData.get("wallStyle") ?? "varied");
  const rawCardHeights = String(formData.get("cardHeights") ?? "equal");
  const rawEnabledSources = String(formData.get("enabledSources") ?? "").trim();
  // Spotlight & Pins
  const rawSpotlightReviewId = String(formData.get("spotlightReviewId") ?? "").trim() || null;
  const rawPinnedReviewIds = String(formData.get("pinnedReviewIds") ?? "").trim();
  // reviewHighlights is a JSON string [{reviewId, quote}] — validate it's parseable
  const rawReviewHighlights = (() => {
    const raw = String(formData.get("reviewHighlights") ?? "").trim();
    if (!raw) return "";
    try { JSON.parse(raw); return raw; } catch { return ""; }
  })();
  const rawMinRating = Number(formData.get("minRating") ?? 1);
  const rawPageSize = Number(formData.get("pageSize") ?? 12);
  const rawBodyMaxChars = Number(formData.get("bodyMaxChars") ?? 280);
  const fontSizeBase = parseInt(formData.get("fontSizeBase") as string) || 14;
  const fontSizeNames = parseInt(formData.get("fontSizeNames") as string) || 13;
  const fontSizeHeader = parseInt(formData.get("fontSizeHeader") as string) || 20;
  const fontSizeLabel = parseInt(formData.get("fontSizeLabel") as string) || 12;
  const fontSizeSummary = parseInt(formData.get("fontSizeSummary") as string) || 14;

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
      showAiSummary,
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
      marqueeSpeed: ["slow", "normal", "fast"].includes(String(formData.get("marqueeSpeed") ?? "")) ? String(formData.get("marqueeSpeed")) : "normal",
      bodyMaxChars: Number.isFinite(rawBodyMaxChars) ? Math.max(40, Math.min(2000, Math.floor(rawBodyMaxChars))) : 280,
      showNav,
      showPagination,
      showBranding: String(formData.get("showBranding") ?? "") === "on",

      // Appearance panel
      primaryColor: hexColor(formData.get("primaryColor"), "#4338ca"),
      starColor: hexColor(formData.get("starColor"), "#f59e0b"),
      backgroundColor: hexColor(formData.get("backgroundColor"), "#ffffff"),
      textColor: hexColor(formData.get("textColor"), "#0f172a"),
      fontFamily: allowedFonts.has(rawFont) ? rawFont : "system",
      starColorMode: ["gold", "accent", "ink"].includes(rawStarColorMode) ? rawStarColorMode : "gold",
      cornerRadius: Math.max(0, Math.min(22, rawCornerRadius)),
      cardStyle: ["border", "shadow", "soft"].includes(rawCardStyle) ? rawCardStyle : "border",
      density: ["cozy", "compact"].includes(rawDensity) ? rawDensity : "cozy",
      gridColumns: ["auto", "2", "3"].includes(rawGridColumns) ? rawGridColumns : "auto",
      wallStyle: ["varied", "uniform"].includes(rawWallStyle) ? rawWallStyle : "varied",
      // cardHeights: ["equal", "natural"].includes(rawCardHeights) ? rawCardHeights : "equal", // field not in schema
      enabledSources: rawEnabledSources, // empty string = all sources enabled
      // Spotlight & Pins (using singleTestimonialReviewId instead)
      // spotlightReviewId: rawSpotlightReviewId, // field not in schema
      // pinnedReviewIds: rawPinnedReviewIds, // field not in schema
      // reviewHighlights: rawReviewHighlights, // field not in schema
      fontSizeBase: Math.max(11, Math.min(18, fontSizeBase)),
      fontSizeNames: Math.max(10, Math.min(16, fontSizeNames)),
      fontSizeHeader: Math.max(14, Math.min(28, fontSizeHeader)),
      fontSizeLabel: Math.max(10, Math.min(14, fontSizeLabel)),
      fontSizeSummary: Math.max(11, Math.min(16, fontSizeSummary)),

      // Collecting Widget
      collectDisplayFreq: allowedDisplayFreqs.has(rawCollectDisplayFreq) ? rawCollectDisplayFreq : null,
      collectButtonColor: /^#[0-9a-fA-F]{6}$/.test(rawCollectButtonColor) ? rawCollectButtonColor : null,
      collectButtonTheme: allowedButtonThemes.has(rawCollectButtonTheme) ? rawCollectButtonTheme : null,
      collectMobileBehavior: allowedMobileBehaviors.has(rawCollectMobileBehavior) ? rawCollectMobileBehavior : null,
      collectButtonPosition: allowedCollectPositions.has(rawCollectButtonPosition) ? rawCollectButtonPosition : null,

      // Floating Widget
      floatingCardStyle: allowedFloatingCardStyles.has(rawFloatingCardStyle) ? rawFloatingCardStyle : null,
      floatingVariation: allowedFloatingVariations.has(rawFloatingVariation) ? rawFloatingVariation : null,
      floatingPosition: allowedFloatingPositions.has(rawFloatingPosition) ? rawFloatingPosition : null,
      floatingRotationEnabled: String(formData.get("floatingRotationEnabled") ?? "") === "on",
      floatingRotationIntervalSec: [5, 8, 12, 30].includes(rawFloatingRotationIntervalSec) ? rawFloatingRotationIntervalSec : 8,
      floatingAccentColorMode: allowedFloatingAccentModes.has(rawFloatingAccentColorMode) ? rawFloatingAccentColorMode : "inherit",
      floatingAccentColor: /^#[0-9a-fA-F]{6}$/.test(rawFloatingAccentColor) ? rawFloatingAccentColor : null,
      floatingMobileBehavior: allowedFloatingMobileBehaviors.has(rawFloatingMobileBehavior) ? rawFloatingMobileBehavior : null,
      floatingApprovedOnly: String(formData.get("floatingApprovedOnly") ?? "") === "on",
      floatingMinRating: rawFloatingMinRating === 5 ? 5 : 4,
      floatingDisplayFrequency: allowedFloatingFrequencies.has(rawFloatingDisplayFrequency) ? rawFloatingDisplayFrequency : null,
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

export async function bulkDeleteWidgets(formData: FormData) {
  "use server";
  const raw = String(formData.get("widgetIds") ?? "").trim();
  const widgetIds = raw.split(",").map((s) => s.trim()).filter(Boolean);
  if (!widgetIds.length) redirect("/widgets?flash=No+widgets+selected&tone=error");

  // Verify all widgets belong to an org the caller can access
  const widgets = await prisma.reviewWidget.findMany({
    where: { id: { in: widgetIds } },
    select: { id: true, organizationId: true },
  });
  if (!widgets.length) redirect("/widgets?flash=Widgets+not+found&tone=error");

  // All widgets must belong to the same org (they always will from the UI)
  const orgId = widgets[0].organizationId;
  await requireOrganizationAccess(orgId);

  // Only delete widgets that actually belong to this org
  const ownedIds = widgets
    .filter((w) => w.organizationId === orgId)
    .map((w) => w.id);

  await prisma.reviewWidget.deleteMany({ where: { id: { in: ownedIds } } });

  const count = ownedIds.length;
  redirect(`/widgets?flash=${count}+widget${count === 1 ? "" : "s"}+deleted&tone=success`);
}

export async function bulkToggleWidgetsActive(formData: FormData) {
  "use server";
  const raw = String(formData.get("widgetIds") ?? "").trim();
  const widgetIds = raw.split(",").map((s) => s.trim()).filter(Boolean);
  const targetActive = formData.get("isActive") === "true";
  if (!widgetIds.length) redirect("/widgets?flash=No+widgets+selected&tone=error");

  const widgets = await prisma.reviewWidget.findMany({
    where: { id: { in: widgetIds } },
    select: { id: true, organizationId: true },
  });
  if (!widgets.length) redirect("/widgets?flash=Widgets+not+found&tone=error");

  const orgId = widgets[0].organizationId;
  await requireOrganizationAccess(orgId);

  const ownedIds = widgets
    .filter((w) => w.organizationId === orgId)
    .map((w) => w.id);

  await prisma.reviewWidget.updateMany({
    where: { id: { in: ownedIds } },
    data: { isActive: targetActive },
  });

  const count = ownedIds.length;
  const label = targetActive ? "activated" : "deactivated";
  redirect(`/widgets?flash=${count}+widget${count === 1 ? "" : "s"}+${label}&tone=success`);
}

export async function duplicateReviewWidget(formData: FormData) {
  const widgetId = String(formData.get("widgetId") ?? "").trim();
  if (!widgetId) throw new Error("Widget is required");

  const existing = await prisma.reviewWidget.findUnique({ where: { id: widgetId } });
  if (!existing) throw new Error("Widget not found");

  await requireOrganizationAccess(existing.organizationId);

  // Clone every field except identity/token/timestamps.
  const {
    id: _id,
    publicToken: _publicToken,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    name,
    ...rest
  } = existing;

  const copy = await prisma.reviewWidget.create({
    data: {
      ...rest,
      name: `${name} copy`,
      publicToken: generateReviewWidgetToken(),
    },
  });

  redirect(`/widgets/${copy.id}?flash=Widget+duplicated&tone=success`);
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

/**
 * Navigate the studio editor to the equivalent widget for a different location.
 * If a widget of the same type already exists for the target location, returns
 * its ID. Otherwise clones the source widget's settings into a new widget for
 * that location (preserving all appearance/display preferences) and returns the
 * new ID. This ensures each location always has its own independent widget with
 * its own embed code.
 */
export async function getOrCreateWidgetForLocation(
  sourceWidgetId: string,
  targetLocationId: string,
): Promise<{ widgetId: string }> {
  const source = await prisma.reviewWidget.findUnique({ where: { id: sourceWidgetId } });
  if (!source) throw new Error("Source widget not found");

  await requireOrganizationAccess(source.organizationId);

  // Verify the target location belongs to the same org.
  const targetLocation = await prisma.location.findFirst({
    where: { id: targetLocationId, organizationId: source.organizationId },
    select: { id: true },
  });
  if (!targetLocation) throw new Error("Location not found for this organization");

  // Look for an existing widget of the same type for the target location.
  const existing = await prisma.reviewWidget.findFirst({
    where: {
      organizationId: source.organizationId,
      locationId: targetLocationId,
      widgetType: source.widgetType,
      layout: source.layout,
    },
    select: { id: true },
    orderBy: { createdAt: "desc" },
  });

  if (existing) {
    return { widgetId: existing.id };
  }

  // No existing widget — clone source settings into a new widget for the target location.
  const {
    id: _id,
    publicToken: _publicToken,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    locationId: _locationId,
    name,
    ...rest
  } = source;

  const newWidget = await prisma.reviewWidget.create({
    data: {
      ...rest,
      locationId: targetLocationId,
      name,
      publicToken: generateReviewWidgetToken(),
      // Reset single-testimonial pins — they belong to the source location's reviews.
      singleTestimonialReviewId: null,
      singleTestimonialVideoId: null,
    },
  });

  return { widgetId: newWidget.id };
}

export async function generateWidgetAiSummary(formData: FormData): Promise<void> {
  const widgetId = String(formData.get("widgetId") ?? "").trim();
  if (!widgetId) throw new Error("Widget ID required");

  const widget = await prisma.reviewWidget.findUnique({
    where: { id: widgetId },
    select: { id: true, organizationId: true, locationId: true },
  });
  if (!widget) throw new Error("Widget not found");

  await requireOrganizationAccess(widget.organizationId);

  if (!process.env.GEMINI_API_KEY) {
    throw new Error("AI summary not configured — set GEMINI_API_KEY");
  }

  const reviews = await prisma.review.findMany({
    where: {
      locationId: widget.locationId,
      OR: [
        { source: ReviewSource.GOOGLE, status: ReviewStatus.PUBLISHED },
        { source: ReviewSource.FACEBOOK, status: ReviewStatus.PUBLISHED },
      ],
      body: { not: "" },
    },
    orderBy: [{ reviewedAt: "desc" }, { createdAt: "desc" }],
    take: 50,
    select: { rating: true, body: true },
  });

  const nonEmpty = reviews.filter((r) => r.body.trim().length > 0);
  if (nonEmpty.length < 3) {
    throw new Error("Not enough reviews to summarize (need at least 3)");
  }

  const result = await generateAiReviewSummary(nonEmpty.map((r) => ({ ...r, rating: r.rating ?? 0 })));

  await prisma.locationPublicProfile.upsert({
    where: { locationId: widget.locationId },
    update: {
      aiReviewSummary: result.summary,
      aiReviewSummaryAt: new Date(),
      aiReviewSummaryReviewCount: nonEmpty.length,
      reviewHighlights: result.highlights,
    },
    create: {
      locationId: widget.locationId,
      aiReviewSummary: result.summary,
      aiReviewSummaryAt: new Date(),
      aiReviewSummaryReviewCount: nonEmpty.length,
      reviewHighlights: result.highlights,
    },
  });

  revalidatePath(`/widgets/${widgetId}`);
}
