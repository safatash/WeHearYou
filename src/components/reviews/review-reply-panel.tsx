"use client";

import { useState } from "react";
import { saveReviewReply } from "@/app/reviews/actions";
import { formatReviewDate, formatReviewSource, formatReviewStatus, stars, type ReviewWithRelations } from "@/lib/reviews";

export function ReviewReplyPanel({
  review,
  aiReplyEnabled,
  initialDraft,
}: {
  review: ReviewWithRelations;
  aiReplyEnabled: boolean;
  initialDraft: string;
}) {
  const [draft, setDraft] = useState(initialDraft);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  async function handleGenerateReply() {
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch("/api/ai/reply-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId: review.id }),
        signal: AbortSignal.timeout(15000),
      });
      const data = await res.json();
      if (!res.ok) {
        setAiError(data.error ?? "Could not generate reply — try again");
        return;
      }
      setDraft(data.draft);
    } catch {
      setAiError("Could not generate reply — try again");
    } finally {
      setAiLoading(false);
    }
  }

  const sourceLabel = formatReviewSource(review.source, review.isTestimonial);
  const statusLabel = formatReviewStatus(review.status, review.isTestimonial);

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Review header */}
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-sm font-bold uppercase text-slate-600">
            {review.reviewerName.charAt(0)}
          </div>
          <div>
            <p className="font-semibold text-slate-900">{review.reviewerName}</p>
            <p className="text-xs text-slate-500">{formatReviewDate(review.reviewedAt)}</p>
          </div>
          <span className="ml-auto rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            {sourceLabel}
          </span>
          <span className="rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
            {statusLabel}
          </span>
          {review.location && (
            <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-indigo-600">
              {review.location.name}
            </span>
          )}
        </div>
        <p className="mt-2 text-lg font-medium text-amber-500">{stars(review.rating)}</p>
      </div>

      {/* Review body */}
      <div className="rounded-2xl bg-slate-50 p-4 text-sm leading-7 text-slate-700">
        {review.body}
      </div>

      {/* AI reply button */}
      <div>
        <button
          type="button"
          onClick={handleGenerateReply}
          disabled={!aiReplyEnabled || aiLoading}
          className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition-colors ${
            aiReplyEnabled
              ? "bg-indigo-600 text-white hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-60"
              : "cursor-not-allowed bg-slate-100 text-slate-400"
          }`}
          title={aiReplyEnabled ? undefined : "Upgrade to Pro to use AI replies"}
        >
          {aiLoading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Generating...
            </>
          ) : (
            <>
              ✨ Reply with AI
              {!aiReplyEnabled && (
                <span className="ml-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                  Pro
                </span>
              )}
            </>
          )}
        </button>
        {aiError && <p className="mt-2 text-xs text-rose-600">{aiError}</p>}
      </div>

      {/* Reply form */}
      <form action={saveReviewReply} className="flex flex-col gap-4">
        <input type="hidden" name="reviewId" value={review.id} />
        <textarea
          name="replyDraft"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Write your reply..."
          className="min-h-36 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-7 text-slate-700 outline-none focus:border-indigo-300"
        />

        {review.replySentAt && (
          <p className="text-xs text-slate-500">
            Last sent: {formatReviewDate(review.replySentAt)}
            {review.replySentByMembership?.user.name && ` by ${review.replySentByMembership.user.name}`}
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            name="markSent"
            value="false"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:border-slate-300"
          >
            Save draft
          </button>
          <button
            type="submit"
            name="markSent"
            value="true"
            className="rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm"
          >
            Mark as sent
          </button>
        </div>
      </form>

      <div className="border-t border-slate-100 pt-3">
        <a
          href={`/reviews/${review.id}`}
          className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
        >
          View full details →
        </a>
      </div>
    </div>
  );
}
