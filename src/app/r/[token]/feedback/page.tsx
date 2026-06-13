export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { submitPrivateFeedback } from "@/app/r/[token]/actions";
import { getRecipientByToken } from "@/lib/funnel";
import { normalizeRatingMode } from "@/lib/rating-styles";
import { RatingDisplay } from "@/components/rating-display";

export default async function PrivateFeedbackPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { token } = await params;
  const query = await searchParams;
  const rating = Number(typeof query.rating === "string" ? query.rating : "0");
  const recipient = await getRecipientByToken(token);

  if (!recipient) {
    notFound();
  }

  const location = recipient.campaign.location;
  const profile = location.publicProfile;
  const ratingMode = normalizeRatingMode(profile?.funnelRatingStyle);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-3xl rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_16px_50px_rgba(15,23,42,0.08)] sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">WeHearYou Review Funnel</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">How was your experience with {location.name}?</h1>
        <p className="mt-4 text-base leading-7 text-slate-600">Share a quick rating below.</p>

        <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-8 space-y-6">
          <div>
            <p className="text-lg font-semibold text-slate-900 mb-4">Rate your experience</p>
            <RatingDisplay value={rating} mode={ratingMode} />
          </div>

          {/* Feedback form */}
          <div>
            <p className="text-lg font-semibold text-slate-900 mb-4">Send a message directly to our team</p>
            <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-600 leading-relaxed">
                We&apos;re sorry you had a bad experience. You can use this form to contact our customer service team and give us an opportunity to resolve any problem or complaint you have before leaving a review.
              </p>
            </div>
            <form action={submitPrivateFeedback} className="space-y-4">
              <input type="hidden" name="token" value={token} />
              <input type="hidden" name="rating" value={rating} />
              <textarea
                name="feedback"
                required
                placeholder="Your message..."
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 min-h-24"
              />
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">Name</label>
                <input
                  type="text"
                  placeholder="Your name"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">Email</label>
                <input
                  type="email"
                  placeholder="your@email.com"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-2xl bg-emerald-500 hover:bg-emerald-600 px-5 py-4 text-base font-semibold text-white shadow-sm transition"
              >
                Send →
              </button>
            </form>
            {location.reviewLink && (
              <div className="pt-4 border-t border-slate-200 mt-4">
                <a
                  href={location.reviewLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-center rounded-2xl border-2 border-emerald-500 text-emerald-600 px-5 py-3 text-sm font-semibold hover:bg-emerald-50 transition"
                >
                  I prefer to write a review →
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
