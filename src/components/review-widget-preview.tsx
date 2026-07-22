"use client";

import { useRef, useState } from "react";
import { getThumbnailUrl, getThumbnailAlt } from "@/lib/thumbnail-utils";

type ReviewItem = {
  id: string;
  reviewerName: string;
  reviewerPhotoUrl?: string | null;
  sourceReviewUrl?: string | null;
  sourceReplyText?: string | null;
  rating: number;
  body: string;
  reviewedAt?: string | null;
  source?: string | null; // "GOOGLE" | "FACEBOOK" | "YELP" | "INTERNAL"
};

type VideoTestimonialItem = {
  id: string;
  submitterName: string;
  videoUrl: string;
  durationSeconds?: number | null;
  publishedAt?: string | null;
  customThumbnailUrl?: string | null;
  capturedFrameUrl?: string | null;
  thumbnailSource: "DEFAULT" | "CUSTOM" | "CAPTURED";
};

type ReviewWidgetPreviewProps = {
  businessName: string;
  avgRating?: number | null;
  reviewCount: number;
  reviews: ReviewItem[];
  layout?: string;
  showHeader: boolean;
  showAvgRating?: boolean;
  showReviewCount?: boolean;
  headerAlign?: string;
  showRating: boolean;
  showReviewerName: boolean;
  showDate: boolean;
  showWriteReview: boolean;
  showResponses?: boolean;
  showSourceLogo?: boolean;
  bodyMaxChars?: number;
  primaryColor?: string;
  starColor?: string;
  backgroundColor?: string;
  textColor?: string;
  fontFamily?: string;
  reviewLink?: string | null;
  showNav?: boolean;
  showPagination?: boolean;
  showBranding?: boolean;
  widgetTitle?: string;
  videoTestimonials?: VideoTestimonialItem[];
  contentType?: string;
  widgetType?: string | null;
  aiReviewSummary?: string | null;
  aiReviewSummaryReviewCount?: number | null;
  showAiSummary?: boolean;
  isMobile?: boolean;
  singleItemUnavailable?: boolean;
  badgeStyle?: string | null;
  // Collecting Widget
  collectPosition?: string | null;
  collectButtonColor?: string | null;
  collectButtonTheme?: string | null;
  collectMobileBehavior?: string | null;
  // Floating Widget
  floatingCardStyle?: string | null;
  floatingVariation?: string | null;
  floatingPosition?: string | null;
  floatingAccentColor?: string | null;
  // Typography customization
  fontSizeBase?: number;
  fontSizeNames?: number;
  fontSizeHeader?: number;
  fontSizeLabel?: number;
  fontSizeSummary?: number;
};

const FONT_STACKS: Record<string, string> = {
  system: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  sans: "Inter, ui-sans-serif, system-ui, sans-serif",
  serif: "Georgia, 'Times New Roman', serif",
};

function fontStack(family: string) {
  return FONT_STACKS[family] || FONT_STACKS.system;
}

// ─── Source Logo ──────────────────────────────────────────────────────────────

function SourceMark({
  source,
  showSourceLogo,
  mutedColor,
}: {
  source?: string | null;
  showSourceLogo: boolean;
  mutedColor: string;
}) {
  if (!showSourceLogo || !source) return null;
  if (source === "GOOGLE") {
    return (
      <span className="inline-flex items-center gap-1" style={{ color: mutedColor, fontSize: 9 }}>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden>
          <text x="1" y="17" fontSize="14" fontWeight="bold" fill="#4285f4">G</text>
        </svg>
        Google Review
      </span>
    );
  }
  if (source === "INTERNAL") {
    return (
      <span className="inline-flex items-center gap-1" style={{ color: mutedColor, fontSize: 9 }}>
        <span style={{ fontWeight: 700, color: "#6366f1" }}>W</span>
        WeHearYou Review
      </span>
    );
  }
  return <span style={{ color: mutedColor, fontSize: 9 }}>{source} Review</span>;
}

// ─── Review Header ────────────────────────────────────────────────────────────

function ReviewHeader({
  avgRating,
  reviewCount,
  showAvgRating,
  showReviewCount,
  headerAlign,
  starColor,
  textColor,
  mutedColor,
  fontSizeHeader = 36,
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
  fontSizeHeader?: number;
}) {
  if (!showAvgRating && !showReviewCount) return null;
  const align = headerAlign === "center" ? "center" : "flex-start";
  return (
    <div style={{ textAlign: (headerAlign as "left" | "center" | undefined) || "left" }}>
      {showAvgRating && (
        <>
          <p className="mb-3 mt-0 flex flex-row items-center gap-2" style={{ justifyContent: align }}>
            <span style={{ fontSize: `${fontSizeHeader}px`, fontWeight: "bold" }}>{avgRating?.toFixed(1) || "0"}</span>
            <span style={{ color: starColor }}>{"★".repeat(Math.round(avgRating || 0))}</span>
            {showReviewCount && <span style={{ color: mutedColor }}>({reviewCount})</span>}
          </p>
        </>
      )}
    </div>
  );
}

// ─── Review Card ──────────────────────────────────────────────────────────────

