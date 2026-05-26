export const dynamic = "force-dynamic";

import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { StatCard } from "@/components/ui";
import { getCurrentMembership } from "@/lib/authz";
import {
  buildReviewPageStats,
  buildReviewReplyDraft,
  getReviewById,
  getReviewFilterOptions,
  getReviews,
  type ReviewSort,
  type ReviewSourceFilter,
  type ReviewStatusFilter,
} from "@/lib/reviews";
import { getCurrentAccessibleLocationIds } from "@/lib/current-scope";
import { ReviewListItem } from "@/components/reviews/review-list-item";
import { ReviewReplyPanel } from "@/components/reviews/review-reply-panel";

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
  const locationId = typeof query.locationId === "string" ? query.locationId : "all";
  const selectedId = typeof query.selected === "string" ? query.selected : null;

  const locationIds = await getCurrentAccessibleLocationIds();
  const allowedLocationId = locationId !== "all" && locationIds.includes(locationId) ? locationId : "all";

  const [{ locations }, reviews, membership, selectedReview] = await Promise.all([
    getReviewFilterOptions(locationIds),
    getReviews(sort, {
      status,
      source,
      locationId: allowedLocationId !== "all" ? allowedLocationId : null,
      locationIds,
    }),
    getCurrentMembership(),
    selectedId ? getReviewById(selectedId, locationIds) : Promise.resolve(null),
  ]);

  const stats = buildReviewPageStats(reviews);
  const aiReplyEnabled = membership?.organization.aiReplyEnabled ?? false;

  const baseFilterHref = (() => {
    const params = new URLSearchParams();
    params.set("sort", sort);
    params.set("status", status);
    params.set("source", source);
    params.set("locationId", allowedLocationId);
    return `/reviews?${params.toString()}`;
  })();

  const buildFilterHref = (next: { sort?: string; status?: string; source?: string; locationId?: string }) => {
    const params = new URLSearchParams();
    params.set("sort", next.sort ?? sort);
    params.set("status", next.status ?? status);
    params.set("source", next.source ?? source);
    params.set("locationId", next.locationId ?? allowedLocationId);
    if (selectedId) params.set("selected", selectedId);
    return `/reviews?${params.toString()}`;
  };

  return (
    <AppShell activeScreen="reviews">
      <div className="flex h-full flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">Reviews Inbox</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">All reviews, organized for action</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { value: "newest", label: "Newest" },
              { value: "highest", label: "Highest rating" },
              { value: "lowest", label: "Lowest rating" },
            ].map((option) => (
              <Link
                key={option.value}
                href={buildFilterHref({ sort: option.value })}
                className={`rounded-2xl px-4 py-2 text-sm font-semibold shadow-sm ${
                  sort === option.value
                    ? "bg-slate-950 !text-white visited:!text-white hover:!text-white"
                    : "border border-slate-200 bg-white text-slate-600"
                }`}
              >
                {option.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 xl:grid-cols-4">
          <StatCard title="Average Rating" value={stats.averageRating} meta="Across all stored reviews" />
          <StatCard title="Published Reviews" value={stats.publishedReviews} meta={`${stats.googleReviews} from Google`} />
          <StatCard title="Private Feedback" value={stats.privateFeedback} meta="Needs internal attention" />
          <StatCard title="Testimonials" value={stats.testimonials} meta={`${stats.totalReviews} total records`} />
        </div>

        {/* Filters */}
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-4 lg:grid-cols-3">
            <div>
              <p className="text-sm font-semibold text-slate-700">Status</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {[
                  { value: "all", label: "All" },
                  { value: "published", label: "Published" },
                  { value: "private-feedback", label: "Private feedback" },
                  { value: "needs-follow-up", label: "Needs follow-up" },
                  { value: "testimonials", label: "Testimonials" },
                ].map((option) => (
                  <Link
                    key={option.value}
                    href={buildFilterHref({ status: option.value })}
                    className={`rounded-2xl px-4 py-2 text-sm font-semibold ${status === option.value ? "bg-slate-950 !text-white" : "border border-slate-200 bg-slate-50 text-slate-700"}`}
                  >
                    {option.label}
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700">Source</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {[
                  { value: "all", label: "All" },
                  { value: "google", label: "Google" },
                  { value: "facebook", label: "Facebook" },
                  { value: "internal", label: "Internal" },
                ].map((option) => (
                  <Link
                    key={option.value}
                    href={buildFilterHref({ source: option.value })}
                    className={`rounded-2xl px-4 py-2 text-sm font-semibold ${source === option.value ? "bg-slate-950 !text-white" : "border border-slate-200 bg-slate-50 text-slate-700"}`}
                  >
                    {option.label}
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700">Location</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href={buildFilterHref({ locationId: "all" })}
                  className={`rounded-2xl px-4 py-2 text-sm font-semibold ${allowedLocationId === "all" ? "bg-slate-950 !text-white" : "border border-slate-200 bg-slate-50 text-slate-700"}`}
                >
                  All locations
                </Link>
                {locations.map((loc) => (
                  <Link
                    key={loc.id}
                    href={buildFilterHref({ locationId: loc.id })}
                    className={`rounded-2xl px-4 py-2 text-sm font-semibold ${allowedLocationId === loc.id ? "bg-slate-950 !text-white" : "border border-slate-200 bg-slate-50 text-slate-700"}`}
                  >
                    {loc.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Panel layout */}
        <div className="flex min-h-0 flex-1 gap-6">
          {/* Left: review list */}
          <div className={`flex flex-col gap-2 overflow-y-auto ${selectedReview ? "hidden xl:flex xl:w-2/5" : "w-full"}`}>
            {reviews.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-600">
                No reviews yet. Sync Google or collect direct feedback to start populating the inbox.
              </div>
            ) : (
              reviews.map((review) => (
                <ReviewListItem
                  key={review.id}
                  review={review}
                  selected={review.id === selectedId}
                  filterHref={baseFilterHref}
                />
              ))
            )}
          </div>

          {/* Right: reply panel */}
          {selectedReview ? (
            <div className="flex-1 overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-sm xl:w-3/5">
              <div className="mb-2 border-b border-slate-100 px-6 pt-4 pb-3 xl:hidden">
                <Link href={baseFilterHref} className="text-sm font-semibold text-indigo-600">
                  ← Back to inbox
                </Link>
              </div>
              <ReviewReplyPanel
                review={selectedReview}
                aiReplyEnabled={aiReplyEnabled}
                initialDraft={selectedReview.replyDraft ?? buildReviewReplyDraft(selectedReview.reviewerName, selectedReview.rating)}
              />
            </div>
          ) : (
            <div className="hidden xl:flex xl:w-3/5 items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-400">
              Select a review to reply
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
