export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { getRecipientByToken } from "@/lib/funnel";
import { TokenRatingForm } from "./token-rating-form";

const liveRatingModes = {
  stars: [
    { value: 1, label: "1 star", shortLabel: "1", icon: "★" },
    { value: 2, label: "2 stars", shortLabel: "2", icon: "★" },
    { value: 3, label: "3 stars", shortLabel: "3", icon: "★" },
    { value: 4, label: "4 stars", shortLabel: "4", icon: "★" },
    { value: 5, label: "5 stars", shortLabel: "5", icon: "★" },
  ],
  faces: [
    { value: 1, label: "Very unhappy", shortLabel: "Sad", icon: "😞" },
    { value: 3, label: "Neutral", shortLabel: "Okay", icon: "😐" },
    { value: 5, label: "Very happy", shortLabel: "Happy", icon: "😊" },
  ],
  thumbs: [
    { value: 1, label: "Thumbs down", shortLabel: "Needs work", icon: "👎" },
    { value: 5, label: "Thumbs up", shortLabel: "Loved it", icon: "👍" },
  ],
} as const;

export default async function ReviewLandingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const recipient = await getRecipientByToken(token);

  if (!recipient) {
    notFound();
  }

  const location = recipient.campaign.location;
  const profile = location.publicProfile;

  const ratingMode = (profile?.funnelRatingStyle && profile.funnelRatingStyle in liveRatingModes
    ? profile.funnelRatingStyle
    : "stars") as keyof typeof liveRatingModes;
  const ratingOptions = liveRatingModes[ratingMode];

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
