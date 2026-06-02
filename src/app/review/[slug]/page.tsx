export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { buildGoogleWriteReviewLink } from "@/lib/locations";
import { ReviewLinkBeacon } from "./review-link-beacon";

export default async function ReviewLinkPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const query = await searchParams;

  const location = await prisma.location.findFirst({
    where: { slug },
    select: {
      id: true,
      name: true,
      reviewLink: true,
      googlePlaceId: true,
    },
  });

  if (!location) notFound();

  const src = typeof query.src === "string" ? query.src : null;
  const medium = typeof query.medium === "string" ? query.medium : null;
  const placement = typeof query.placement === "string" ? query.placement : null;

  const googleUrl =
    location.reviewLink ?? buildGoogleWriteReviewLink(location.googlePlaceId);

  const happyHref = googleUrl
    ? `/review/${slug}/google?${new URLSearchParams({
        ...(src ? { src } : {}),
        ...(medium ? { medium } : {}),
        placement: "happy_card",
      }).toString()}`
    : null;

  const unhappyHref = `/review/${slug}/feedback?${new URLSearchParams({
    ...(src ? { src } : {}),
    ...(medium ? { medium } : {}),
    placement: "unhappy_card",
  }).toString()}`;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <ReviewLinkBeacon slug={slug} src={src} medium={medium} placement={placement} />

      <div className="mx-auto w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-8 shadow-lg text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600 mb-3">
          {location.name}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
          Would you recommend {location.name}?
        </h1>
        <p className="mt-2 text-sm text-slate-500">Your feedback helps us improve.</p>

        <div className="mt-8 flex gap-4">
          {happyHref ? (
            <a
              href={happyHref}
              className="flex flex-1 flex-col items-center rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-6 text-center transition hover:border-emerald-300 hover:bg-emerald-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              aria-label="Yes, I had a great experience — leave a public review"
            >
              <span aria-hidden="true" className="text-4xl">👍</span>
              <span className="mt-3 font-semibold text-emerald-800">Yes, I had a great experience</span>
              <span className="mt-1 text-xs text-emerald-700">Leave a public review</span>
            </a>
          ) : (
            <div
              className="flex flex-1 flex-col items-center rounded-2xl border-2 border-slate-200 bg-slate-50 p-6 text-center opacity-60 cursor-not-allowed"
              aria-label="Google review link is not yet configured"
              aria-disabled="true"
            >
              <span aria-hidden="true" className="text-4xl">👍</span>
              <span className="mt-3 font-semibold text-slate-500">Great experience</span>
              <span className="mt-1 text-xs text-slate-400">Google review link is not yet configured — please contact us.</span>
            </div>
          )}

          <a
            href={unhappyHref}
            className="flex flex-1 flex-col items-center rounded-2xl border-2 border-orange-200 bg-orange-50 p-6 text-center transition hover:border-orange-300 hover:bg-orange-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
            aria-label="Not quite — share private feedback"
          >
            <span aria-hidden="true" className="text-4xl">👎</span>
            <span className="mt-3 font-semibold text-orange-800">Not quite</span>
            <span className="mt-1 text-xs text-orange-700">Share private feedback</span>
          </a>
        </div>
      </div>
    </main>
  );
}
