"use client";

import { useRef, useState } from "react";

type ReviewItem = {
  id: string;
  reviewerName: string;
  reviewerPhotoUrl?: string | null;
  sourceReviewUrl?: string | null;
  sourceReplyText?: string | null;
  rating: number;
  body: string;
  reviewedAt?: string | null;
};

type ReviewWidgetPreviewProps = {
  businessName: string;
  avgRating?: number | null;
  reviewCount: number;
  reviews: ReviewItem[];
  // Layout
  layout?: string;
  // Header panel
  showHeader: boolean;
  showAvgRating?: boolean;
  showReviewCount?: boolean;
  headerAlign?: string;
  // Reviews panel
  showRating: boolean;
  showReviewerName: boolean;
  showDate: boolean;
  showWriteReview: boolean;
  showResponses?: boolean;
  bodyMaxChars?: number;
  // Appearance
  primaryColor?: string;
  starColor?: string;
  backgroundColor?: string;
  textColor?: string;
  fontFamily?: string;
  reviewLink?: string | null;
};

const FONT_STACKS: Record<string, string> = {
  system:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  sans: "Inter, ui-sans-serif, system-ui, sans-serif",
  serif: "Georgia, 'Times New Roman', serif",
};

function fontStack(fontFamily?: string) {
  if (!fontFamily) return FONT_STACKS.system;
  return FONT_STACKS[fontFamily] ?? FONT_STACKS.system;
}

function stars(rating: number) {
  return "★".repeat(Math.max(0, Math.min(5, rating))) + "☆".repeat(Math.max(0, 5 - rating));
}

function formatDate(value?: string | null) {
  if (!value) return "";
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return "";
  }
}

function truncate(body: string, maxChars: number) {
  if (maxChars <= 0 || body.length <= maxChars) return body;
  const cut = body.slice(0, maxChars).trimEnd();
  return cut.endsWith(".") ? `${cut}..` : `${cut}…`;
}

