import Link from "next/link";
import { formatReviewDate, formatReviewSource, formatReviewStatus, stars, truncateReviewBody, type ReviewWithRelations } from "@/lib/reviews";

export function ReviewListItem({
  review,
  selected,
  filterHref,
  aiReplyEnabled,
}: {
  review: ReviewWithRelations;
  selected: boolean;
  filterHref: string;
  aiReplyEnabled: boolean;
}) {
  const href = `${filterHref}&selected=${review.id}`;

  return (
    <Link
      href={href}
      className={`block rounded-2xl border p-4 transition-colors ${
        selected
          ? "border-indigo-300 bg-indigo-50"
          : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-bold uppercase text-slate-600">
            {review.reviewerName.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">{review.reviewerName}</p>
            <p className="text-xs text-amber-500">{stars(review.rating ?? 0)}</p>
          </div>
        </div>
        <p className="flex-shrink-0 text-xs text-slate-400">{formatReviewDate(review.reviewedAt)}</p>
      </div>

      <p className="mt-2 text-xs leading-5 text-slate-500">{truncateReviewBody(review.body, 120)}</p>

      <div className="mt-2 flex flex-wrap gap-1">
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          {formatReviewSource(review.source, review.isTestimonial)}
        </span>
        <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
          {formatReviewStatus(review.status, review.isTestimonial)}
        </span>
        {review.location && (
          <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-600">
            {review.location.name}
          </span>
        )}
        {(review.sourceReplyText || review.replyPublishedAt || review.replySentAt) && (
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
            {review.replyPublishedAt ? "Published" : "Replied"}
          </span>
        )}
      </div>
    </Link>
  );
}
