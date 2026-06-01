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

type VideoTestimonialItem = {
  id: string;
  submitterName: string;
  videoUrl: string;
  durationSeconds?: number | null;
  publishedAt?: string | null;
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
  // Layout controls
  showNav?: boolean;
  showPagination?: boolean;
  showBranding?: boolean;
  widgetTitle?: string;
  videoTestimonials?: VideoTestimonialItem[];
  contentType?: string;
  aiReviewSummary?: string | null;
  aiReviewSummaryReviewCount?: number | null;
};

const FONT_STACKS: Record<string, string> = {
  system:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  sans: "Inter, ui-sans-serif, system-ui, sans-serif",
  serif: "Georgia, 'Times New Roman', serif",
};

function fontStack(family: string) {
  return FONT_STACKS[family] || FONT_STACKS.system;
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
  avgRating?: number | null;
  reviewCount: number;
  showAvgRating?: boolean;
  showReviewCount?: boolean;
  headerAlign?: string;
  starColor: string;
  textColor: string;
  mutedColor: string;
}) {
  if (!showAvgRating && !showReviewCount) return null;

  return (
    <div style={{ textAlign: (headerAlign as "left" | "center" | undefined) || "left" }}>
      {showAvgRating && (
        <>
          <div className="mb-3 mt-0 flex items-center gap-2" style={{ justifyContent: headerAlign === "center" ? "center" : "flex-start" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <text x="2" y="18" fontSize="14" fontWeight="bold" fill="#1f2937">G</text>
            </svg>
            <p className="text-sm font-bold" style={{ color: textColor, margin: 0 }}>
              Google Reviews
            </p>
          </div>
          <p className="mb-3 mt-0 flex flex-row items-center gap-2" style={{ justifyContent: headerAlign === "center" ? "center" : "flex-start" }}>
            <span style={{ fontSize: "1.5em", fontWeight: "bold" }}>{avgRating?.toFixed(1) || "0"}</span>
            <span style={{ color: starColor }}>{'★'.repeat(Math.round(avgRating || 0))}</span>
            {showReviewCount && <span style={{ color: mutedColor }}>({reviewCount})</span>}
          </p>
        </>
      )}
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
  const truncatedBody = review.body.length > bodyMaxChars ? `${review.body.substring(0, bodyMaxChars)}...` : review.body;
  const reviewDate = review.reviewedAt ? new Date(review.reviewedAt).toLocaleDateString() : null;

  return (
    <div className="rounded-2xl border border-slate-200 p-4">
      {showRating && (
        <p className="mb-2 mt-0 flex gap-1">
          {[...Array(5)].map((_, i) => (
            <span key={i} style={{ color: i < Math.round(review.rating) ? starColor : mutedColor }}>
              ★
            </span>
          ))}
        </p>
      )}

      <p className="mb-2 mt-0 text-sm" style={{ color: textColor }}>
        {truncatedBody}
      </p>

      <div className="flex flex-col gap-2 text-xs" style={{ color: mutedColor }}>
        {showReviewerName && review.reviewerName && (
          <p className="m-0 flex gap-2">
            {review.reviewerPhotoUrl && <img src={review.reviewerPhotoUrl} className="h-6 w-6 rounded-full object-cover" alt="" />}
            <span>{review.reviewerName}</span>
          </p>
        )}
        {showDate && reviewDate && <p className="m-0">{reviewDate}</p>}
      </div>

      {showResponses && review.sourceReplyText && (
        <div className="mt-2 rounded-lg bg-slate-50 p-2 text-xs" style={{ color: mutedColor }}>
          <p className="m-0 font-semibold">Owner response</p>
          <p className="m-0 mt-1">{review.sourceReplyText}</p>
        </div>
      )}
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
  avgRating?: number | null;
  reviewCount: number;
  reviewLink?: string | null;
  starColor: string;
  textColor: string;
  mutedColor: string;
  primaryColor: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-300 p-4 text-center">
      <p className="mb-2 text-sm font-semibold" style={{ color: textColor }}>
        {businessName}
      </p>
      <p className="mb-3 flex items-center justify-center gap-2">
        <span style={{ fontSize: "1.25em" }}>{avgRating?.toFixed(1) || "0"}</span>
        <span style={{ color: starColor }}>{'★'.repeat(Math.round(avgRating || 0))}</span>
        <span style={{ color: mutedColor, fontSize: "0.875em" }}>({reviewCount})</span>
      </p>
      {reviewLink && (
        <a href={reviewLink} target="_blank" rel="noreferrer" className="text-xs font-semibold" style={{ color: primaryColor }}>
          Write a review
        </a>
      )}
    </div>
  );
}

function SliderLayout({ children, showNav = true }: { children: React.ReactNode[]; showNav?: boolean }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (scrollRef.current) {
      setCanScrollLeft(scrollRef.current.scrollLeft > 0);
      setCanScrollRight(scrollRef.current.scrollLeft < scrollRef.current.scrollWidth - scrollRef.current.clientWidth);
    }
  };

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const amount = 300;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -amount : amount,
        behavior: "smooth",
      });
      setTimeout(checkScroll, 100);
    }
  };

  return (
    <div className="relative">
      <div ref={scrollRef} className="flex gap-3 overflow-x-auto scrollbar-hide" onScroll={checkScroll}>
        {children}
      </div>
      {showNav && canScrollLeft && (
        <button onClick={() => scroll("left")} className="absolute left-0 top-1/2 -translate-y-1/2 z-10 rounded-full bg-slate-900 p-2 text-white hover:bg-slate-800">
          ←
        </button>
      )}
      {showNav && canScrollRight && (
        <button onClick={() => scroll("right")} className="absolute right-0 top-1/2 -translate-y-1/2 z-10 rounded-full bg-slate-900 p-2 text-white hover:bg-slate-800">
          →
        </button>
      )}
    </div>
  );
}

