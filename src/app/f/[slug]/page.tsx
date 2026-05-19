export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { submitPublicFunnelRating } from "./actions";

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

export default async function PublicFunnelPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const location = await prisma.location.findFirst({
    where: { slug },
    include: {
      publicProfile: true,
    },
  });

  if (!location) {
    notFound();
  }

  const profile = location.publicProfile;
  const ratingMode = (profile?.funnelRatingStyle && profile.funnelRatingStyle in liveRatingModes
    ? profile.funnelRatingStyle
    : "stars") as keyof typeof liveRatingModes;
  const ratingOptions = liveRatingModes[ratingMode];

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-3xl rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_16px_50px_rgba(15,23,42,0.08)] sm:p-10">
        {profile?.logoUrl ? <img src={profile.logoUrl} alt={`${location.name} logo`} className="mb-6 h-14 w-auto rounded-xl object-contain" /> : null}
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">WeHearYou Review Funnel</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">{profile?.funnelPromptTitle ?? profile?.headline ?? `How was your experience with ${location.name}?`}</h1>
        <p className="mt-4 text-base leading-7 text-slate-600">
          {profile?.funnelPromptBody ?? profile?.subheadline ?? `Share a quick rating for ${location.name}. Happy customers can continue to a public review, while lower ratings stay private so the team can follow up directly.`}
        </p>

        <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6">
          <p className="text-sm font-semibold text-slate-700">Choose a rating</p>
          <form action={submitPublicFunnelRating} className={`mt-4 grid gap-3 ${ratingMode === "stars" ? "sm:grid-cols-5" : ratingMode === "faces" ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
            <input type="hidden" name="slug" value={slug} />
            {ratingOptions.map((option) => (
              <button
                key={`${ratingMode}-${option.value}`}
                type="submit"
                name="rating"
                value={option.value}
                className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-5 text-center transition hover:border-indigo-300 hover:bg-indigo-50"
              >
                <div className={`text-2xl ${ratingMode === "stars" ? "text-amber-400" : ""}`}>{ratingMode === "stars" ? option.icon.repeat(option.value) : option.icon}</div>
                <div className="mt-2 text-sm font-semibold text-slate-700">{option.label}</div>
                <div className="mt-1 text-xs text-slate-500">{option.value >= 4 ? "Public option" : "Private"}</div>
              </button>
            ))}
          </form>
        </div>
      </div>
    </main>
  );
}
