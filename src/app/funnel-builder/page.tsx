export const dynamic = "force-dynamic";

import { AppShell } from "@/components/app-shell";
import { FunnelBuilderForm } from "@/components/funnel-builder-form";
import { getFunnelBuilderData } from "@/lib/funnels";
import { requireActiveMembershipPage } from "@/lib/page-guards";
import { getAccessibleLocationIds } from "@/lib/scope";

export default async function FunnelBuilderPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const selectedLocationParam = typeof params?.location === "string" ? params.location : undefined;
  const flash = typeof params?.flash === "string" ? params.flash : null;
  const tone = typeof params?.tone === "string" && ["success", "error", "info"].includes(params.tone) ? params.tone as "success" | "error" | "info" : "success";
  const membership = await requireActiveMembershipPage();
  const locationIds = getAccessibleLocationIds(membership);
  const data = await getFunnelBuilderData(locationIds, selectedLocationParam);

  if (!data.selectedLocation) {
    return (
      <AppShell activeScreen="funnel-builder">
        <div style={{ maxWidth: 1240, margin: "0 auto", padding: "var(--gutter)" }}>
          <div className="card" style={{ padding: "var(--card-pad)" }}>
            <p style={{ fontSize: 14, fontWeight: 640, color: "var(--ink-900)" }}>No locations found.</p>
            <p style={{ marginTop: 6, fontSize: 13.5, color: "var(--ink-500)" }}>Add a business location to start configuring this account&apos;s review funnel.</p>
          </div>
        </div>
      </AppShell>
    );
  }

  const { locations, selectedLocation, profile } = data;

  return (
    <AppShell
      activeScreen="funnel-builder"
      flash={flash ? { message: flash, tone } : null}
      selectedLocationId={selectedLocation.id}
    >
      <FunnelBuilderForm
        locations={locations.map((location) => ({
          id: location.id,
          name: location.name,
          city: location.city,
          state: location.state,
          slug: location.slug,
        }))}
        selectedLocation={{
          id: selectedLocation.id,
          name: selectedLocation.name,
          slug: selectedLocation.slug,
          reviewLink: selectedLocation.reviewLink,
        }}
        defaultValues={{
          funnelRatingStyle: profile?.funnelRatingStyle ?? "stars",
          funnelPromptTitle: profile?.funnelPromptTitle ?? `How was your experience with ${selectedLocation.name}?`,
          funnelPromptBody: profile?.funnelPromptBody ?? `Happy customers can continue to a public review, while lower ratings stay private so our team can follow up directly.`,
          funnelPrivateTitle: profile?.funnelPrivateTitle ?? `Tell ${selectedLocation.name} how they can improve`,
          funnelPrivateBody: profile?.funnelPrivateBody ?? "Thanks for the honest rating. Your feedback stays private and goes directly to the team for follow-up.",
          funnelPrivateSubmitLabel: profile?.funnelPrivateSubmitLabel ?? "Send private feedback",
          funnelThanksPublicTitle: profile?.funnelThanksPublicTitle ?? `Thanks for rating ${selectedLocation.name}`,
          funnelThanksPublicBody: profile?.funnelThanksPublicBody ?? "One final step — post your review publicly if you'd like to help other customers discover this business.",
          funnelThanksPrivateTitle: profile?.funnelThanksPrivateTitle ?? "Thanks for sharing your feedback",
          funnelThanksPrivateBody: profile?.funnelThanksPrivateBody ?? "Your feedback has been sent privately to the team.",
          funnelReviewButtonLabel: profile?.funnelReviewButtonLabel ?? "Leave a Google review",
        }}
      />
    </AppShell>
  );
}