function CarouselLayout({ cards, showNav = true, showPagination = true }: { cards: React.ReactNode[]; showNav?: boolean; showPagination?: boolean }) {
  const [index, setIndex] = useState(0);
  if (cards.length === 0) return null;

  const goToPrevious = () => setIndex((i) => (i - 1 + cards.length) % cards.length);
  const goToNext = () => setIndex((i) => (i + 1) % cards.length);

  return (
    <div>
      <div className="relative flex items-center justify-center gap-4 min-h-[280px]">
        {showNav && (
          <button onClick={goToPrevious} className="absolute left-0 z-10 p-2 rounded-full hover:bg-slate-200 transition text-lg">
            ←
          </button>
        )}
        <div className="flex-1 flex justify-center">
          {cards[index]}
        </div>
        {showNav && (
          <button onClick={goToNext} className="absolute right-0 z-10 p-2 rounded-full hover:bg-slate-200 transition text-lg">
            →
          </button>
        )}
      </div>
      {showPagination && (
        <div className="flex justify-center gap-2 mt-4">
          {cards.map((_, i) => (
            <button key={i} onClick={() => setIndex(i)} className={`w-2 h-2 rounded-full transition ${i === index ? "bg-slate-900" : "bg-slate-300"}`} />
          ))}
        </div>
      )}
    </div>
  );
}

function VideoLayout({
  videos,
  primaryColor,
  textColor,
  mutedColor,
  showNav = true,
  showPagination = true,
}: {
  videos: VideoTestimonialItem[];
  primaryColor: string;
  textColor: string;
  mutedColor: string;
  showNav?: boolean;
  showPagination?: boolean;
}) {
  const [index, setIndex] = useState(0);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  if (videos.length === 0) return null;

  const current = videos[index];
  const goToPrevious = () => setIndex((i) => (i - 1 + videos.length) % videos.length);
  const goToNext = () => setIndex((i) => (i + 1) % videos.length);

  const formatDuration = (seconds: number | null | undefined): string | null => {
    if (!seconds) return null;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <>
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={() => setLightboxUrl(null)}
        >
          <video
            src={lightboxUrl}
            controls
            autoPlay
            className="max-h-[80vh] max-w-3xl rounded-xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setLightboxUrl(null)}
            className="absolute right-4 top-4 text-2xl text-white"
          >
            ✕
          </button>
        </div>
      )}
      <div className="relative">
        {showNav && videos.length > 1 && (
          <button
            onClick={goToPrevious}
            className="absolute left-0 top-1/2 z-10 -translate-x-3 -translate-y-1/2 rounded-full bg-slate-900 p-2 text-sm text-white hover:bg-slate-800"
          >
            ←
          </button>
        )}
        <div
          className="relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-800 to-slate-900"
          style={{ aspectRatio: "16/9", cursor: current.videoUrl ? "pointer" : "default" }}
          onClick={() => (current.videoUrl ? setLightboxUrl(current.videoUrl) : undefined)}
        >
          {current.videoUrl ? (
            <video
              key={current.videoUrl}
              src={`${current.videoUrl}#t=0.1`}
              className="h-full w-full object-cover"
              muted
              preload="metadata"
            />
          ) : null}
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-full opacity-90 transition hover:opacity-100"
              style={{ backgroundColor: primaryColor }}
            >
              <span className="ml-0.5 text-xl text-white">▶</span>
            </div>
          </div>
          {formatDuration(current.durationSeconds) && (
            <span className="absolute bottom-2 right-2 rounded bg-black/60 px-1.5 py-0.5 text-xs text-white">
              {formatDuration(current.durationSeconds)}
            </span>
          )}
        </div>
        {showNav && videos.length > 1 && (
          <button
            onClick={goToNext}
            className="absolute right-0 top-1/2 z-10 translate-x-3 -translate-y-1/2 rounded-full bg-slate-900 p-2 text-sm text-white hover:bg-slate-800"
          >
            →
          </button>
        )}
      </div>
      <p className="mt-3 text-sm font-semibold" style={{ color: textColor }}>
        {current.submitterName}
      </p>
      {showPagination && videos.length > 1 && (
        <div className="mt-3 flex justify-center gap-2">
          {videos.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={`h-2 w-2 rounded-full transition ${i === index ? "bg-slate-900" : "bg-slate-300"}`}
            />
          ))}
        </div>
      )}
    </>
  );
}

