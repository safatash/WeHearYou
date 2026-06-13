export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { getRecipientByToken } from "@/lib/funnel";
import { getRatingOptions, normalizeRatingMode } from "@/lib/rating-styles";
import { TokenRatingForm } from "./token-rating-form";

export default async function ReviewLandingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const recipient = await getRecipientByToken(token);

  if (!recipient) {
    notFound();
  }

  const location = recipient.campaign.location;
  const profile = location.publicProfile;

  const ratingMode = normalizeRatingMode(profile?.funnelRatingStyle);
  const ratingOptions = getRatingOptions(ratingMode);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-3xl rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_16px_50px_rgba(15,23,42,0.08)] sm:p-10">
        {profile?.logoUrl ? (
          <img src={profile.logoUrl} alt={`${location.name} logo`} className="mb-6 h-14 w-auto rounded-xl object-contain" />
        ) : null}
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">WeHearYou Review Funnel</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
          {profile?.funnelPromptTitle ?? `How was your experience with ${location.name}?`}
        </h1>
        <p className="mt-4 text-base leading-7 text-slate-600">
          {profile?.funnelPromptBody ?? "Share a quick rating below."}
        </p>
        <TokenRatingForm
          token={token}
          ratingMode={ratingMode}
          ratingOptions={ratingOptions}
        />
      </div>
    </main>
  );
}
