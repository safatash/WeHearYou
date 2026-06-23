"use client";

import { useState } from "react";
import type { ReviewSource } from "./source-badge";
import { SourceBadge } from "./source-badge";

export interface ReviewCardProps {
  id: string;
  reviewerName: string;
  reviewerInitials?: string;
  reviewerPhotoUrl?: string | null;
  rating: number;
  source?: ReviewSource | string | null;
  dateLabel?: string | null;
  body?: string | null;
  featured?: boolean;
  videoUrl?: string | null;
  ownerReply?: string | null;
  sourceReviewUrl?: string | null;
}

export interface FeaturedReviewsProps {
  reviews: ReviewCardProps[];
  showSourceFilter?: boolean;
  /** How many reviews to show before the "Show more" button. */
  perPage?: number;
}

function StarRating({ rating }: { rating: number }) {
  const filled = Math.round(rating);
  return (
    <span style={{ color: "var(--star)" }} className="text-sm">
      {"★".repeat(filled)}{"☆".repeat(5 - filled)}
    </span>
  );
}

function ReviewerAvatar({
  name,
  initials,
  photoUrl,
}: {
  name: string;
  initials?: string;
  photoUrl?: string | null;
}) {
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name}
        className="h-10 w-10 shrink-0 rounded-full object-cover"
      />
    );
  }
  const derivedInitials =
    initials ||
    name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() ||
    "?";

  const palettes = [
    { bg: "var(--accent-soft)", color: "var(--accent-strong)" },
    { bg: "#d1fae5", color: "#065f46" },
    { bg: "#fef3c7", color: "#92400e" },
    { bg: "#fee2e2", color: "#991b1b" },
    { bg: "#e0e7ff", color: "#3730a3" },
  ];
  const palette = palettes[name.charCodeAt(0) % palettes.length];
  return (
    <div
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
      style={{ background: palette.bg, color: palette.color }}
    >
      {derivedInitials}
    </div>
  );
}

export function FeaturedReviews({ reviews, showSourceFilter = false, perPage = 12 }: FeaturedReviewsProps) {
  const step = Math.max(1, perPage);
  const [visibleCount, setVisibleCount] = useState(step);

  if (reviews.length === 0) return null;

  // Collect unique sources for the optional filter chips
  const uniqueSources = showSourceFilter
    ? Array.from(new Set(reviews.map((r) => r.source).filter(Boolean) as string[]))
    : [];

  const visibleReviews = reviews.slice(0, visibleCount);
  const hasMore = visibleCount < reviews.length;

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-semibold" style={{ color: "var(--ink-950)" }}>
          Reviews{" "}
          <span style={{ color: "var(--ink-400)" }}>({reviews.length})</span>
        </h2>
      </div>

      {/* Source filter chips */}
      {uniqueSources.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {uniqueSources.map((src) => (
            <SourceBadge key={src} source={src} />
          ))}
        </div>
      )}

      <div className="space-y-4">
        {visibleReviews.map((review) => (
          <article
            key={review.id}
            className="rounded-3xl border p-5 shadow-sm"
            style={{ borderColor: "var(--ink-200)", background: "var(--white)" }}
          >
            <div className="flex items-start gap-3">
              <ReviewerAvatar
                name={review.reviewerName}
                initials={review.reviewerInitials}
                photoUrl={review.reviewerPhotoUrl}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold" style={{ color: "var(--ink-900)" }}>
                        {review.reviewerName}
                      </p>
                      {review.featured && (
                        <span
                          className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold"
                          style={{ background: "var(--accent-soft)", color: "var(--accent-strong)" }}
                        >
                          Featured
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-2">
                      <StarRating rating={review.rating} />
                      {review.source && (
                        <span className="text-xs" style={{ color: "var(--ink-400)" }}>
                          {review.source}
                        </span>
                      )}
                    </div>
                  </div>
                  {review.dateLabel && (
                    <p className="shrink-0 text-xs" style={{ color: "var(--ink-400)" }}>
                      {review.dateLabel}
                    </p>
                  )}
                </div>

                {review.body && (
                  <p className="mt-3 text-sm leading-7" style={{ color: "var(--ink-600)" }}>
                    {review.body}
                  </p>
                )}

                {review.videoUrl && (
                  <div className="mt-3 overflow-hidden rounded-2xl">
                    <video
                      src={review.videoUrl}
                      controls
                      className="w-full rounded-2xl"
                      style={{ maxHeight: "240px" }}
                    />
                  </div>
                )}

                {review.sourceReviewUrl && (
                  <a
                    href={review.sourceReviewUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-block text-xs font-semibold hover:underline"
                    style={{ color: "var(--accent)" }}
                  >
                    View original →
                  </a>
                )}

                {review.ownerReply && (
                  <div
                    className="mt-4 rounded-2xl border px-4 py-3"
                    style={{ background: "var(--ink-50)", borderColor: "var(--ink-100)" }}
                  >
                    <p className="mb-1 text-xs font-semibold" style={{ color: "var(--ink-500)" }}>
                      Response from the owner
                    </p>
                    <p className="text-sm leading-7" style={{ color: "var(--ink-700)" }}>
                      {review.ownerReply}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>

      {hasMore && (
        <div className="flex flex-col items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => setVisibleCount((v) => v + step)}
            className="w-full rounded-2xl border px-5 py-3 text-sm font-semibold transition-colors sm:w-auto"
            style={{ borderColor: "var(--accent)", color: "var(--accent-strong)", background: "var(--accent-soft)" }}
          >
            Show more reviews
          </button>
          <p className="text-xs" style={{ color: "var(--ink-400)" }}>
            Showing {visibleReviews.length} of {reviews.length}
          </p>
        </div>
      )}
    </section>
  );
}
