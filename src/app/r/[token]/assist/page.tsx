export const dynamic = "force-dynamic";

import { notFound, redirect } from "next/navigation";
import { getRecipientByToken } from "@/lib/funnel";
import { buildGoogleWriteReviewLink } from "@/lib/locations";
import { buildSuggestedChips } from "@/lib/review-assistant-chips";
import { ReviewAssistantClient, type AssistDestination } from "./review-assistant-client";

export default async function ReviewAssistPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { token } = await params;
  const query = await searchParams;
  const recipient = await getRecipientByToken(token);
  if (!recipient) notFound();

  const location = recipient.campaign.location;
  const profile = location.publicProfile;

  // If the assistant isn't enabled, fall back to the standard thank-you path.
  if (!profile?.aiAssistantEnabled) {
    redirect(`/r/${token}/thanks`);
  }

  const rating = Number(query.rating) || 5;

  const chips = buildSuggestedChips({
    businessType: profile.businessType,
    services: profile.services,
    reviewHighlights: profile.reviewHighlights,
    customChips: profile.aiAssistantCustomChips,
    useReviewThemes: profile.aiAssistantUseReviewThemes,
  });

  const googleUrl = location.reviewLink || buildGoogleWriteReviewLink(location.googlePlaceId);
  const destinations: AssistDestination[] = [
    { key: "GOOGLE", label: "Google", url: googleUrl },
    { key: "YELP", label: "Yelp", url: location.yelpBusinessUrl ?? null },
    { key: "FACEBOOK", label: "Facebook", url: profile.facebookReviewUrl ?? null },
    { key: "TRUSTPILOT", label: "Trustpilot", url: profile.trustpilotReviewUrl ?? null },
  ].filter((d) => Boolean(d.url)) as AssistDestination[];

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-3xl rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_16px_50px_rgba(15,23,42,0.08)] sm:p-10">
        {profile.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.logoUrl} alt={`${location.name} logo`} className="mb-6 h-12 w-auto rounded-xl object-contain" />
        ) : null}
        <ReviewAssistantClient
          token={token}
          locationId={location.id}
          rating={rating}
          businessName={location.name}
          chips={chips}
          services={profile.services ?? []}
          destinations={destinations}
          wehearyouEnabled={profile.wehearyouReviewsEnabled !== false}
          allowTone={profile.aiAssistantAllowTone !== false}
          allowLength={profile.aiAssistantAllowLength !== false}
          allowRegenerate={profile.aiAssistantAllowRegenerate !== false}
          allowNotes={profile.aiAssistantAllowNotes !== false}
        />
      </div>
    </main>
  );
}