function ReviewCard({
  review,
  showRating,
  showReviewerName,
  showDate,
  showResponses,
  showSourceLogo,
  bodyMaxChars,
  starColor,
  textColor,
  mutedColor,
  primaryColor,
  fontSizeBase = 14,
  fontSizeNames = 13,
  fontSizeLabel = 12,
}: {
  review: ReviewItem;
  showRating: boolean;
  showReviewerName: boolean;
  showDate: boolean;
  showResponses: boolean;
  showSourceLogo: boolean;
  bodyMaxChars: number;
  starColor: string;
  textColor: string;
  mutedColor: string;
  primaryColor: string;
  fontSizeBase?: number;
  fontSizeNames?: number;
  fontSizeLabel?: number;
}) {
  const truncatedBody =
    review.body.length > bodyMaxChars ? `${review.body.substring(0, bodyMaxChars)}...` : review.body;
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
      <p className="mb-2 mt-0 text-sm" style={{ color: textColor, fontSize: `${fontSizeBase}px` }}>
        {truncatedBody}
      </p>
      <div className="flex flex-col gap-1 text-xs" style={{ color: mutedColor }}>
        {showReviewerName && (
          <div className="flex items-center gap-2">
            {review.reviewerPhotoUrl ? (
              <img src={review.reviewerPhotoUrl} className="h-8 w-8 rounded-full object-cover" alt="" />
            ) : (
              <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                {(review.reviewerName || '?').slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="flex flex-col gap-0.5">
              <span className="font-semibold text-sm" style={{ fontSize: `${fontSizeNames}px` }}>{review.reviewerName}</span>
              {showDate && reviewDate && <span style={{ fontSize: `${fontSizeLabel}px` }}>{reviewDate}</span>}
            </div>
          </div>
        )}
        <SourceMark source={review.source} showSourceLogo={showSourceLogo} mutedColor={mutedColor} />
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

// ─── Video Card ───────────────────────────────────────────────────────────────

function VideoCard({
  video,
  primaryColor,
  textColor,
  mutedColor,
  showSourceLogo,
  onPlay,
}: {
  video: VideoTestimonialItem;
  primaryColor: string;
  textColor: string;
  mutedColor: string;
  showSourceLogo: boolean;
  onPlay: (url: string) => void;
}) {
  const formatDuration = (s: number | null | undefined) => {
    if (!s) return null;
    return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
  };

  const thumbnailUrl = getThumbnailUrl({
    customThumbnailUrl: video.customThumbnailUrl,
    capturedFrameUrl: video.capturedFrameUrl,
    videoUrl: video.videoUrl,
    thumbnailSource: video.thumbnailSource,
  });

  return (
    <div className="rounded-xl overflow-hidden border border-slate-200">
      <div
        className="relative overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 cursor-pointer"
        style={{ aspectRatio: "16/9" }}
        onClick={() => video.videoUrl && onPlay(video.videoUrl)}
      >
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={getThumbnailAlt(video.submitterName)}
            className="h-full w-full object-cover"
          />
        ) : (
          video.videoUrl && (
            <video
              src={`${video.videoUrl}#t=0.1`}
              className="h-full w-full object-cover"
              muted
              preload="metadata"
            />
          )
        )}
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-full opacity-90"
            style={{ backgroundColor: primaryColor }}
          >
            <span className="ml-0.5 text-lg text-white">▶</span>
          </div>
        </div>
        {formatDuration(video.durationSeconds) && (
          <span className="absolute bottom-2 right-2 rounded bg-black/60 px-1.5 py-0.5 text-xs text-white">
            {formatDuration(video.durationSeconds)}
          </span>
        )}
      </div>
      <div className="p-3">
        <p className="text-sm font-semibold" style={{ color: textColor }}>
          {video.submitterName}
        </p>
        {showSourceLogo && (
          <span
            className="inline-flex items-center gap-1 mt-1"
            style={{ color: mutedColor, fontSize: 9 }}
          >
            <span>📹</span> Video Testimonial
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Single Text Preview ──────────────────────────────────────────────────────

function SingleTextPreview({
  review,
  showRating,
  showReviewerName,
  showDate,
  showSourceLogo,
  starColor,
  textColor,
  mutedColor,
  bodyMaxChars,
  fontSizeBase = 14,
}: {
  review: ReviewItem | undefined;
  showRating: boolean;
  showReviewerName: boolean;
  showDate: boolean;
  showSourceLogo: boolean;
  starColor: string;
  textColor: string;
  mutedColor: string;
  bodyMaxChars: number;
  fontSizeBase?: number;
}) {
  if (!review) {
    return (
      <div
        className="rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center text-sm"
        style={{ color: mutedColor }}
      >
        Select a review from the left panel to preview it here.
      </div>
    );
  }
  const truncated =
    review.body.length > bodyMaxChars ? `${review.body.substring(0, bodyMaxChars)}...` : review.body;
  const date = review.reviewedAt ? new Date(review.reviewedAt).toLocaleDateString() : null;
  return (
    <div className="rounded-2xl border border-slate-200 p-6 max-w-lg mx-auto">
      {showRating && (
        <div className="flex gap-1 mb-3">
          {[...Array(5)].map((_, i) => (
            <span key={i} style={{ color: i < Math.round(review.rating) ? starColor : mutedColor, fontSize: 20 }}>
              ★
            </span>
          ))}
        </div>
      )}
      <p className="leading-relaxed mb-4" style={{ color: textColor, fontSize: `${fontSizeBase}px` }}>
        &ldquo;{truncated}&rdquo;
      </p>
      <div className="flex flex-col gap-1" style={{ color: mutedColor, fontSize: 13 }}>
        {showReviewerName && (
          <span className="font-semibold" style={{ color: textColor }}>
            {review.reviewerName}
          </span>
        )}
        {showDate && date && <span>{date}</span>}
        <SourceMark source={review.source} showSourceLogo={showSourceLogo} mutedColor={mutedColor} />
      </div>
    </div>
  );
}

// ─── Single Video Preview ─────────────────────────────────────────────────────

function SingleVideoPreview({
  video,
  primaryColor,
  textColor,
  mutedColor,
  showSourceLogo,
}: {
  video: VideoTestimonialItem | undefined;
  primaryColor: string;
  textColor: string;
  mutedColor: string;
  showSourceLogo: boolean;
}) {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const formatDuration = (s: number | null | undefined) => {
    if (!s) return null;
    return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
  };

  if (!video) {
    return (
      <div
        className="rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center text-sm"
        style={{ color: mutedColor }}
      >
        Select a video from the left panel to preview it here.
      </div>
    );
  }

  const thumbnailUrl = getThumbnailUrl({
    customThumbnailUrl: video.customThumbnailUrl,
    capturedFrameUrl: video.capturedFrameUrl,
    videoUrl: video.videoUrl,
    thumbnailSource: video.thumbnailSource,
  });

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
      <div className="max-w-lg mx-auto">
        <div
          className="relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 cursor-pointer"
          style={{ aspectRatio: "16/9" }}
          onClick={() => video.videoUrl && setLightboxUrl(video.videoUrl)}
        >
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt={getThumbnailAlt(video.submitterName)}
              className="h-full w-full object-cover"
            />
          ) : (
            video.videoUrl && (
              <video
                src={`${video.videoUrl}#t=0.1`}
                className="h-full w-full object-cover"
                muted
                preload="metadata"
              />
            )
          )}
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-full opacity-90"
              style={{ backgroundColor: primaryColor }}
            >
              <span className="ml-0.5 text-xl text-white">▶</span>
            </div>
          </div>
          {formatDuration(video.durationSeconds) && (
            <span className="absolute bottom-2 right-2 rounded bg-black/60 px-1.5 py-0.5 text-xs text-white">
              {formatDuration(video.durationSeconds)}
            </span>
          )}
        </div>
        <div className="mt-3">
          <p className="text-sm font-semibold" style={{ color: textColor }}>
            {video.submitterName}
          </p>
          {showSourceLogo && (
            <span
              className="inline-flex items-center gap-1 mt-1"
              style={{ color: mutedColor, fontSize: 10 }}
            >
              <span>📹</span> Video Testimonial
            </span>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Badge Layout ─────────────────────────────────────────────────────────────

function BadgeLayout({
  avgRating,
  reviewCount,
  reviewLink,
  starColor,
  textColor,
  mutedColor,
  primaryColor,
  badgeStyle,
}: {
  businessName: string;
  avgRating?: number | null;
  reviewCount: number;
  reviewLink?: string | null;
  starColor: string;
  textColor: string;
  mutedColor: string;
  primaryColor: string;
  badgeStyle?: string | null;
}) {
  const style = badgeStyle || "rating";

  if (style === "compact") {
    return (
      <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 shadow-sm">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
          <text x="1" y="17" fontSize="14" fontWeight="bold" fill="#4285f4">G</text>
        </svg>
        <span style={{ color: starColor }}>★</span>
        <span style={{ fontWeight: 700, color: textColor }}>{avgRating?.toFixed(1)}</span>
        <span style={{ color: mutedColor, fontSize: 12 }}>({reviewCount})</span>
      </div>
    );
  }

  if (style === "review_cta") {
    return (
      <div className="rounded-2xl border border-slate-200 p-5 text-center max-w-xs">
        <p style={{ color: starColor, fontSize: 20 }}>{"★".repeat(Math.round(avgRating || 0))}</p>
        <p style={{ fontWeight: 800, fontSize: 28, color: textColor, margin: "4px 0", lineHeight: 1 }}>
          {avgRating?.toFixed(1)}
        </p>
        <p style={{ color: mutedColor, fontSize: 12, marginBottom: 12 }}>
          Based on {reviewCount} reviews
        </p>
        {reviewLink && (
          <a
            href={reviewLink}
            target="_blank"
            rel="noreferrer"
            style={{
              background: primaryColor,
              color: "white",
              borderRadius: 8,
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            Write a Review
          </a>
        )}
      </div>
    );
  }

  if (style === "trust") {
    return (
      <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white px-5 py-3 shadow-sm">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
          <text x="1" y="17" fontSize="16" fontWeight="bold" fill="#4285f4">G</text>
        </svg>
        <div>
          <p style={{ fontWeight: 700, fontSize: 13, color: textColor, margin: 0 }}>
            Rated {avgRating?.toFixed(1)} / 5
          </p>
          <p style={{ color: mutedColor, fontSize: 11, margin: 0 }}>{reviewCount} Google reviews</p>
        </div>
        <span style={{ color: starColor, fontSize: 16 }}>{"★".repeat(Math.round(avgRating || 0))}</span>
      </div>
    );
  }

  // Default: "rating"
  return (
    <div className="rounded-2xl border border-slate-300 p-5 text-center max-w-xs">
      <p style={{ fontSize: 36, fontWeight: 900, color: textColor, margin: "0 0 4px", lineHeight: 1 }}>
        {avgRating?.toFixed(1)}
      </p>
      <p style={{ color: starColor, fontSize: 18, margin: "0 0 4px" }}>
        {"★".repeat(Math.round(avgRating || 0))}
      </p>
      <p style={{ color: mutedColor, fontSize: 12 }}>Based on {reviewCount} reviews</p>
      {reviewLink && (
        <a
          href={reviewLink}
          target="_blank"
          rel="noreferrer"
          style={{ color: primaryColor, fontSize: 12, fontWeight: 700 }}
        >
          Write a review →
        </a>
      )}
    </div>
  );
}

// ─── Slider Layout ────────────────────────────────────────────────────────────

function SliderLayout({
  children,
  showNav = true,
}: {
  children: React.ReactNode[];
  showNav?: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (scrollRef.current) {
      setCanScrollLeft(scrollRef.current.scrollLeft > 0);
      setCanScrollRight(
        scrollRef.current.scrollLeft < scrollRef.current.scrollWidth - scrollRef.current.clientWidth,
      );
    }
  };

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: direction === "left" ? -300 : 300, behavior: "smooth" });
      setTimeout(checkScroll, 100);
    }
  };

  return (
    <div className="relative">
      <div ref={scrollRef} className="flex gap-3 overflow-x-auto" onScroll={checkScroll}>
        {children}
      </div>
      {showNav && canScrollLeft && (
        <button
          onClick={() => scroll("left")}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 rounded-full bg-slate-900 p-2 text-white hover:bg-slate-800"
        >
          ←
        </button>
      )}
      {showNav && canScrollRight && (
        <button
          onClick={() => scroll("right")}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 rounded-full bg-slate-900 p-2 text-white hover:bg-slate-800"
        >
          →
        </button>
      )}
    </div>
  );
}

// ─── Carousel Layout ──────────────────────────────────────────────────────────

function CarouselLayout({
  cards,
  showNav = true,
  showPagination = true,
}: {
  cards: React.ReactNode[];
  showNav?: boolean;
  showPagination?: boolean;
}) {
  const [index, setIndex] = useState(0);
  if (cards.length === 0) return null;

  return (
    <div>
      <div className="relative flex items-center justify-center gap-4 min-h-[280px]">
        {showNav && (
          <button
            onClick={() => setIndex((i) => (i - 1 + cards.length) % cards.length)}
            className="absolute left-0 z-10 p-2 rounded-full hover:bg-slate-200 transition text-lg"
          >
            ←
          </button>
        )}
        <div className="flex-1 flex justify-center">{cards[index]}</div>
        {showNav && (
          <button
            onClick={() => setIndex((i) => (i + 1) % cards.length)}
            className="absolute right-0 z-10 p-2 rounded-full hover:bg-slate-200 transition text-lg"
          >
            →
          </button>
        )}
      </div>
      {showPagination && (
        <div className="flex justify-center gap-2 mt-4">
          {cards.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={`w-2 h-2 rounded-full transition ${i === index ? "bg-slate-900" : "bg-slate-300"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Video Carousel Layout ────────────────────────────────────────────────────

function VideoCarouselLayout({
  videos,
  primaryColor,
  textColor,
  mutedColor,
  showSourceLogo,
  showNav = true,
  showPagination = true,
}: {
  videos: VideoTestimonialItem[];
  primaryColor: string;
  textColor: string;
  mutedColor: string;
  showSourceLogo: boolean;
  showNav?: boolean;
  showPagination?: boolean;
}) {
  const [index, setIndex] = useState(0);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  if (videos.length === 0) return null;
  const current = videos[index];
  const formatDuration = (s: number | null | undefined) =>
    s ? `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}` : null;

  const thumbnailUrl = getThumbnailUrl({
    customThumbnailUrl: current.customThumbnailUrl,
    capturedFrameUrl: current.capturedFrameUrl,
    videoUrl: current.videoUrl,
    thumbnailSource: current.thumbnailSource,
  });

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
          <button onClick={() => setLightboxUrl(null)} className="absolute right-4 top-4 text-2xl text-white">
            ✕
          </button>
        </div>
      )}
      <div className="relative">
        {showNav && videos.length > 1 && (
          <button
            onClick={() => setIndex((i) => (i - 1 + videos.length) % videos.length)}
            className="absolute left-0 top-1/2 z-10 -translate-x-3 -translate-y-1/2 rounded-full bg-slate-900 p-2 text-sm text-white hover:bg-slate-800"
          >
            ←
          </button>
        )}
        <div
          className="relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 cursor-pointer"
          style={{ aspectRatio: "16/9" }}
          onClick={() => current.videoUrl && setLightboxUrl(current.videoUrl)}
        >
          {thumbnailUrl ? (
            <img
              key={current.id}
              src={thumbnailUrl}
              alt={getThumbnailAlt(current.submitterName)}
              className="h-full w-full object-cover"
            />
          ) : (
            current.videoUrl && (
              <video
                key={current.videoUrl}
                src={`${current.videoUrl}#t=0.1`}
                className="h-full w-full object-cover"
                muted
                preload="metadata"
              />
            )
          )}
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
            onClick={() => setIndex((i) => (i + 1) % videos.length)}
            className="absolute right-0 top-1/2 z-10 translate-x-3 -translate-y-1/2 rounded-full bg-slate-900 p-2 text-sm text-white hover:bg-slate-800"
          >
            →
          </button>
        )}
      </div>
      <p className="mt-3 text-sm font-semibold" style={{ color: textColor }}>
        {current.submitterName}
      </p>
      {showSourceLogo && (
        <span className="inline-flex items-center gap-1 mt-1" style={{ color: mutedColor, fontSize: 10 }}>
          <span>📹</span> Video Testimonial
        </span>
      )}
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

// ─── Tabbed Mixed Layout ──────────────────────────────────────────────────────

function TabbedLayout({
  reviews,
  videos,
  cardProps,
  isMobile,
}: {
  reviews: ReviewItem[];
  videos: VideoTestimonialItem[];
  cardProps: {
    showRating: boolean;
    showReviewerName: boolean;
    showDate: boolean;
    showResponses: boolean;
    showSourceLogo: boolean;
    bodyMaxChars: number;
    starColor: string;
    textColor: string;
    mutedColor: string;
    primaryColor: string;
  };
  isMobile: boolean;
}) {
  const [tab, setTab] = useState<"reviews" | "videos">("reviews");
  return (
    <div>
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTab("reviews")}
          className={`px-4 py-1.5 rounded-full text-sm font-semibold transition ${tab === "reviews" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"}`}
        >
          Reviews ({reviews.length})
        </button>
        <button
          onClick={() => setTab("videos")}
          className={`px-4 py-1.5 rounded-full text-sm font-semibold transition ${tab === "videos" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"}`}
        >
          Videos ({videos.length})
        </button>
      </div>
      {tab === "reviews" && (
        <div className={isMobile ? "flex flex-col gap-3" : "grid gap-4 md:grid-cols-2"}>
          {reviews.map((r) => (
            <ReviewCard key={r.id} review={r} {...cardProps} />
          ))}
        </div>
      )}
      {tab === "videos" && (
        <div className={isMobile ? "flex flex-col gap-3" : "grid gap-4 md:grid-cols-2"}>
          {videos.map((v) => (
            <VideoCard
              key={v.id}
              video={v}
              primaryColor={cardProps.primaryColor}
              textColor={cardProps.textColor}
              mutedColor={cardProps.mutedColor}
              showSourceLogo={cardProps.showSourceLogo}
              onPlay={() => {}}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Floating Widget Preview ─────────────────────────────────────────────────

function FloatingWidgetPreview({
  cardStyle,
  variation,
  position,
  accentColor,
  isMobile,
}: {
  cardStyle: string;
  variation: string;
  position: string;
  accentColor: string;
  isMobile?: boolean;
}) {
  const color = accentColor || "#4338ca";

  const posClass: Record<string, string> = {
    "bottom-right": "bottom-3 right-3",
    "bottom-left": "bottom-3 left-3",
    right: "right-0 top-1/2 -translate-y-1/2",
    left: "left-0 top-1/2 -translate-y-1/2",
  };

  const renderCard = (idx: number) => {
    const names = ["Sarah J.", "Matt M."];
    const name = names[idx % names.length];
    const initial = name[0];

    if (cardStyle === "notification_compact") {
      return (
        <div key={idx} style={{ background: "#fff", borderRadius: 12, boxShadow: "0 4px 16px rgba(0,0,0,.14)", padding: "9px 12px", display: "flex", alignItems: "center", gap: 8, border: "1px solid rgba(0,0,0,.06)", marginBottom: idx === 0 && variation === "rich" ? 6 : 0 }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 11, flexShrink: 0 }}>{initial}</div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#0f172a" }}>{name} just left a review</div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ color: "#f59e0b", fontSize: 10 }}>★★★★★</span>
              <span style={{ fontSize: 10, color: "#64748b" }}>On Google</span>
            </div>
          </div>
        </div>
      );
    }

    const showQuote = variation !== "compact";

    return (
      <div key={idx} style={{ background: "#fff", borderRadius: 12, boxShadow: "0 6px 20px rgba(0,0,0,.14)", padding: "10px 12px", border: "1px solid rgba(0,0,0,.06)", marginBottom: idx === 0 && variation === "rich" ? 6 : 0 }}>
        <div style={{ color: "#f59e0b", fontSize: 11, marginBottom: 4 }}>★★★★★</div>
        {showQuote && <div style={{ fontSize: 10, color: "#475569", lineHeight: 1.4, borderLeft: `2px solid ${color}`, paddingLeft: 6, marginBottom: 7 }}>"Truly exceeded our expectations."</div>}
        {cardStyle === "below_card" ? (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 22, height: 22, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 9 }}>{initial}</div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#0f172a" }}>{name}</div>
              <div style={{ fontSize: 9, color: "#64748b" }}>On Google</div>
            </div>
          </div>
        ) : (
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: cardStyle === "frosted_glass_pill" ? "rgba(15,23,42,.6)" : "#0f172a", borderRadius: 999, padding: "3px 10px 3px 3px" }}>
            <div style={{ width: 22, height: 22, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 9 }}>{initial}</div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#fff" }}>{name}</div>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,.7)" }}>On Google</div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-100" style={{ minHeight: 220, fontFamily: "system-ui, sans-serif" }}>
      <div className="p-4 space-y-2">
        <div className="h-3 w-3/4 rounded bg-slate-200" />
        <div className="h-2 w-full rounded bg-slate-200" />
        <div className="h-2 w-5/6 rounded bg-slate-200" />
        <div className="h-2 w-4/6 rounded bg-slate-200" />
        <div className="mt-4 h-2 w-full rounded bg-slate-200" />
        <div className="h-2 w-5/6 rounded bg-slate-200" />
      </div>

      {isMobile && variation === "rich" ? (
        <div className={`absolute ${posClass[position] ?? posClass["bottom-right"]}`} style={{ maxWidth: 200 }}>
          {renderCard(0)}
        </div>
      ) : (
        <div className={`absolute ${posClass[position] ?? posClass["bottom-right"]}`} style={{ maxWidth: 200 }}>
          {renderCard(0)}
          {variation === "rich" && renderCard(1)}
        </div>
      )}

      <div className="absolute top-2 left-2 text-[9px] font-bold uppercase tracking-wider text-slate-400 bg-white rounded px-1.5 py-0.5 border border-slate-200">
        Preview
      </div>
    </div>
  );
}

// ─── Collecting Widget Preview ────────────────────────────────────────────────

function CollectingWidgetPreview({
  position,
  theme,
  color,
  mobileBehavior,
  isMobile,
}: {
  position: string;
  theme: string;
  color: string;
  mobileBehavior: string;
  isMobile?: boolean;
}) {
  const effectiveColor = color || "#4338ca";
  const isTab = position === "left" || position === "right";
  const hidden = isMobile && mobileBehavior === "hidden";

  const btnStyle: React.CSSProperties =
    theme === "minimal"
      ? { background: "transparent", border: `2px solid ${effectiveColor}`, color: effectiveColor }
      : { background: effectiveColor, border: "none", color: "#fff" };

  const positionClass: Record<string, string> = {
    "bottom-right": "bottom-3 right-3",
    "bottom-left": "bottom-3 left-3",
    right: "right-0 top-1/2 -translate-y-1/2",
    left: "left-0 top-1/2 -translate-y-1/2",
  };

  return (
    <div
      className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-100"
      style={{ minHeight: 220, fontFamily: "system-ui, sans-serif" }}
    >
      {/* Mock page content lines */}
      <div className="p-4 space-y-2">
        <div className="h-3 w-3/4 rounded bg-slate-200" />
        <div className="h-2 w-full rounded bg-slate-200" />
        <div className="h-2 w-5/6 rounded bg-slate-200" />
        <div className="h-2 w-4/6 rounded bg-slate-200" />
        <div className="mt-4 h-2 w-full rounded bg-slate-200" />
        <div className="h-2 w-5/6 rounded bg-slate-200" />
        <div className="h-2 w-3/4 rounded bg-slate-200" />
      </div>

      {/* Floating button */}
      {!hidden ? (
        <div className={`absolute ${positionClass[position] ?? positionClass["bottom-right"]}`}>
          {isTab ? (
            <div
              style={{
                ...btnStyle,
                writingMode: "vertical-rl" as const,
                padding: "10px 8px",
                borderRadius: position === "right" ? "8px 0 0 8px" : "0 8px 8px 0",
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(0,0,0,.15)",
                userSelect: "none",
              }}
            >
              Share Feedback
            </div>
          ) : (
            <div
              style={{
                ...btnStyle,
                padding: "10px 16px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(0,0,0,.2)",
                whiteSpace: "nowrap",
                userSelect: "none",
              }}
            >
              Share Feedback
            </div>
          )}
        </div>
      ) : (
        <div className="absolute bottom-3 right-3 text-[10px] text-slate-400 italic">Hidden on mobile</div>
      )}

      {/* Preview label */}
      <div className="absolute top-2 left-2 text-[9px] font-bold uppercase tracking-wider text-slate-400 bg-white rounded px-1.5 py-0.5 border border-slate-200">
        Preview
      </div>
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

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
  showSourceLogo = true,
  bodyMaxChars = 280,
  primaryColor = "#4338ca",
  starColor = "#f59e0b",
  backgroundColor = "#ffffff",
  textColor = "#0f172a",
  fontFamily = "system",
  fontSizeBase = 14,
  fontSizeNames = 13,
  fontSizeHeader = 36,
  fontSizeLabel = 12,
  fontSizeSummary = 14,
  showAiSummary = true,
  reviewLink,
  showNav = true,
  showPagination = true,
  showBranding = true,
  widgetTitle,
  videoTestimonials,
  contentType,
  widgetType,
  aiReviewSummary,
  aiReviewSummaryReviewCount,
  isMobile = false,
  singleItemUnavailable,
  badgeStyle,
  collectPosition,
  collectButtonColor,
  collectButtonTheme,
  collectMobileBehavior,
  floatingCardStyle,
  floatingVariation,
  floatingPosition,
  floatingAccentColor,
}: ReviewWidgetPreviewProps) {
  if (widgetType === "FLOATING") {
    return (
      <FloatingWidgetPreview
        cardStyle={floatingCardStyle ?? "dark_solid_pill"}
        variation={floatingVariation ?? "standard"}
        position={floatingPosition ?? "bottom-right"}
        accentColor={floatingAccentColor ?? primaryColor ?? "#4338ca"}
        isMobile={isMobile}
      />
    );
  }

  if (widgetType === "COLLECTING") {
    return (
      <CollectingWidgetPreview
        position={collectPosition ?? "bottom-right"}
        theme={collectButtonTheme ?? "default"}
        color={collectButtonColor ?? primaryColor ?? "#4338ca"}
        mobileBehavior={collectMobileBehavior ?? "pill"}
        isMobile={isMobile}
      />
    );
  }

  const mutedColor = "#475569";
  const safeVideos = videoTestimonials ?? [];
  const hasVideos = safeVideos.length > 0;

  const cardProps = {
    showRating,
    showReviewerName,
    showDate,
    showResponses,
    showSourceLogo,
    bodyMaxChars,
    starColor,
    textColor,
    mutedColor,
    primaryColor,
    fontSizeBase,
    fontSizeNames,
    fontSizeLabel,
  };

  const cards = reviews.map((review) => <ReviewCard key={review.id} review={review} {...cardProps} />);

  const videoCards = safeVideos.map((v) => (
    <VideoCard
      key={v.id}
      video={v}
      primaryColor={primaryColor}
      textColor={textColor}
      mutedColor={mutedColor}
      showSourceLogo={showSourceLogo}
      onPlay={() => {}}
    />
  ));

  // ── BADGE ────────────────────────────────────────────────────────────────
  if (widgetType === "BADGE" || layout === "badge") {
    return (
      <div
        className="rounded-3xl border border-slate-200 bg-slate-50 p-6"
        style={{ fontFamily: fontStack(fontFamily) }}
      >
        <div className="flex justify-center">
          <BadgeLayout
            businessName={businessName}
            avgRating={avgRating}
            reviewCount={reviewCount}
            reviewLink={reviewLink}
            starColor={starColor}
            textColor={textColor}
            mutedColor={mutedColor}
            primaryColor={primaryColor}
            badgeStyle={badgeStyle}
          />
        </div>
      </div>
    );
  }

  // ── SINGLE TESTIMONIAL ───────────────────────────────────────────────────
  if (widgetType === "SINGLE_TESTIMONIAL") {
    if (singleItemUnavailable) {
      return (
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-8 text-center">
          <p className="text-sm font-semibold text-slate-500">Selected item is no longer available.</p>
          <p className="text-xs text-slate-400 mt-1">Please select a different review or video.</p>
        </div>
      );
    }
    return (
      <div
        className="rounded-3xl border border-slate-200 bg-slate-50 p-5"
        style={{ fontFamily: fontStack(fontFamily) }}
      >
        <div
          className="rounded-3xl border p-6 shadow-sm"
          style={{ backgroundColor, borderColor: "rgba(0,0,0,0.08)" }}
        >
          {widgetTitle && (
            <h2 className="text-lg font-bold mb-4" style={{ color: textColor }}>
              {widgetTitle}
            </h2>
          )}
          {contentType === "VIDEO" ? (
            <SingleVideoPreview
              video={safeVideos[0]}
              primaryColor={primaryColor}
              textColor={textColor}
              mutedColor={mutedColor}
              showSourceLogo={showSourceLogo}
            />
          ) : (
            <SingleTextPreview
              review={reviews[0]}
              showRating={showRating}
              showReviewerName={showReviewerName}
              showDate={showDate}
              showSourceLogo={showSourceLogo}
              starColor={starColor}
              textColor={textColor}
              mutedColor={mutedColor}
              bodyMaxChars={bodyMaxChars}
              fontSizeBase={fontSizeBase}
            />
          )}
          {showBranding && (
            <div className="mt-4 pt-4 border-t border-slate-100 text-center text-xs font-semibold opacity-60" style={{ color: textColor }}>
              Powered by WeHearYou
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── WALL OF LOVE ─────────────────────────────────────────────────────────
  const isVideoOnly = contentType === "VIDEO";
  const isMixedWall = contentType === "MIXED";

  const emptyState = (
    <div
      className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm"
      style={{ color: mutedColor }}
    >
      No published reviews match this widget yet.
    </div>
  );

  const videoEmptyState = (
    <div
      className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm"
      style={{ color: mutedColor }}
    >
      No published video testimonials yet.
    </div>
  );

  const renderWallContent = () => {
    // ── Video only ─────────────────────────────────────────────────────────
    if (isVideoOnly) {
      if (!hasVideos) return videoEmptyState;

      if (layout === "featured-video") {
        return (
          <SingleVideoPreview
            video={safeVideos[0]}
            primaryColor={primaryColor}
            textColor={textColor}
            mutedColor={mutedColor}
            showSourceLogo={showSourceLogo}
          />
        );
      }
      if (layout === "video-wall") {
        return (
          <div className={isMobile ? "flex flex-col gap-3" : "grid gap-3 sm:grid-cols-2 lg:grid-cols-3"}>
            {videoCards}
          </div>
        );
      }
      if (layout === "video-grid") {
        return (
          <div className={isMobile ? "flex flex-col gap-4" : "grid gap-4 md:grid-cols-2"}>
            {videoCards}
          </div>
        );
      }
      // video-carousel and legacy "video" layout
      return (
        <VideoCarouselLayout
          videos={safeVideos}
          primaryColor={primaryColor}
          textColor={textColor}
          mutedColor={mutedColor}
          showSourceLogo={showSourceLogo}
          showNav={showNav}
          showPagination={showPagination}
        />
      );
    }

    // ── Mixed ──────────────────────────────────────────────────────────────
    if (isMixedWall) {
      if (layout === "featured-video-reviews") {
        return (
          <div className="space-y-6">
            {hasVideos && (
              <VideoCarouselLayout
                videos={safeVideos.slice(0, 1)}
                primaryColor={primaryColor}
                textColor={textColor}
                mutedColor={mutedColor}
                showSourceLogo={showSourceLogo}
                showNav={false}
                showPagination={false}
              />
            )}
            <div className={isMobile ? "flex flex-col gap-3" : "grid gap-4 md:grid-cols-2"}>
              {cards.slice(0, 4)}
            </div>
          </div>
        );
      }
      if (layout === "mixed-carousel") {
        const mixed: React.ReactNode[] = [];
        const maxLen = Math.max(cards.length, videoCards.length);
        for (let i = 0; i < maxLen; i++) {
          if (videoCards[i]) mixed.push(videoCards[i]);
          if (cards[i]) mixed.push(cards[i]);
        }
        return <CarouselLayout cards={mixed} showNav={showNav} showPagination={showPagination} />;
      }
      if (layout === "tabbed") {
        return (
          <TabbedLayout
            reviews={reviews}
            videos={safeVideos}
            cardProps={cardProps}
            isMobile={isMobile}
          />
        );
      }
      // mixed-masonry (default for mixed)
      const mixedItems: Array<{ key: string; node: React.ReactNode }> = [];
      let ri = 0;
      let vi = 0;
      while (ri < reviews.length || vi < safeVideos.length) {
        if (vi < safeVideos.length) {
          mixedItems.push({ key: `v${vi}`, node: videoCards[vi] });
          vi++;
        }
        if (ri < reviews.length) {
          mixedItems.push({ key: `r${ri}`, node: cards[ri] });
          ri++;
        }
        if (ri < reviews.length) {
          mixedItems.push({ key: `r${ri}b`, node: cards[ri] });
          ri++;
        }
      }
      return (
        <div
          className={
            isMobile ? "flex flex-col gap-4" : "grid gap-4 sm:grid-cols-2 lg:grid-cols-3 auto-rows-max"
          }
        >
          {mixedItems.map((x) => (
            <div key={x.key}>{x.node}</div>
          ))}
        </div>
      );
    }

    // ── Text only ──────────────────────────────────────────────────────────
    if (reviews.length === 0) return emptyState;
    if (layout === "carousel" || layout === "slider") {
      return <CarouselLayout cards={cards} showNav={showNav} showPagination={showPagination} />;
    }
    if (layout === "list") {
      return <div className="flex flex-col gap-3">{cards}</div>;
    }
    if (layout === "masonry") {
      return (
        <div
          className={
            isMobile ? "flex flex-col gap-4" : "grid gap-4 sm:grid-cols-2 lg:grid-cols-3 auto-rows-max"
          }
        >
          {cards}
        </div>
      );
    }
    // grid and all others
    return (
      <div className={isMobile ? "flex flex-col gap-4" : "grid gap-4 md:grid-cols-2"}>{cards}</div>
    );
  };

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

        {showHeader && (
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
            fontSizeHeader={fontSizeHeader}
          />
        )}

        {showAiSummary && aiReviewSummary && (
          <div
            style={{
              background: "#eef2ff",
              border: "1px solid #c7d2fe",
              borderRadius: 10,
              padding: "10px 12px",
              marginTop: 10,
              textAlign: "left",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <p style={{ margin: 0, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "#4f46e5" }}>
                ✦ AI Summary
              </p>
              {aiReviewSummaryReviewCount && (
                <p style={{ margin: 0, fontSize: 10, color: "#a5b4fc" }}>
                  Based on {aiReviewSummaryReviewCount} reviews
                </p>
              )}
            </div>
            <p style={{ margin: 0, color: "#3730a3", fontSize: fontSizeSummary, lineHeight: 1.6 }}>{aiReviewSummary}</p>
          </div>
        )}

        {renderWallContent()}

        {showWriteReview && reviewLink && (
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
        )}

        {showBranding && (
          <div className="mt-4 pt-4 border-t" style={{ borderColor: "rgba(0,0,0,0.08)" }}>
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