function ReviewHeader({
  businessName,
  avgRating,
  reviewCount,
  showAvgRating,
  showReviewCount,
  headerAlign,
  starColor,
  textColor,
  mutedColor,
}: {
  businessName: string;
  avgRating: number | null | undefined;
  reviewCount: number;
  showAvgRating: boolean;
  showReviewCount: boolean;
  headerAlign: string;
  starColor: string;
  textColor: string;
  mutedColor: string;
}) {
  const align =
    headerAlign === "center" ? "items-center text-center" : "items-start text-left";
  const ratingNum = typeof avgRating === "number" ? avgRating.toFixed(1) : null;

  return (
    <div className={`mb-4 flex flex-col gap-1 ${align}`}>
      <p className="text-xl font-semibold" style={{ color: textColor }}>
        {businessName}
      </p>
      <div className="flex flex-wrap items-center gap-2 text-sm" style={{ color: mutedColor }}>
        {showAvgRating && ratingNum ? (
          <span className="flex items-center gap-1">
            <span style={{ color: starColor }}>{stars(Math.round(avgRating ?? 0))}</span>
            <span style={{ color: textColor }} className="font-semibold">
              {ratingNum}
            </span>
          </span>
        ) : null}
        {showReviewCount && reviewCount > 0 ? (
          <span>
            Based on {reviewCount} review{reviewCount === 1 ? "" : "s"}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function ReviewCard({
  review,
  showRating,
  showReviewerName,
  showDate,
  showResponses,
  bodyMaxChars,
  starColor,
  textColor,
  mutedColor,
  primaryColor,
}: {
  review: ReviewItem;
  showRating: boolean;
  showReviewerName: boolean;
  showDate: boolean;
  showResponses: boolean;
  bodyMaxChars: number;
  starColor: string;
  textColor: string;
  mutedColor: string;
  primaryColor: string;
}) {
  const body = truncate(review.body, bodyMaxChars);

  return (
    <article
      className="flex h-full flex-col gap-2 rounded-2xl border p-4"
      style={{ borderColor: "rgba(0,0,0,0.08)", color: textColor }}
    >
      {showRating ? (
        <div className="text-sm" style={{ color: starColor }}>
          {stars(review.rating)}
        </div>
      ) : null}
      {showReviewerName ? (
        <div className="flex items-center gap-3">
          {review.reviewerPhotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={review.reviewerPhotoUrl}
              alt={review.reviewerName}
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-600">
              {review.reviewerName.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="font-semibold" style={{ color: textColor }}>
            {review.reviewerName}
          </div>
        </div>
      ) : null}
      <div className="text-sm leading-6" style={{ color: mutedColor }}>
        {body}
      </div>
      {showResponses && review.sourceReplyText ? (
        <div
          className="mt-2 rounded-2xl bg-black/5 p-3 text-xs leading-5"
          style={{ color: mutedColor }}
        >
          <span className="font-semibold" style={{ color: textColor }}>
            Owner reply:
          </span>{" "}
          {review.sourceReplyText}
        </div>
      ) : null}
      <div className="mt-auto flex items-center justify-between gap-3 pt-2">
        {showDate && review.reviewedAt ? (
          <div className="text-xs" style={{ color: mutedColor }}>
            {formatDate(review.reviewedAt)}
          </div>
        ) : (
          <div />
        )}
        {review.sourceReviewUrl ? (
          <a
            href={review.sourceReviewUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-semibold"
            style={{ color: primaryColor }}
          >
            View on Google
          </a>
        ) : null}
      </div>
    </article>
  );
}

function SliderLayout({ children }: { children: React.ReactNode[] }) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [index, setIndex] = useState(0);
  const count = children.length;

  function scrollTo(i: number) {
    const target = Math.max(0, Math.min(count - 1, i));
    setIndex(target);
    const track = trackRef.current;
    if (!track) return;
    const card = track.children[target] as HTMLElement | undefined;
    if (card) {
      track.scrollTo({ left: card.offsetLeft, behavior: "smooth" });
    }
  }

  return (
    <div className="space-y-3 overflow-hidden">
      <div
        ref={trackRef}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2"
        style={{ scrollbarWidth: "thin" }}
      >
        {children.map((child, i) => (
          <div key={i} className="min-w-[80%] snap-start sm:min-w-[55%] md:min-w-[40%]">
            {child}
          </div>
        ))}
      </div>
      {count > 1 ? (
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => scrollTo(index - 1)}
            disabled={index === 0}
            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 disabled:opacity-40"
          >
            ‹
          </button>
          <span className="text-xs text-slate-500">
            {Math.min(index + 1, count)} / {count}
          </span>
          <button
            type="button"
            onClick={() => scrollTo(index + 1)}
            disabled={index >= count - 1}
            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 disabled:opacity-40"
          >
            ›
          </button>
        </div>
      ) : null}
    </div>
  );
}

function BadgeLayout({
  businessName,
  avgRating,
  reviewCount,
  reviewLink,
  starColor,
  textColor,
  mutedColor,
  primaryColor,
}: {
  businessName: string;
  avgRating: number | null | undefined;
  reviewCount: number;
  reviewLink?: string | null;
  starColor: string;
  textColor: string;
  mutedColor: string;
  primaryColor: string;
}) {
  const ratingNum = typeof avgRating === "number" ? avgRating.toFixed(1) : null;

  const inner = (
    <div className="inline-flex items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-2 shadow-sm">
      <span className="text-lg font-bold" style={{ color: textColor }}>
        {ratingNum ?? "—"}
      </span>
      <span style={{ color: starColor }} className="text-base">
        {stars(Math.round(avgRating ?? 0))}
      </span>
      <span className="text-xs" style={{ color: mutedColor }}>
        <span className="font-semibold" style={{ color: textColor }}>
          {businessName}
        </span>
        {reviewCount > 0 ? (
          <>
            {" · "}
            {reviewCount} review{reviewCount === 1 ? "" : "s"}
          </>
        ) : null}
      </span>
    </div>
  );

  if (reviewLink) {
    return (
      <a
        href={reviewLink}
        target="_blank"
        rel="noreferrer"
        className="no-underline"
        style={{ color: primaryColor }}
      >
        {inner}
      </a>
    );
  }

  return inner;
}

export function ReviewWidgetPreview({
  businessName,
  avgRating,
  reviewCount,
  reviews,
  layout = "grid",
  showHeader,
  showAvgRating = true,
  showReviewCount = true,
  headerAlign = "left",
  showRating,
  showReviewerName,
  showDate,
  showWriteReview,
  showResponses = false,
  bodyMaxChars = 280,
  primaryColor = "#4338ca",
  starColor = "#f59e0b",
  backgroundColor = "#ffffff",
  textColor = "#0f172a",
  fontFamily = "system",
  reviewLink,
}: ReviewWidgetPreviewProps) {
  const mutedColor = "#475569";
  const safeLayout = ["grid", "list", "slider", "badge"].includes(layout) ? layout : "grid";

  if (safeLayout === "badge") {
    return (
      <div
        className="rounded-3xl border border-slate-200 bg-slate-50 p-6"
        style={{ fontFamily: fontStack(fontFamily) }}
      >
        <BadgeLayout
          businessName={businessName}
          avgRating={avgRating}
          reviewCount={reviewCount}
          reviewLink={reviewLink}
          starColor={starColor}
          textColor={textColor}
          mutedColor={mutedColor}
          primaryColor={primaryColor}
        />
      </div>
    );
  }

  const cards = reviews.map((review) => (
    <ReviewCard
      key={review.id}
      review={review}
      showRating={showRating}
      showReviewerName={showReviewerName}
      showDate={showDate}
      showResponses={showResponses}
      bodyMaxChars={bodyMaxChars}
      starColor={starColor}
      textColor={textColor}
      mutedColor={mutedColor}
      primaryColor={primaryColor}
    />
  ));

  const emptyState = (
    <div
      className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm"
      style={{ color: mutedColor }}
    >
      No published Google reviews match this widget yet.
    </div>
  );

  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
      <div
        className="rounded-3xl border p-6 shadow-sm"
        style={{
          backgroundColor,
          color: textColor,
          fontFamily: fontStack(fontFamily),
          borderColor: "rgba(0,0,0,0.08)",
        }}
      >
        {showHeader ? (
          <ReviewHeader
            businessName={businessName}
            avgRating={avgRating}
            reviewCount={reviewCount}
            showAvgRating={showAvgRating}
            showReviewCount={showReviewCount}
            headerAlign={headerAlign}
            starColor={starColor}
            textColor={textColor}
            mutedColor={mutedColor}
          />
        ) : null}

        {reviews.length === 0 ? (
          emptyState
        ) : safeLayout === "list" ? (
          <div className="flex flex-col gap-3">{cards}</div>
        ) : safeLayout === "slider" ? (
          <SliderLayout>{cards}</SliderLayout>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">{cards}</div>
        )}

        {showWriteReview && reviewLink ? (
          <div className={`mt-5 ${headerAlign === "center" ? "text-center" : ""}`}>
            <a
              href={reviewLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex rounded-2xl text-sm font-semibold"
              style={{ color: primaryColor }}
            >
              Write a review
            </a>
          </div>
        ) : null}
      </div>
    </div>
  );
}
