export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { submitCampaignPositiveReview } from "@/app/r/[token]/actions";
import { getRecipientByToken } from "@/lib/funnel";

export default async function CampaignPositiveReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { token } = await params;
  const query = await searchParams;
  const rating = Number(typeof query.rating === "string" ? query.rating : "0");
  const hasError = query.error === "invalid_review";
  const recipient = await getRecipientByToken(token);

  if (!recipient) {
    notFound();
  }

  const location = recipient.campaign.location;
  const firstName = (recipient.contact.name || "").trim().split(" ")[0];

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-3xl rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_16px_50px_rgba(15,23,42,0.08)] sm:p-10">
        {location.publicProfile?.logoUrl ? (
          <img src={location.publicProfile.logoUrl} alt={`${location.name} logo`} className="mb-6 h-14 w-auto rounded-xl object-contain" />
        ) : null}
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">Leave a Review</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
          {firstName ? `Thanks, ${firstName}!` : "Thank you!"} Share your experience with {location.name}
        </h1>
        <p className="mt-4 text-base leading-7 text-slate-600">
          Share what stood out — your review goes straight to {location.name}.
        </p>

        <div className="mt-6 rounded-3xl bg-slate-50 p-5 text-sm leading-7 text-slate-600">
          <p>
            <span className="font-semibold text-slate-900">Your rating:</span> {rating > 0 ? `${rating} / 5` : "Not captured"}
          </p>
        </div>

        {hasError && (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            Please write a short review before submitting.
          </div>
        )}

        <form action={submitCampaignPositiveReview} className="mt-6 space-y-4">
          <input type="hidden" name="token" value={token} />
          <input type="hidden" name="rating" value={rating} />
          <label className="block text-sm font-semibold text-slate-700">
            Your review
            <textarea
              name="body"
              required
              className="mt-2 min-h-40 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              placeholder="What stood out? What would you tell a friend about this business?"
            />
          </label>
          <button
            type="submit"
            className="w-full rounded-2xl bg-emerald-500 hover:bg-emerald-600 px-5 py-4 text-base font-semibold text-white shadow-sm transition"
          >
            Submit review →
          </button>
        </form>
      </div>
    </main>
  );
}
