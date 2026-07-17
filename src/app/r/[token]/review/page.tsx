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
  const prefillBody = typeof query.body === "string" ? query.body : "";
  const hasError = query.error === "invalid_review";
  const recipient = await getRecipientByToken(token);

  if (!recipient) {
    notFound();
  }

  const location = recipient.campaign.location;
  const firstName = (recipient.contact.name || "").trim().split(" ")[0];
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const locationSlug = location.slug;
  const videoTestimonialUrl = `${appUrl}/vt/${locationSlug}`;

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
            Review title (optional)
            <input
              name="title"
              className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              placeholder="e.g. Amazing service and friendly staff"
            />
          </label>

          <label className="block text-sm font-semibold text-slate-700">
            Your review
            <textarea
              name="body"
              required
              className="mt-2 min-h-40 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              placeholder="What stood out? What would you tell a friend about this business?"
              defaultValue={prefillBody}
            />
          </label>

          <label className="block text-sm font-semibold text-slate-700">
            When did you have this experience? (optional)
            <input
              name="reviewedAt"
              type="date"
              className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
          </label>

          <label className="block text-sm font-semibold text-slate-700">
            Attach a photo (optional)
            <input
              name="reviewImage"
              type="file"
              accept="image/*"
              className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
            <span className="mt-1 text-xs text-slate-500">Photos help other customers see what you experienced. Max 5MB.</span>
          </label>

          <label className="block text-sm font-semibold text-slate-700">
            Your name (optional)
            <input
              name="name"
              className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              placeholder="Shown with your review"
              defaultValue={recipient.contact.name || ""}
            />
          </label>

          <label className="block text-sm font-semibold text-slate-700">
            Your email (optional)
            <input
              name="email"
              type="email"
              className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              placeholder="Only used by the team to follow up — never published"
              defaultValue={recipient.contact.email || ""}
            />
          </label>

          <div className="space-y-3 rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm font-semibold text-slate-700">Want to share more?</p>
            <p className="text-sm text-slate-600">Record a video testimonial to show your real experience and help others decide.</p>
            <a
              href={videoTestimonialUrl}
              className="inline-block rounded-2xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition"
            >
              Record a Video 🎥
            </a>
          </div>

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
