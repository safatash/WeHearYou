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

  const ratingTabs: Array<{ label: React.ReactNode; href: string; active: boolean }> = [
    { label: "All", href: buildFilterHref({ status: "all", rating: "all" }), active: status === "all" && rating === "all" },
    {
      label: (
        <>
          Needs reply
          {needsReplyCount > 0 && <span className="ld-tabcount">{needsReplyCount}</span>}
        </>
      ),
      href: buildFilterHref({ status: "needs-follow-up", rating: "all" }),
      active: status === "needs-follow-up",
    },
    { label: "5★", href: buildFilterHref({ rating: "five-star", status: "all" }), active: rating === "five-star" },
    { label: "4★", href: buildFilterHref({ rating: "four-star", status: "all" }), active: rating === "four-star" },
    { label: "1–3★", href: buildFilterHref({ rating: "low-star", status: "all" }), active: rating === "low-star" },
    { label: "Replied", href: buildFilterHref({ status: "published", rating: "all" }), active: status === "published" },
  ];

  return (
    <AppShell activeScreen="reviews" selectedLocationId={allowedLocationId !== "all" ? allowedLocationId : undefined}>
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "var(--gutter)" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div style={{ minWidth: 0 }}>
            <div className="eyebrow" style={{ marginBottom: 6 }}>Reputation</div>
            <h1 style={{ fontSize: 26, fontWeight: 680, letterSpacing: "-.025em" }}>Reviews</h1>
            <p style={{ fontSize: 13.5, color: "var(--ink-500)", marginTop: 5, maxWidth: 560, lineHeight: 1.55 }}>
              Every Google review across your connected profiles. Replies post publicly as the business owner — always after you confirm.
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, flex: "none" }}>
            <button type="button" className="btn btn-secondary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
              Export CSV
            </button>
            <button type="button" className="btn btn-primary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
              </svg>
              AI reply drafts
            </button>
          </div>
        </div>

        {/* Gated-write notice */}
        <div
          className="card"
          style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", marginTop: "var(--gutter)", fontSize: 13, color: "var(--ink-600)" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-strong)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flex: "none" }}>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          Replies are written to Google only after you review and confirm each one. AI never posts on its own.
        </div>

        {/* Filters — chip tabs (left) + location segmented control (right) */}
        <div
          className="card"
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", padding: "12px 14px", marginTop: "var(--gutter)" }}
        >
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            {ratingTabs.map((tab, i) => (
              <Link key={i} href={tab.href} className="chip" data-active={tab.active}>
                {tab.label}
              </Link>
            ))}
          </div>

          <div className="seg" style={{ marginLeft: "auto" }}>
            <Link href={buildFilterHref({ locationId: "all" })} data-active={allowedLocationId === "all"}>
              All locations
            </Link>
            {locations.map((loc) => (
              <Link key={loc.id} href={buildFilterHref({ locationId: loc.id })} data-active={allowedLocationId === loc.id}>
                {loc.name}
              </Link>
            ))}
          </div>
        </div>

        {/* Review list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 11, marginTop: "var(--gutter)" }}>
          {reviews.length === 0 ? (
            <div
              className="card"
              style={{ padding: "34px 20px", textAlign: "center", border: "1px dashed var(--ink-300)", background: "var(--ink-50)", boxShadow: "none" }}
            >
              <p style={{ fontSize: 14, fontWeight: 620, color: "var(--ink-800)", marginBottom: 4 }}>No reviews yet</p>
              <p style={{ fontSize: 13, color: "var(--ink-500)" }}>Sync Google or collect direct feedback to start populating the inbox.</p>
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
