export const dynamic = "force-dynamic";

import { AppShell } from "@/components/app-shell";
import { requireActiveMembershipPage } from "@/lib/page-guards";
import { getOrganizationReviewWidgets } from "@/lib/review-widgets";
import { WidgetsIndex, type IndexWidget } from "@/app/widgets/widgets-index";

export default async function WidgetsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const membership = await requireActiveMembershipPage();
  const query = (await searchParams) ?? {};
  const flashMessage = typeof query.flash === "string" ? query.flash : null;
  const flashTone =
    typeof query.tone === "string" && ["success", "error", "info"].includes(query.tone)
      ? (query.tone as "success" | "error" | "info")
      : "success";
  const selectedLocationId = typeof query.location === "string" ? query.location : null;

  const widgets = await getOrganizationReviewWidgets(membership.organization.id);

  // Filter widgets by selected location if specified
  const filteredWidgets = selectedLocationId
    ? widgets.filter(w => w.locationId === selectedLocationId)
    : widgets;

  const indexWidgets: IndexWidget[] = filteredWidgets.map((w) => ({
    id: w.id,
    name: w.name,
    layout: w.layout,
    theme: w.theme,
    widgetType: w.widgetType ?? null,
    contentType: w.contentType,
    primaryColor: w.primaryColor ?? null,
    minRating: w.minRating,
    pageSize: w.pageSize,
    showHeader: w.showHeader,
    showDate: w.showDate,
    showReviewerName: w.showReviewerName,
    showSourceLogo: w.showSourceLogo,
    isActive: w.isActive,
    reviewCount: w.health.reviewCount,
    updatedAt: w.updatedAt.toISOString(),
    locationName: w.location.name,
  }));

  return (
    <AppShell activeScreen="widgets" flash={flashMessage ? { message: flashMessage, tone: flashTone } : null} selectedLocationId={selectedLocationId ?? undefined}>
      <WidgetsIndex widgets={indexWidgets} />
    </AppShell>
  );
}
