export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { getRecipientByToken } from "@/lib/funnel";
import { buildGoogleWriteReviewLink } from "@/lib/locations";

export default async function ReviewThanksPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { token } = await params;
  const query = await searchParams;
  const rating = Number(typeof query.rating === "string" ? query.rating : "0");
  const mode = typeof query.mode === "string" ? query.mode : "public";
  const recipient = await getRecipientByToken(token);

  if (!recipient) {
    notFound();
  }

  const reviewLink = recipient.campaign.location.reviewLink ?? buildGoogleWriteReviewLink(recipient.campaign.location.googlePlaceId);
  // First-party WeHearYou review captured — thank the customer, do NOT push to Google.
  const isWeHearYouReview = mode === "why-public";
  const isPrivate = !isWeHearYouReview && (mode === "private" || rating < 4);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-3xl rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_16px_50px_rgba(15,23,42,0.08)] sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">Thank You</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
          {isPrivate ? "Thanks for sharing your feedback" : isWeHearYouReview ? "Thanks for your review" : "Thanks for your rating"}
        </h1>
        <p className="mt-4 text-base leading-7 text-slate-600">
          {isPrivate
            ? "Your feedback has been sent privately to the team."
            : isWeHearYouReview
              ? `Your review has been shared with ${recipient.campaign.location.name}. We appreciate you taking the time!`
              : "One final step, post your review publicly if you'd like to help other customers discover this business."}
        </p>

        <div className="mt-6 rounded-3xl bg-slate-50 p-5 text-sm leading-7 text-slate-600">
          <p>
            <span className="font-semibold text-slate-900">Your rating:</span> {rating > 0 ? `${rating} / 5` : "Not captured"}
          </p>
          <p className="mt-2">
            {isPrivate
              ? "The team can now review your private feedback internally."
              : isWeHearYouReview
                ? "The team has received your review."
                : "Your public review helps strengthen trust for future customers."}
          </p>
        </div>

        {!isPrivate && !isWeHearYouReview && reviewLink ? (
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={reviewLink} className="inline-flex rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold !text-white shadow-sm visited:!text-white hover:!text-white">
              Leave a Google review
            </Link>
            <Link href="/" className="inline-flex rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm">
              Done
            </Link>
          </div>
        ) : (
          <div className="mt-8">
            <Link href="/" className="inline-flex rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold !text-white shadow-sm visited:!text-white hover:!text-white">
              Finish
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
