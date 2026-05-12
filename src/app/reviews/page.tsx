import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { StatCard } from "@/components/ui";
import {
  buildReviewPageStats,
  formatReviewDate,
  formatReviewSource,
  formatReviewStatus,
  getReviewFilterOptions,
  getReviews,
  stars,
  truncateReviewBody,
  type ReviewSort,
  type ReviewSourceFilter,
  type ReviewStatusFilter,
} from "@/lib/reviews";
import { getCurrentAccessibleLocationIds } from "@/lib/current-scope";

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
  const locationIds = await getCurrentAccessibleLocationIds();
  const allowedLocationId = locationId !== "all" && locationIds.includes(locationId) ? locationId : "all";
  const { locations } = await getReviewFilterOptions(locationIds);
  const reviews = await getReviews(sort, {
    status,
    source,
    locationId: allowedLocationId !== "all" ? allowedLocationId : null,
    locationIds,
  });
  const stats = buildReviewPageStats(reviews);

  const buildFilterHref = (next: { sort?: string; status?: string; source?: string; locationId?: string }) => {
    const params = new URLSearchParams();
    params.set("sort", next.sort ?? sort);
    params.set("status", next.status ?? status);
    params.set("source", next.source ?? source);
    params.set("locationId", next.locationId ?? allowedLocationId);
    return `/reviews?${params.toString()}`;
  };

  return (
    <AppShell activeScreen="reviews">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">Reviews Inbox</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">All Google reviews and private feedback, organized for action</h2>
            <p className="mt-3 max-w-3xl text-slate-600">
              Track reputation at a glance, then drill into individual reviews with location context, source status, and follow-up detail.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { value: "newest", label: "Newest" },
              { value: "highest", label: "Highest rating" },
              { value: "lowest", label: "Lowest rating" },
            ].map((option) => {
              const active = sort === option.value;

              return (
                <Link
                  key={option.value}
                  href={`/reviews?sort=${option.value}`}
                  style={active ? { color: "white" } : undefined}
                  className={`rounded-2xl px-4 py-2 text-sm font-semibold shadow-sm ${
                    active ? "bg-slate-950 !text-white visited:!text-white hover:!text-white" : "border border-slate-200 bg-white text-slate-600"
                  }`}
                >
                  {option.label}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-4">
          <StatCard title="Average Rating" value={stats.averageRating} meta="Across all stored reviews" />
          <StatCard title="Published Reviews" value={stats.publishedReviews} meta={`${stats.googleReviews} from Google`} />
          <StatCard title="Private Feedback" value={stats.privateFeedback} meta="Needs internal attention" />
          <StatCard title="Testimonials" value={stats.testimonials} meta={`${stats.totalReviews} total records in inbox`} />
        </div>

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
                    style={status === option.value ? { color: "white" } : undefined}
                    className={`rounded-2xl px-4 py-2 text-sm font-semibold ${status === option.value ? "bg-slate-950 text-white" : "border border-slate-200 bg-slate-50 text-slate-700"}`}
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
                    style={source === option.value ? { color: "white" } : undefined}
                    className={`rounded-2xl px-4 py-2 text-sm font-semibold ${source === option.value ? "bg-slate-950 text-white" : "border border-slate-200 bg-slate-50 text-slate-700"}`}
                  >
                    {option.label}
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-700">Location</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href={buildFilterHref({ locationId: "all" })} style={locationId === "all" ? { color: "white" } : undefined} className={`rounded-2xl px-4 py-2 text-sm font-semibold ${locationId === "all" ? "bg-slate-950 text-white" : "border border-slate-200 bg-slate-50 text-slate-700"}`}>
                  All locations
                </Link>
                {locations.map((location) => (
                  <Link
                    key={location.id}
                    href={buildFilterHref({ locationId: location.id })}
                    style={locationId === location.id ? { color: "white" } : undefined}
                    className={`rounded-2xl px-4 py-2 text-sm font-semibold ${locationId === location.id ? "bg-slate-950 text-white" : "border border-slate-200 bg-slate-50 text-slate-700"}`}
                  >
                    {location.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          {reviews.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-600">
              No reviews yet. Sync Google or collect direct feedback to start populating the inbox.
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => (
                <Link
                  key={review.id}
                  href={`/reviews/${review.id}`}
                  className="block rounded-3xl border border-slate-200 p-5 text-left transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-base font-semibold text-slate-900">{review.reviewerName}</p>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          {formatReviewSource(review.source, review.isTestimonial)}
                        </span>
                        <span className="rounded-full bg-slate-950 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white">
                          {formatReviewStatus(review.status, review.isTestimonial)}
                        </span>
                        {review.location ? (
                          <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-700">
                            {review.location.name}
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                        <p className="font-medium text-amber-500">{stars(review.rating)}</p>
                        <p className="text-slate-500">{formatReviewDate(review.reviewedAt)}</p>
                        {review.contact?.email ? <p className="text-slate-500">Contact: {review.contact.email}</p> : null}
                      </div>

                      <p className="mt-4 text-sm leading-7 text-slate-600">{truncateReviewBody(review.body)}</p>
                    </div>

                    <div className="lg:w-40">
                      <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                        <p className="font-semibold text-slate-900">Rating</p>
                        <p className="mt-1 text-lg font-semibold text-slate-900">{review.rating}.0 / 5</p>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
