export const dynamic = "force-dynamic";

import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { FormSubmitButton } from "@/components/form-submit-button";
import { WidgetCustomizer } from "@/components/widget-customizer";
import { WidgetStudioEditor, type StudioWidget } from "@/app/widgets/widget-studio-editor";
import { getPublicReviewWidgetPayload, getReviewWidgetById, getWidgetPickerData, getWidgetEligibleLocations } from "@/lib/review-widgets";
import { deleteReviewWidget } from "@/app/widgets/actions";

// Simple text widgets get the mock-style Studio; floating/collecting/video
// widgets keep the detailed customizer so their advanced config isn't lost.
function isSimpleWidget(w: { widgetType: string | null; contentType: string; layout: string }): boolean {
  // Advanced video/mixed layouts that only the detailed customizer can configure.
  const advancedLayouts = new Set(["featured-video", "video-wall", "tabbed", "featured-video-reviews"]);
  if (advancedLayouts.has(w.layout)) return false;
  return true;
}

export default async function WidgetDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const query = (await searchParams) ?? {};
  const widget = await getReviewWidgetById(id);

  if (!widget) {
    notFound();
  }

  const flash = typeof query.flash === "string" ? query.flash : null;
  const tone =
    typeof query.tone === "string" && ["success", "error", "info"].includes(query.tone)
      ? (query.tone as "success" | "error" | "info")
      : "success";
  const hdrs = await headers();
  // Strip any newline/carriage-return characters that Vercel can inject into
  // forwarded headers — these would break the embed code URL.
  const host = (hdrs.get("host") ?? "").replace(/[\r\n]/g, "");
  const proto = (hdrs.get("x-forwarded-proto") ?? "https").replace(/[\r\n]/g, "").split(",")[0].trim();
  // Prefer NEXT_PUBLIC_APP_URL so embed codes always reference the production
  // URL even when the customizer is opened in a local dev environment.
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    (host ? `${proto}://${host}` : "");
  const embedScriptUrl = `${appUrl}/embed/widget.js`;
  const localTestUrl = `/widgets/${widget.id}/test`;

  // Simple text widgets → mock-style Studio editor.
  if (isSimpleWidget(widget)) {
    const eligibleLocations = await getWidgetEligibleLocations(widget.organizationId);
    const locationOptions = eligibleLocations.map((l) => ({ id: l.id, name: l.name }));
    if (!locationOptions.some((l) => l.id === widget.locationId)) {
      locationOptions.unshift({ id: widget.locationId, name: widget.location.name });
    }
    const studioWidget: StudioWidget = {
      id: widget.id,
      publicToken: widget.publicToken,
      name: widget.name,
      organizationId: widget.organizationId,
      locationId: widget.locationId,
      layout: widget.layout,
      contentType: widget.contentType,
      widgetType: widget.widgetType ?? null,
      theme: widget.theme,
      minRating: widget.minRating,
      pageSize: widget.pageSize,
      isActive: widget.isActive,
      showHeader: widget.showHeader,
      showRating: widget.showRating,
      showReviewerName: widget.showReviewerName,
      showDate: widget.showDate,
      showWriteReview: widget.showWriteReview,
      showSourceLogo: widget.showSourceLogo,
      primaryColor: widget.primaryColor,
      starColor: widget.starColor,
      showAiSummary: widget.showAiSummary,
      marqueeSpeed: widget.marqueeSpeed,
      badgeStyle: widget.badgeStyle ?? null,
      collectButtonPosition: widget.collectButtonPosition ?? null,
      collectButtonTheme: widget.collectButtonTheme ?? null,
      collectButtonColor: widget.collectButtonColor ?? null,
      collectMobileBehavior: widget.collectMobileBehavior ?? null,
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
      sort: widget.sort,
      headerAlign: widget.headerAlign,
      bodyMaxChars: widget.bodyMaxChars,
      backgroundColor: widget.backgroundColor,
      textColor: widget.textColor,
      fontFamily: widget.fontFamily,
      starColorMode: widget.starColorMode,
      cornerRadius: widget.cornerRadius,
      cardStyle: widget.cardStyle,
      density: widget.density,
      gridColumns: widget.gridColumns,
      wallStyle: widget.wallStyle,
      cardHeights: widget.cardHeights,
      enabledSources: widget.enabledSources,
      // Spotlight & Pins
      spotlightReviewId: (widget as { spotlightReviewId?: string | null }).spotlightReviewId ?? null,
      pinnedReviewIds: (widget as { pinnedReviewIds?: string }).pinnedReviewIds ?? "",
      reviewHighlights: (widget as { reviewHighlights?: string }).reviewHighlights ?? "",
      showAvgRating: widget.showAvgRating,
      showReviewCount: widget.showReviewCount,
      showResponses: widget.showResponses,
      showNav: widget.showNav,
      showPagination: widget.showPagination,
      showBranding: widget.showBranding,
      fontSizeBase: widget.fontSizeBase,
      fontSizeNames: widget.fontSizeNames,
      fontSizeHeader: widget.fontSizeHeader,
      fontSizeLabel: widget.fontSizeLabel,
      fontSizeSummary: widget.fontSizeSummary,
    };
    const profile = widget.location.publicProfile;
    const aiSummaryText = profile?.showAiReviewSummary ? (profile.aiReviewSummary ?? null) : null;
    const aiSummaryCount = profile?.showAiReviewSummary ? (profile.aiReviewSummaryReviewCount ?? null) : null;
    // Fetch available reviews for the Spotlight & Pins picker
    const pickerData = await getWidgetPickerData(widget.locationId);
    const availableReviews = pickerData.reviews.map((r) => ({
      id: r.id,
      reviewerName: r.reviewerName,
      reviewerPhotoUrl: r.reviewerPhotoUrl,
      rating: r.rating,
      body: r.body,
      reviewedAt: r.reviewedAt,
      source: r.source,
    }));
    return (
      <AppShell activeScreen="widgets" flash={flash ? { message: flash, tone } : null}>
        <WidgetStudioEditor widget={studioWidget} embedScriptUrl={embedScriptUrl} locations={locationOptions} aiSummaryText={aiSummaryText} aiSummaryCount={aiSummaryCount} availableReviews={availableReviews} />
      </AppShell>
    );
  }

  const [preview, pickerData] = await Promise.all([
    getPublicReviewWidgetPayload(widget.publicToken, 1),
    getWidgetPickerData(widget.locationId),
  ]);

  return (
    <AppShell activeScreen="widgets" flash={flash ? { message: flash, tone } : null}>
      <div className="space-y-8">
        {/* Header */}
        <div className="border-b border-slate-200 pb-6">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">Widget Customizer</p>
          <div className="mt-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm text-slate-600 font-medium">Customizing</p>
              <h2 className="mt-1 text-4xl font-bold tracking-tight text-slate-950">{widget.location.name}</h2>
              <p className="mt-3 text-base text-slate-600">
                <span className="font-medium text-slate-900">{widget.name}</span> widget
              </p>
            </div>
            <div className="flex items-center gap-4 flex-shrink-0">
              <form action={deleteReviewWidget}>
                <input type="hidden" name="widgetId" value={widget.id} />
                <FormSubmitButton
                  idleLabel="Delete widget"
                  pendingLabel="Deleting…"
                  className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 hover:border-rose-300 hover:bg-rose-100"
                />
              </form>
              <div>
                <div className={`flex items-center justify-center rounded-full p-3 ${widget.health.status === "healthy" ? "bg-emerald-100" : "bg-amber-100"}`}>
                  <span className="text-2xl">{widget.health.status === "healthy" ? "✓" : "⚠"}</span>
                </div>
                <p className="mt-2 text-xs font-semibold text-center uppercase tracking-wide text-slate-600">
                  {widget.health.status.replace("_", " ")}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Customizer Component */}
        <WidgetCustomizer
          widget={widget}
          preview={preview}
          embedScriptUrl={embedScriptUrl}
          localTestUrl={localTestUrl}
          availableReviews={pickerData.reviews}
          availableVideos={pickerData.videos}
        />
      </div>
    </AppShell>
  );
}
