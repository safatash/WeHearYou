export const dynamic = "force-dynamic";

import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { getCurrentMembership } from "@/lib/authz";
import {
  buildReviewPageStats,
  getReviewFilterOptions,
  getReviews,
  type ReviewSort,
  type ReviewSourceFilter,
  type ReviewStatusFilter,
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
  const locationId = typeof query.location === "string" ? query.location : "all";
  const selectedId = typeof query.selected === "string" ? query.selected : null;

  const locationIds = await getCurrentAccessibleLocationIds();
  const allowedLocationId = locationId !== "all" && locationIds.includes(locationId) ? locationId : "all";

  const [{ locations }, reviews, membership] = await Promise.all([
    getReviewFilterOptions(locationIds),
    getReviews(sort, {
      status,
      source,
      locationId: allowedLocationId !== "all" ? allowedLocationId : null,
      locationIds,
    }),
    getCurrentMembership(),
  ]);

  const stats = buildReviewPageStats(reviews);
  const aiReplyEnabled = membership?.organization.aiReplyEnabled ?? false;

  // Calculate needsReply count from reviews
  const needsReplyCount = reviews.filter((review) => !review.sourceReplyText && !review.replyPublishedAt && !review.replySentAt).length;

  const baseFilterHref = (() => {
    const params = new URLSearchParams();
    params.set("sort", sort);
    params.set("status", status);
    params.set("source", source);
    params.set("location", allowedLocationId);
    return `/reviews?${params.toString()}`;
  })();

  const buildFilterHref = (next: { sort?: string; status?: string; source?: string; locationId?: string }) => {
    const params = new URLSearchParams();
    params.set("sort", next.sort ?? sort);
    params.set("status", next.status ?? status);
    params.set("source", next.source ?? source);
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
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-teal-600">REPUTATION</p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">Reviews</h1>
            <p className="mt-2 text-sm text-slate-600">
              Every Google review across your connected profiles. Replies post publicly as the business owner — always after you confirm.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition">
              Export CSV
            </button>
            <button className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 transition">
              AI reply drafts
            </button>
          </div>
        </div>


        {/* Filters */}
        <section className="space-y-3">
          {/* Status/Rating tabs */}
          <div className="flex flex-wrap gap-2">
            <Link
              href={buildFilterHref({ status: "all" })}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                status === "all"
                  ? "bg-teal-600 text-white"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              All
            </Link>
            <Link
              href={buildFilterHref({ status: "needs-follow-up" })}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                status === "needs-follow-up"
                  ? "bg-teal-600 text-white"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              Needs reply {needsReplyCount > 0 && <span className="ml-1 font-bold">{needsReplyCount}</span>}
            </Link>
            <Link
              href={buildFilterHref({ sort: "highest" })}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                sort === "highest"
                  ? "bg-teal-600 text-white"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              5★
            </Link>
            <Link
              href={buildFilterHref({ sort: "lowest" })}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                sort === "lowest" ? "bg-teal-600 text-white" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              4★
            </Link>
            <Link href={buildFilterHref({ status: "all" })} className="rounded-full px-4 py-1.5 text-sm font-semibold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition">
              1-3★
            </Link>
            <Link
              href={buildFilterHref({ status: "published" })}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                status === "published"
                  ? "bg-teal-600 text-white"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              Replied
            </Link>
          </div>

          {/* Location filter */}
          <div className="flex flex-wrap gap-2">
            <Link
              href={buildFilterHref({ locationId: "all" })}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                allowedLocationId === "all"
                  ? "bg-slate-950 text-white"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              All locations
            </Link>
            {locations.map((loc) => (
              <Link
                key={loc.id}
                href={buildFilterHref({ locationId: loc.id })}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                  allowedLocationId === loc.id
                    ? "bg-slate-950 text-white"
                    : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {loc.name}
              </Link>
            ))}
          </div>
        </section>

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
                filterHref={baseFilterHref}
                aiReplyEnabled={aiReplyEnabled}
              />
            ))
          )}
        </div>
      </div>
    </AppShell>
  );
}
