export const dynamic = "force-dynamic";

import { AppShell } from "@/components/app-shell";
import { FunnelPreviewSimulator } from "@/components/funnel-preview-simulator";
import { getFunnelPreviewData } from "@/lib/funnels";

export default async function FunnelPreviewPage({
  searchParams,
}: {
  searchParams?: Promise<{ location?: string }>;
}) {
  const params = await searchParams;
  const data = await getFunnelPreviewData(params?.location);

  if (!data.selectedLocation) {
    return (
      <AppShell activeScreen="funnel-preview">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-slate-900">No locations found.</p>
          <p className="mt-2 text-sm text-slate-600">Seed the database to load a starter review funnel preview.</p>
        </div>
      </AppShell>
    );
  }

  const { locations, selectedLocation, profile, previewSteps } = data;

  return (
    <AppShell activeScreen="funnel-preview">
      <div className="space-y-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">Funnel Preview</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Test the live review flow before launch</h2>
          <p className="mt-3 max-w-3xl text-slate-600">
            This page is now a simulator. Choose a location, click a rating, and verify the promoter versus detractor path before customers see it.
          </p>
        </div>

        <FunnelPreviewSimulator
          locations={locations.map((location) => ({
            id: location.id,
            name: location.name,
            slug: location.slug,
            city: location.city,
            state: location.state,
            reviewLink: location.reviewLink,
          }))}
          selectedLocation={{
            id: selectedLocation.id,
            name: selectedLocation.name,
            slug: selectedLocation.slug,
            city: selectedLocation.city,
            state: selectedLocation.state,
            reviewLink: selectedLocation.reviewLink,
          }}
          profile={
            profile
              ? {
                  headline: profile.headline,
                  subheadline: profile.subheadline,
                  ctaLabel: profile.ctaLabel,
                  ctaUrl: profile.ctaUrl,
                  bookingUrl: profile.bookingUrl,
                  theme: profile.theme,
                  funnelRatingStyle: profile.funnelRatingStyle,
                  funnelPromptTitle: profile.funnelPromptTitle,
                  funnelPromptBody: profile.funnelPromptBody,
                  funnelPrivateTitle: profile.funnelPrivateTitle,
                  funnelPrivateBody: profile.funnelPrivateBody,
                  funnelPrivateSubmitLabel: profile.funnelPrivateSubmitLabel,
                  funnelThanksPublicTitle: profile.funnelThanksPublicTitle,
                  funnelThanksPublicBody: profile.funnelThanksPublicBody,
                  funnelThanksPrivateTitle: profile.funnelThanksPrivateTitle,
                  funnelThanksPrivateBody: profile.funnelThanksPrivateBody,
                  funnelReviewButtonLabel: profile.funnelReviewButtonLabel,
                }
              : null
          }
          previewSteps={previewSteps}
        />
      </div>
    </AppShell>
  );
}
