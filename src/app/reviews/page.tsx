export const dynamic = "force-dynamic";

import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { getCurrentMembership } from "@/lib/authz";
import {
  getReviewFilterOptions,
  getReviews,
  type ReviewSort,
  type ReviewSourceFilter,
  type ReviewStatusFilter,
  type ReviewRatingFilter,
} from "@/lib/reviews";
import { getCurrentAccessibleLocationIds } from "@/lib/current-scope";
import { ReviewListItem } from "@/components/reviews/review-list-item";

export default async function ReviewsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = (await searchParams) ?? {};
  const requestedSort = typeof query.sort === "string" ? query.sort : "newest";
  const sort: ReviewSort = requestedSort === "highest" || requestedSort === "lowest" ? requestedSort : "newest";
  const requestedStatus = typeof query.status === "string" ? query.status : "all";
  const status: ReviewStatusFilter = ["published", "private-feedback", "needs-follow-up", "testimonials"].includes(requestedStatus)
    ? (requestedStatus as ReviewStatusFilter)
    : "all";
  const requestedSource = typeof query.source === "string" ? query.source : "all";
  const source: ReviewSourceFilter = ["google", "facebook", "internal"].includes(requestedSource)
    ? (requestedSource as ReviewSourceFilter)
    : "all";
  const requestedRating = typeof query.rating === "string" ? query.rating : "all";
  const rating: ReviewRatingFilter = ["five-star", "four-star", "low-star"].includes(requestedRating)
    ? (requestedRating as ReviewRatingFilter)
    : "all";
  const locationId = typeof query.location === "string" ? query.location : "all";
  const selectedId = typeof query.selected === "string" ? query.selected : null;

  const locationIds = await getCurrentAccessibleLocationIds();
  const allowedLocationId = locationId !== "all" && locationIds.includes(locationId) ? locationId : "all";

  const [{ locations }, reviews, membership] = await Promise.all([
    getReviewFilterOptions(locationIds),
    getReviews(sort, {
      status,
      source,
      rating,
      locationId: allowedLocationId !== "all" ? allowedLocationId : null,
      locationIds,
    }),
    getCurrentMembership(),
  ]);

  const aiReplyEnabled = membership?.organization.aiReplyEnabled ?? false;

  // Calculate needsReply count from reviews
  const needsReplyCount = reviews.filter((review) => !review.sourceReplyText && !review.replyPublishedAt && !review.replySentAt).length;

  const buildFilterHref = (next: { sort?: string; status?: string; source?: string; rating?: string; locationId?: string }) => {
    const params = new URLSearchParams();
    params.set("sort", next.sort ?? sort);
    params.set("status", next.status ?? status);
    params.set("source", next.source ?? source);
    params.set("rating", next.rating ?? rating);
    params.set("location", next.locationId ?? allowedLocationId);
    if (selectedId) params.set("selected", selectedId);
    return `/reviews?${params.toString()}`;
  };

  return (
    <AppShell activeScreen="reviews" selectedLocationId={allowedLocationId !== "all" ? allowedLocationId : undefined}>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">REPUTATION</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Reviews</h1>
            <p className="mt-1.5 text-sm text-slate-500 max-w-lg">
              Every Google review across your connected profiles. Replies post publicly as the business owner — always after you confirm.
            </p>
          </div>
          <div className="flex gap-2 shrink-0 mt-1">
            <button className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
              Export CSV
            </button>
            <button className="inline-flex items-center gap-1.5 rounded-lg bg-[#37aeb7] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2a8a92] transition">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
              </svg>
              AI reply drafts
            </button>
          </div>
        </div>

        {/* Info banner */}
        <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
          <svg className="w-4 h-4 text-[#37aeb7] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          Replies are written to Google only after you review and confirm each one. AI never posts on its own.
        </div>

        {/* Filters — single white card, tabs left / location right */}
        <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3">
          {/* Rating/status tabs */}
          <div className="flex items-center gap-1 flex-wrap">
            {[
              { label: "All", href: buildFilterHref({ status: "all", rating: "all" }), active: status === "all" && rating === "all" },
              { label: <>Needs reply {needsReplyCount > 0 && <span className="ml-1 tabular-nums">{needsReplyCount}</span>}</>, href: buildFilterHref({ status: "needs-follow-up", rating: "all" }), active: status === "needs-follow-up" },
              { label: "5★", href: buildFilterHref({ rating: "five-star", status: "all" }), active: rating === "five-star" },
              { label: "4★", href: buildFilterHref({ rating: "four-star", status: "all" }), active: rating === "four-star" },
              { label: "1–3★", href: buildFilterHref({ rating: "low-star", status: "all" }), active: rating === "low-star" },
              { label: "Replied", href: buildFilterHref({ status: "published", rating: "all" }), active: status === "published" },
            ].map((tab, i) => (
              <Link
                key={i}
                href={tab.href}
                className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition whitespace-nowrap ${
                  tab.active
                    ? "bg-[#37aeb7] !text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </div>

          {/* Location pills */}
          <div className="flex items-center gap-1 flex-wrap justify-end">
            <Link
              href={buildFilterHref({ locationId: "all" })}
              className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition whitespace-nowrap ${
                allowedLocationId === "all" ? "bg-slate-900 !text-white" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              All locations
            </Link>
            {locations.map((loc) => (
              <Link
                key={loc.id}
                href={buildFilterHref({ locationId: loc.id })}
                className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition whitespace-nowrap ${
                  allowedLocationId === loc.id ? "bg-slate-900 !text-white" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {loc.name}
              </Link>
            ))}
          </div>
        </div>

        {/* Review list */}
        <div className="space-y-3">
          {reviews.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">
              <p className="font-semibold text-slate-700 mb-1">No reviews yet</p>
              <p>Sync Google or collect direct feedback to start populating the inbox.</p>
            </div>
          ) : (
            reviews.map((review) => (
              <ReviewListItem
                key={review.id}
                review={review}
                selected={review.id === selectedId}
                aiReplyEnabled={aiReplyEnabled}
              />
            ))
          )}
        </div>
      </div>
    </AppShell>
  );
}
