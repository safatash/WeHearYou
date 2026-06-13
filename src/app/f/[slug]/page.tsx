export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { buildGoogleWriteReviewLink } from "@/lib/locations";
import { getRatingOptions, normalizeRatingMode } from "@/lib/rating-styles";
import { submitPublicFunnelRating } from "./actions";
import { FunnelRatingForm } from "./funnel-rating-form";

export default async function PublicFunnelPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const query = (await searchParams) ?? {};
  const isEmbed = typeof query.embed === "string" && query.embed === "1";
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
  const ratingMode = normalizeRatingMode(profile?.funnelRatingStyle);
  const ratingOptions = getRatingOptions(ratingMode);

  return (
    <main className={isEmbed ? "bg-white p-5 text-slate-900" : "min-h-screen bg-slate-50 px-4 py-10 text-slate-900 sm:px-6"}>
      <div className={isEmbed ? "" : "mx-auto max-w-3xl rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_16px_50px_rgba(15,23,42,0.08)] sm:p-10"}>
        {profile?.logoUrl && !isEmbed ? <img src={profile.logoUrl} alt={`${location.name} logo`} className="mb-6 h-14 w-auto rounded-xl object-contain" /> : null}
        {!isEmbed && <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">WeHearYou Review Funnel</p>}
        <h1 className={`${isEmbed ? "text-2xl" : "mt-3 text-4xl"} font-semibold tracking-tight text-slate-950`}>
          {profile?.funnelPromptTitle ?? profile?.headline ?? `How was your experience with ${location.name}?`}
        </h1>
        <p className="mt-3 text-base leading-7 text-slate-600">
          {profile?.funnelPromptBody ?? profile?.subheadline ?? `Share a quick rating for ${location.name}. Happy customers can continue to a public review, while lower ratings stay private so the team can follow up directly.`}
        </p>

        <FunnelRatingForm
          slug={slug}
          submitAction={submitPublicFunnelRating}
          reviewLink={location.reviewLink ?? buildGoogleWriteReviewLink(location.googlePlaceId)}
          filterEnabled={profile?.negativeFilterEnabled ?? false}
          filterThreshold={profile?.negativeFilterThreshold ?? 4}
          lowRatingDestination={profile?.lowRatingDestination ?? "PRIVATE"}
          ratingMode={ratingMode}
          ratingOptions={ratingOptions}
          embed={isEmbed}
        />
      </div>
    </main>
  );
}
