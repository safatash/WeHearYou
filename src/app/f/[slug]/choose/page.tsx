export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { buildGoogleWriteReviewLink } from "@/lib/locations";
import {
  resolveHighRating,
  destinationExternalUrl,
  destinationLabel,
  type HighRatingDestination,
} from "@/lib/review-routing";

function trimOrNull(value: string | null | undefined) {
  const v = (value ?? "").trim();
  return v.length > 0 ? v : null;
}

export default async function PublicFunnelChoosePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const query = (await searchParams) ?? {};
  const rating = Number(typeof query.rating === "string" ? query.rating : "0");
  const isEmbed = typeof query.embed === "string" && query.embed === "1";
  const embedSuffix = isEmbed ? "&embed=1" : "";

  const location = await prisma.location.findFirst({
    where: { slug },
    include: { publicProfile: true },
  });
  if (!location) notFound();

  const profile = location.publicProfile;
  const resolution = resolveHighRating(
    profile?.highRatingMode,
    profile?.highRatingDestinations,
    profile?.highRatingPrimaryDestination,
  );

  // If this isn't actually a multi-destination config, fall back to the funnel.
  if (resolution.kind !== "choice") {
    notFound();
  }

  const ctx = {
    googleReviewLink: location.reviewLink ?? buildGoogleWriteReviewLink(location.googlePlaceId),
    facebookReviewUrl: trimOrNull(profile?.facebookReviewUrl),
    customReviewUrl: trimOrNull(profile?.customReviewUrl),
  };

  // Build the list of usable options (primary first), skipping external
  // destinations with no configured URL.
  const options = resolution.destinations
    .map((destination: HighRatingDestination) => {
      if (destination === "WEHEARYOU") {
        return { destination, label: "Leave a review here", href: `/f/${slug}/review?rating=${rating}${embedSuffix}`, internal: true };
      }
      const url = destinationExternalUrl(destination, ctx);
      if (!url) return null;
      return { destination, label: `Review on ${destinationLabel(destination)}`, href: url, internal: false };
    })
    .filter((o): o is { destination: HighRatingDestination; label: string; href: string; internal: boolean } => o !== null);

  if (options.length === 0) notFound();

  return (
    <main className={isEmbed ? "bg-white p-5 text-slate-900" : "min-h-screen bg-slate-50 px-4 py-10 text-slate-900 sm:px-6"}>
      <div className={isEmbed ? "" : "mx-auto max-w-3xl rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_16px_50px_rgba(15,23,42,0.08)] sm:p-10"}>
        {profile?.logoUrl && !isEmbed ? <img src={profile.logoUrl} alt={`${location.name} logo`} className="mb-6 h-14 w-auto rounded-xl object-contain" /> : null}
        {!isEmbed && <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">Thank You</p>}
        <h1 className={`${isEmbed ? "text-2xl" : "mt-3 text-4xl"} font-semibold tracking-tight text-slate-950`}>
          Where would you like to leave your review?
        </h1>
        <p className="mt-3 text-base leading-7 text-slate-600">
          Thanks for the great rating! Pick where you&apos;d like to share your experience with {location.name}.
        </p>

        <div className="mt-6 space-y-3">
          {options.map((opt, i) => {
            const isPrimary = i === 0;
            return (
              <Link
                key={opt.destination}
                href={opt.href}
                target={!opt.internal && isEmbed ? "_blank" : undefined}
                rel={!opt.internal && isEmbed ? "noopener noreferrer" : undefined}
                className={`flex items-center justify-between rounded-2xl border px-5 py-4 text-sm font-semibold shadow-sm transition ${
                  isPrimary
                    ? "border-slate-950 bg-slate-950 !text-white visited:!text-white hover:!text-white"
                    : "border-slate-200 bg-white text-slate-800 hover:border-slate-300"
                }`}
              >
                <span>{opt.label}</span>
                <span aria-hidden>→</span>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}
