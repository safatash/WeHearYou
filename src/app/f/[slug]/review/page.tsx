export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { submitPublicPositiveReview } from "../actions";

export default async function PublicFunnelPositiveReviewPage({
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
  const hasError = query.error === "invalid_review";

  const location = await prisma.location.findFirst({
    where: { slug },
    include: { publicProfile: true },
  });

  if (!location) {
    notFound();
  }

  return (
    <main className={isEmbed ? "bg-white p-5 text-slate-900" : "min-h-screen bg-slate-50 px-4 py-10 text-slate-900 sm:px-6"}>
      <div className={isEmbed ? "" : "mx-auto max-w-3xl rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_16px_50px_rgba(15,23,42,0.08)] sm:p-10"}>
        {!isEmbed && <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">Leave a Review</p>}
        <h1 className={`${isEmbed ? "text-2xl" : "mt-3 text-4xl"} font-semibold tracking-tight text-slate-950`}>
          Share your experience with {location.name}
        </h1>
        <p className="mt-3 text-base leading-7 text-slate-600">
          Thanks for the great rating! Share what stood out — your review goes straight to {location.name}.
        </p>

        <div className="mt-4 rounded-3xl bg-slate-50 p-4 text-sm leading-7 text-slate-600">
          <p>
            <span className="font-semibold text-slate-900">Your rating:</span> {rating > 0 ? `${rating} / 5` : "Not captured"}
          </p>
        </div>

        {hasError && (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            Please write a short review before submitting.
          </div>
        )}

        <form action={submitPublicPositiveReview} className="mt-6 space-y-4">
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="rating" value={rating} />
          {isEmbed && <input type="hidden" name="embed" value="1" />}
          <label className="block text-sm font-semibold text-slate-700">
            Your review
            <textarea
              name="body"
              required
              className="mt-2 min-h-40 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              placeholder="What stood out? What would you tell a friend about this business?"
            />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Your name (optional)
            <input
              name="name"
              className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              placeholder="Shown with your review"
            />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Your email (optional)
            <input
              name="email"
              type="email"
              className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              placeholder="Only used by the team to follow up — never published"
            />
          </label>
          <button type="submit" className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold !text-white shadow-sm visited:!text-white hover:!text-white">
            Submit review
          </button>
        </form>
      </div>
    </main>
  );
}
