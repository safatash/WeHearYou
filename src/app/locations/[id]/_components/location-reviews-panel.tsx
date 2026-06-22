import Link from "next/link";
import { REVIEW_FILTERS, filterLocationReviews, reviewNeedsReply, type ReviewFilter } from "@/lib/review-filtering";
import { formatReviewSource, formatReviewDate } from "@/lib/reviews";
import { ReviewRowActions } from "./review-row-actions";
import { ReviewSource } from "@prisma/client";

export function LocationReviewsPanel({
  reviews,
  locationId,
  activeFilter,
}: {
  reviews: Array<{
    id: string;
    reviewerName: string;
    rating: number | null;
    source: string;
    reviewedAt: Date | null;
    body: string;
    isFeatured: boolean;
    isHiddenFromMiniSite: boolean;
    isWidgetVisible: boolean;
    isTestimonial: boolean;
    replyPublishedAt: Date | null;
    replySentAt: Date | null;
  }>;
  locationId: string;
  activeFilter: ReviewFilter;
}) {
  const filtered = filterLocationReviews(reviews, activeFilter);
  return (
    <section id="reviews" className="rounded-2xl border border-[var(--ink-200)] bg-white p-6 shadow-[var(--shadow-sm)]">
      <h2 className="text-lg font-semibold text-[var(--ink-900)]">Reviews for this location</h2>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {REVIEW_FILTERS.map((f) => (
          <Link
            key={f.value}
            href={`?reviewFilter=${f.value}#reviews`}
            scroll={false}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              activeFilter === f.value
                ? "bg-[var(--accent)] !text-white"
                : "border border-[var(--ink-200)] text-[var(--ink-600)] hover:bg-[var(--ink-50)]"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>
      <div className="mt-4 space-y-3">
        {filtered.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[var(--ink-200)] p-6 text-center text-sm text-[var(--ink-500)]">
            No reviews match this filter.
          </p>
        ) : (
          filtered.map((r) => (
            <article key={r.id} className="rounded-xl border border-[var(--ink-200)] p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-[var(--ink-900)]">{r.reviewerName}</p>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-[var(--ink-500)]">
                    <span className="text-[var(--star)]">{"★".repeat(Math.round(r.rating ?? 0))}</span>
                    <span>{formatReviewSource(r.source as ReviewSource, r.isTestimonial)}</span>
                    <span>{formatReviewDate(r.reviewedAt)}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {r.isFeatured && (
                    <span className="rounded-md bg-[var(--accent-soft)] px-2 py-0.5 text-xs font-semibold text-[var(--accent-strong)]">
                      Featured
                    </span>
                  )}
                  {r.isHiddenFromMiniSite && (
                    <span className="rounded-md bg-[var(--ink-100)] px-2 py-0.5 text-xs font-semibold text-[var(--ink-600)]">
                      Hidden
                    </span>
                  )}
                  <span
                    className={`rounded-md px-2 py-0.5 text-xs font-semibold ${
                      reviewNeedsReply(r)
                        ? "bg-[var(--warning-soft)] text-[#92400e]"
                        : "bg-[var(--success-soft)] text-[#047857]"
                    }`}
                  >
                    {reviewNeedsReply(r) ? "Needs reply" : "Replied"}
                  </span>
                </div>
              </div>
              <p className="mt-2 text-sm leading-6 text-[var(--ink-600)]">{r.body}</p>
              <div className="mt-3 flex items-center justify-between gap-2">
                <Link href={`/reviews/${r.id}`} className="text-xs font-semibold text-[var(--accent)]">
                  Reply →
                </Link>
                <ReviewRowActions
                  reviewId={r.id}
                  isFeatured={r.isFeatured}
                  isHidden={r.isHiddenFromMiniSite}
                  isWidgetVisible={r.isWidgetVisible}
                />
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
