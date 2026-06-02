export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { submitReviewLinkFeedback } from "./actions";

export default async function ReviewLinkFeedbackPage({
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
    select: { id: true, name: true },
  });

  if (!location) notFound();

  const src = typeof query.src === "string" ? query.src : null;
  const medium = typeof query.medium === "string" ? query.medium : null;
  const placement = typeof query.placement === "string" ? query.placement : null;
  const error = typeof query.error === "string" ? query.error : null;

  const errorMessage =
    error === "message_too_short" ? "Your message must be at least 10 characters." :
    error === "invalid_email" ? "Please enter a valid email address." :
    error === "rate_limited" ? "Too many submissions. Please try again later." :
    null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="mx-auto w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 shadow-lg">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">{location.name}</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">Share your feedback</h1>
        <p className="mt-2 text-sm text-slate-500">
          Your name and email are optional. This feedback goes only to the business and is not posted publicly.
        </p>

        {errorMessage && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        <form action={submitReviewLinkFeedback} className="mt-6 space-y-4">
          <input type="hidden" name="slug" value={slug} />
          {src && <input type="hidden" name="src" value={src} />}
          {medium && <input type="hidden" name="medium" value={medium} />}
          {placement && <input type="hidden" name="placement" value={placement} />}
          {/* Honeypot — hidden from users, visible to bots */}
          <input type="text" name="website" className="hidden" tabIndex={-1} aria-hidden="true" />

          <div>
            <label className="block text-sm font-semibold text-slate-700" htmlFor="rl-name">
              Name <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <input
              id="rl-name"
              name="name"
              type="text"
              maxLength={100}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              placeholder="Your name"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700" htmlFor="rl-email">
              Email <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <input
              id="rl-email"
              name="email"
              type="email"
              maxLength={200}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700" htmlFor="rl-message">
              What happened? <span className="text-red-500">*</span>
            </label>
            <textarea
              id="rl-message"
              name="message"
              required
              minLength={10}
              maxLength={2000}
              rows={5}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              placeholder="Share what could have gone better, and anything you&apos;d want the team to know."
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 transition"
          >
            Send private feedback
          </button>
        </form>
      </div>
    </main>
  );
}
