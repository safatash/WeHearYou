export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { getRecipientByToken } from "@/lib/funnel";
import { submitReviewRating } from "@/app/r/[token]/actions";

export default async function ReviewLandingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const recipient = await getRecipientByToken(token);

  if (!recipient) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-3xl rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_16px_50px_rgba(15,23,42,0.08)] sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">WeHearYou Review Request</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">How was your experience with {recipient.campaign.location.name}?</h1>
        <p className="mt-4 text-base leading-7 text-slate-600">
          Hi {recipient.contact.name}, thanks for taking a moment to rate your visit. This takes less than 10 seconds, and your response helps the team improve.
        </p>

        <div className="mt-6 rounded-3xl bg-slate-50 p-5 text-sm leading-7 text-slate-600">
          <p>
            <span className="font-semibold text-slate-900">How it works:</span> lower ratings stay private so the team can follow up directly. Higher ratings can continue to a public review page.
          </p>
        </div>

        <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6">
          <p className="text-sm font-semibold text-slate-700">Choose a rating</p>
          <form action={submitReviewRating} className="mt-4 grid gap-3 sm:grid-cols-5">
            <input type="hidden" name="token" value={token} />
            {[1, 2, 3, 4, 5].map((rating) => (
              <button
                key={rating}
                type="submit"
                name="rating"
                value={rating}
                className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-5 text-center transition hover:border-indigo-300 hover:bg-indigo-50"
              >
                <div className="text-2xl text-amber-400">{"★".repeat(rating)}</div>
                <div className="mt-2 text-sm font-semibold text-slate-700">{rating} star{rating > 1 ? "s" : ""}</div>
                <div className="mt-1 text-xs text-slate-500">{rating <= 3 ? "Private" : "Public option"}</div>
              </button>
            ))}
          </form>
        </div>
      </div>
    </main>
  );
}