export function ReviewWidgetPreview({
  businessName,
  avgRating,
  reviewCount,
  reviews,
  layout = "grid",
  showHeader = true,
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
  showNav = true,
  showPagination = true,
  showBranding = true,
  widgetTitle,
  videoTestimonials,
  contentType,
  aiReviewSummary,
  aiReviewSummaryReviewCount,
}: ReviewWidgetPreviewProps) {
  const mutedColor = "#475569";
  const safeLayout = ["grid", "list", "slider", "badge", "carousel", "masonry", "video"].includes(layout) ? layout : "grid";
  const safeVideos = videoTestimonials ?? [];
  const hasVideos = safeVideos.length > 0;
  const isVideoOnly = safeLayout === "video" || contentType === "VIDEO";
  const isMixed = contentType === "MIXED" && !isVideoOnly;

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
        {widgetTitle && (
          <h2 className="text-lg font-bold mb-4" style={{ color: textColor }}>
            {widgetTitle}
          </h2>
        )}

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

        {aiReviewSummary && (
          <div style={{ background: "#eef2ff", border: "1px solid #c7d2fe", borderRadius: 10, padding: "10px 12px", marginTop: 10, textAlign: "left" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <p style={{ margin: 0, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "#4f46e5" }}>✦ AI Summary</p>
              {aiReviewSummaryReviewCount && (
                <p style={{ margin: 0, fontSize: 10, color: "#a5b4fc" }}>Based on {aiReviewSummaryReviewCount} reviews</p>
              )}
            </div>
            <p style={{ margin: 0, color: "#3730a3", fontSize: 12, lineHeight: 1.6 }}>{aiReviewSummary}</p>
          </div>
        )}

        {isVideoOnly ? (
          hasVideos ? (
            <VideoLayout videos={safeVideos} primaryColor={primaryColor} textColor={textColor} mutedColor={mutedColor} showNav={showNav} showPagination={showPagination} />
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm" style={{ color: mutedColor }}>
              No published video testimonials match this widget yet.
            </div>
          )
        ) : isMixed ? (
          <div className="space-y-6">
            {hasVideos && (
              <VideoLayout videos={safeVideos} primaryColor={primaryColor} textColor={textColor} mutedColor={mutedColor} showNav={showNav} showPagination={showPagination} />
            )}
            {reviews.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">{cards}</div>
            ) : null}
          </div>
        ) : reviews.length === 0 ? (
          emptyState
        ) : safeLayout === "carousel" ? (
          <CarouselLayout cards={cards} showNav={showNav} showPagination={showPagination} />
        ) : safeLayout === "masonry" ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 auto-rows-max">
            {cards}
          </div>
        ) : safeLayout === "list" ? (
          <div className="flex flex-col gap-3">{cards}</div>
        ) : safeLayout === "slider" ? (
          <SliderLayout showNav={showNav}>{cards}</SliderLayout>
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

        {showBranding && (
          <div className={`mt-4 pt-4 border-t ${`border-opacity-20`}`} style={{ borderColor: primaryColor }}>
            <a
              href="https://wehearyou.app"
              target="_blank"
              rel="noreferrer"
              className="text-xs font-semibold opacity-60 hover:opacity-100 transition"
              style={{ color: textColor }}
            >
              Powered by WeHearYou
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
