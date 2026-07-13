"use client";

import { useState, useCallback } from "react";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { ReviewWidgetPreview } from "@/components/review-widget-preview";
import { updateReviewWidget } from "@/app/widgets/actions";
import type { PublicWidgetPayload } from "@/lib/review-widgets";
import type { getReviewWidgetById } from "@/lib/review-widgets";

// ─── Types ────────────────────────────────────────────────────────────────────

type AvailableReview = {
  id: string;
  reviewerName: string;
  reviewerPhotoUrl: string | null;
  rating: number;
  body: string;
  reviewedAt: string | null;
  source: string;
};

type AvailableVideo = {
  id: string;
  submitterName: string | null;
  videoUrl: string;
  durationSeconds: number | null;
  publishedAt: string | null;
  caption?: string | null;
  customThumbnailUrl?: string | null;
  capturedFrameUrl?: string | null;
  capturedFrameTimestamp?: number | null;
  thumbnailSource?: string;
};

type WidgetTypeKey = "WALL_OF_LOVE" | "SINGLE_TESTIMONIAL" | "BADGE" | "COLLECTING" | "FLOATING";
type ContentMode = "TEXT" | "VIDEO" | "MIXED";
type SaveState = "idle" | "unsaved" | "saving" | "saved" | "error";

// ─── Constants ────────────────────────────────────────────────────────────────

const LAYOUT_OPTIONS: Record<ContentMode, Array<{ id: string; name: string; previewKey: string }>> = {
  TEXT: [
    { id: "masonry", name: "Masonry", previewKey: "masonry-text" },
    { id: "carousel", name: "Carousel Slider", previewKey: "carousel-text" },
    { id: "grid", name: "Grid", previewKey: "grid-text" },
    { id: "list", name: "List", previewKey: "list-text" },
  ],
  VIDEO: [
    { id: "video-grid", name: "Video Grid", previewKey: "grid-video" },
    { id: "video-carousel", name: "Video Carousel", previewKey: "carousel-video" },
    { id: "featured-video", name: "Featured Video", previewKey: "featured-video" },
    { id: "video-wall", name: "Video Wall", previewKey: "wall-video" },
  ],
  MIXED: [
    { id: "mixed-masonry", name: "Mixed Masonry", previewKey: "masonry-mixed" },
    { id: "featured-video-reviews", name: "Featured + Reviews", previewKey: "featured-mixed" },
    { id: "mixed-carousel", name: "Mixed Carousel", previewKey: "carousel-mixed" },
    { id: "tabbed", name: "Tabbed View", previewKey: "tabs-mixed" },
  ],
};

const BADGE_STYLES = [
  { id: "rating", name: "Rating Badge", desc: "Score, stars, and review count" },
  { id: "compact", name: "Compact Badge", desc: "Inline mini badge for headers" },
  { id: "review_cta", name: "Review CTA", desc: "Rating + Write a Review button" },
  { id: "trust", name: "Trust Badge", desc: "Horizontal trust signal strip" },
];

const getPlatformSteps = (widgetType: WidgetTypeKey): Record<string, { title: string; steps: string[] }> => {
  const isHeadWidget = widgetType === "COLLECTING" || widgetType === "FLOATING";
  const headInstruction = isHeadWidget
    ? "Paste this code in the <code>&lt;head&gt;</code> of your site (or your global layout) so it appears on every page."
    : "Paste the embed code where you want the widget to appear on your page.";

  return {
    wordpress: {
      title: "WordPress",
      steps: isHeadWidget ? [
        "In your WordPress admin, go to <strong>Appearance → Theme Code Editor</strong> (or use a child theme).",
        "Open the <code>header.php</code> file and paste the embed code before the closing <code>&lt;/head&gt;</code> tag.",
        "Save the file. The widget appears on all pages within seconds.",
      ] : [
        "In your WordPress editor, add a <strong>Custom HTML</strong> block where you want the widget.",
        "Paste the embed code into the HTML block.",
        "Click <strong>Update</strong> or <strong>Publish</strong> to save. The widget appears within seconds.",
      ],
    },
    shopify: {
      title: "Shopify",
      steps: isHeadWidget ? [
        "Go to <strong>Online Store → Themes → Edit code</strong>.",
        "Open <code>theme.liquid</code> and find the <code>&lt;/head&gt;</code> tag.",
        "Paste the embed code before that closing tag and save.",
      ] : [
        "Go to <strong>Online Store → Themes → Edit code</strong>.",
        "Open the template file for the page (e.g. <code>index.liquid</code>).",
        "Paste the embed code and save the file.",
      ],
    },
    webflow: {
      title: "Webflow",
      steps: isHeadWidget ? [
        "Go to <strong>Project Settings → Custom Code</strong>.",
        "Paste the embed code in the <strong>Head Code</strong> section.",
        "Publish your site.",
      ] : [
        "In your Webflow project, add an <strong>Embed</strong> element to the canvas.",
        "Paste the embed code into the embed block.",
        "Publish your site.",
      ],
    },
    squarespace: {
      title: "Squarespace",
      steps: isHeadWidget ? [
        "Go to <strong>Settings → Advanced → Code Injection</strong>.",
        "Paste the embed code in the <strong>Header</strong> section.",
        "Save and publish your changes.",
      ] : [
        "Edit your page and add a <strong>Code Block</strong>.",
        "Paste the embed code into the code block.",
        "Save and publish your changes.",
      ],
    },
    wix: {
      title: "Wix",
      steps: isHeadWidget ? [
        "Go to <strong>Settings → SEO Basics → Custom Code (Head)</strong>.",
        "Paste the embed code in the <strong>Head</strong> field.",
        "Save and your site will update.",
      ] : [
        "In the Wix Editor, add an <strong>HTML iframe</strong> element.",
        "Click <strong>Enter Code</strong> and paste the embed code.",
        "Save and publish your site.",
      ],
    },
    html: {
      title: "Custom HTML",
      steps: isHeadWidget ? [
        "Copy the embed code above.",
        "Paste it in the <code>&lt;head&gt;</code> section of your HTML file (before <code>&lt;/head&gt;</code>).",
        "Deploy or save your file.",
      ] : [
        "Copy the embed code above.",
        "Paste it into your HTML where you want the widget to appear.",
        "Deploy or save your file.",
      ],
    },
  };
};

// PLATFORM_STEPS will be generated dynamically based on widget type

// ─── Backward-compat helpers ──────────────────────────────────────────────────

function deriveWidgetType(widget: { widgetType?: string | null; layout: string }): WidgetTypeKey {
  if (widget.widgetType) return widget.widgetType as WidgetTypeKey;
  if (widget.layout === "badge") return "BADGE";
  if (widget.layout === "floating") return "FLOATING";
  return "WALL_OF_LOVE";
}

function deriveContentMode(widget: { contentType: string; layout: string }): ContentMode {
  const ct = widget.contentType as ContentMode;
  if (["TEXT", "VIDEO", "MIXED"].includes(ct)) return ct;
  if (widget.layout === "video") return "VIDEO";
  return "TEXT";
}

function deriveLayout(layout: string): string {
  const legacyMap: Record<string, string> = {
    slider: "carousel",
    video: "video-carousel",
  };
  return legacyMap[layout] ?? layout;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_REVIEWS: AvailableReview[] = [
  { id: "m1", reviewerName: "Sarah Johnson", reviewerPhotoUrl: null, rating: 5, body: "Absolutely fantastic service! The team went above and beyond our expectations.", reviewedAt: new Date(Date.now() - 7 * 86400000).toISOString(), source: "GOOGLE" },
  { id: "m2", reviewerName: "Michael Chen", reviewerPhotoUrl: null, rating: 5, body: "Great experience from start to finish. Professional, reliable, and affordable.", reviewedAt: new Date(Date.now() - 14 * 86400000).toISOString(), source: "GOOGLE" },
  { id: "m3", reviewerName: "Emily Rodriguez", reviewerPhotoUrl: null, rating: 4, body: "Very satisfied with the results. Quick turnaround and excellent communication.", reviewedAt: new Date(Date.now() - 21 * 86400000).toISOString(), source: "GOOGLE" },
  { id: "m4", reviewerName: "David Thompson", reviewerPhotoUrl: null, rating: 5, body: "Best in the business. Attention to detail is unmatched.", reviewedAt: new Date(Date.now() - 30 * 86400000).toISOString(), source: "GOOGLE" },
  { id: "m5", reviewerName: "Jessica Martinez", reviewerPhotoUrl: null, rating: 5, body: "Outstanding customer service. They really care about their clients.", reviewedAt: new Date(Date.now() - 45 * 86400000).toISOString(), source: "GOOGLE" },
  { id: "m6", reviewerName: "Robert Kim", reviewerPhotoUrl: null, rating: 5, body: "Came back for the third time — never disappointed!", reviewedAt: new Date(Date.now() - 60 * 86400000).toISOString(), source: "GOOGLE" },
];

const MOCK_VIDEOS = [
  { id: "mv1", submitterName: "Alex Rivera", videoUrl: "", durationSeconds: 42, publishedAt: new Date(Date.now() - 5 * 86400000).toISOString(), customThumbnailUrl: null, capturedFrameUrl: null, thumbnailSource: "DEFAULT" as const },
  { id: "mv2", submitterName: "Priya Patel", videoUrl: "", durationSeconds: 65, publishedAt: new Date(Date.now() - 12 * 86400000).toISOString(), customThumbnailUrl: null, capturedFrameUrl: null, thumbnailSource: "DEFAULT" as const },
];

// ─── Layout Mini Previews ─────────────────────────────────────────────────────

function LayoutMiniPreview({ previewKey }: { previewKey: string }) {
  const mc = (k: string) => (
    <div key={k} className="bg-white border border-slate-200 rounded p-1">
      <div className="text-amber-400 text-[7px]">★★★★★</div>
      <div className="text-[6px] text-slate-400 leading-tight">Great!</div>
    </div>
  );
  const mv = (k: string) => (
    <div key={k} className="bg-slate-800 rounded flex items-center justify-center" style={{ height: 28 }}>
      <span className="text-white text-[8px]">▶</span>
    </div>
  );
  const nav = <span className="text-slate-300 text-xs flex-shrink-0">‹</span>;
  const navR = <span className="text-slate-300 text-xs flex-shrink-0">›</span>;

  const map: Record<string, React.ReactNode> = {
    "masonry-text": <div className="grid grid-cols-2 gap-1 w-full">{[0, 1, 2, 3].map((i) => mc(String(i)))}</div>,
    "carousel-text": <div className="flex items-center gap-1 w-full">{nav}<div className="flex-1">{mc("c")}</div>{navR}</div>,
    "grid-text": <div className="grid grid-cols-2 gap-1 w-full">{[0, 1, 2, 3].map((i) => mc(String(i)))}</div>,
    "list-text": <div className="flex flex-col gap-1 w-full">{[0, 1, 2].map((i) => mc(String(i)))}</div>,
    "grid-video": <div className="grid grid-cols-2 gap-1 w-full">{[0, 1, 2, 3].map((i) => mv(String(i)))}</div>,
    "carousel-video": <div className="flex items-center gap-1 w-full">{nav}<div className="flex-1">{mv("c")}</div>{navR}</div>,
    "featured-video": <div className="flex flex-col gap-1 w-full">{mv("f")}<div className="text-[7px] text-slate-500 font-semibold">Alex R.</div></div>,
    "wall-video": <div className="grid grid-cols-3 gap-1 w-full">{[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="bg-slate-800 rounded flex items-center justify-center" style={{ height: 16 }}><span className="text-white text-[6px]">▶</span></div>)}</div>,
    "masonry-mixed": <div className="grid grid-cols-2 gap-1 w-full"><div>{mv("m1")}</div><div>{mc("mc1")}</div><div>{mc("mc2")}</div><div>{mv("m2")}</div></div>,
    "featured-mixed": <div className="flex flex-col gap-1 w-full">{mv("f")}<div className="grid grid-cols-2 gap-1">{mc("c1")}{mc("c2")}</div></div>,
    "carousel-mixed": <div className="flex items-center gap-1 w-full">{nav}<div className="flex-1 flex gap-1">{mv("v")}{mc("c")}</div>{navR}</div>,
    "tabs-mixed": <div className="w-full"><div className="flex gap-1 mb-1"><span className="bg-indigo-500 text-white text-[6px] px-1.5 py-0.5 rounded-full">Reviews</span><span className="bg-slate-100 text-slate-400 text-[6px] px-1.5 py-0.5 rounded-full">Videos</span></div><div className="grid grid-cols-2 gap-1">{mc("c1")}{mc("c2")}</div></div>,
  };

  return <>{map[previewKey] ?? <div className="text-[8px] text-slate-400">Preview</div>}</>;
}

// ─── Toggle ───────────────────────────────────────────────────────────────────

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className={`relative w-9 h-5 rounded-full flex-shrink-0 transition-colors ${on ? "bg-indigo-600" : "bg-slate-200"}`}
      aria-pressed={on}
    >
      <div
        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${on ? "left-4" : "left-0.5"}`}
      />
    </button>
  );
}

function ToggleRow({
  label,
  sub,
  on,
  onChange,
}: {
  label: string;
  sub?: string;
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-3 px-4 border-b border-slate-50 last:border-b-0">
      <div>
        <p className="text-sm font-semibold text-slate-900">{label}</p>
        {sub && <p className="text-xs text-slate-500">{sub}</p>}
      </div>
      <Toggle on={on} onChange={onChange} />
    </div>
  );
}

// ─── Section Card ─────────────────────────────────────────────────────────────

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{title}</p>
      </div>
      {children}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

// Selectable "max reviews shown" values for wall-of-love widgets. The embed
// shows a "Load more" button when the location has more reviews than this.
const PAGE_SIZE_OPTIONS = [2, 4, 6, 8, 10, 12, 16];

function snapPageSize(value: number | null | undefined): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 12;
  return PAGE_SIZE_OPTIONS.reduce(
    (best, opt) => (Math.abs(opt - n) < Math.abs(best - n) ? opt : best),
    PAGE_SIZE_OPTIONS[0],
  );
}

interface WidgetCustomizerProps {
  widget: NonNullable<Awaited<ReturnType<typeof getReviewWidgetById>>>;
  preview: PublicWidgetPayload | null;
  embedScriptUrl: string;
  localTestUrl: string;
  availableReviews: AvailableReview[];
  availableVideos: AvailableVideo[];
}

export function WidgetCustomizer({
  widget,
  preview,
  embedScriptUrl,
  localTestUrl,
  availableReviews,
  availableVideos,
}: WidgetCustomizerProps) {
  // ── Derive initial state from DB values ────────────────────────────────────
  const initialWidgetType = deriveWidgetType(widget);
  const initialContentMode = deriveContentMode(widget);
  const initialLayout = deriveLayout(widget.layout);

  // ── State ──────────────────────────────────────────────────────────────────
  const [widgetType, setWidgetType] = useState<WidgetTypeKey>(initialWidgetType);
  const [contentMode, setContentMode] = useState<ContentMode>(initialContentMode);
  const [layout, setLayout] = useState(initialLayout);
  const [darkTheme, setDarkTheme] = useState(widget.theme === "dark");
  const [title, setTitle] = useState(widget.name);
  const [isActive, setIsActive] = useState(widget.isActive);
  const [pageSize, setPageSize] = useState<number>(snapPageSize(widget.pageSize));
  const [showNav, setShowNav] = useState(true);
  const [showPagination, setShowPagination] = useState(true);
  const [showBranding, setShowBranding] = useState(true);
  const [showHeader, setShowHeader] = useState(widget.showHeader !== false);
  const [showAvgRating, setShowAvgRating] = useState(widget.showAvgRating !== false);
  const [showReviewCount, setShowReviewCount] = useState(widget.showReviewCount !== false);
  const [showRating, setShowRating] = useState(widget.showRating !== false);
  const [showReviewerName, setShowReviewerName] = useState(widget.showReviewerName !== false);
  const [showDate, setShowDate] = useState(widget.showDate !== false);
  const [showWriteReview, setShowWriteReview] = useState(widget.showWriteReview !== false);
  const [showSourceLogo, setShowSourceLogo] = useState(
    (widget as { showSourceLogo?: boolean }).showSourceLogo !== false,
  );
  const [badgeStyle, setBadgeStyle] = useState<string>(
    (widget as { badgeStyle?: string | null }).badgeStyle ?? "rating",
  );
  const [singleTestimonialReviewId, setSingleTestimonialReviewId] = useState<string | null>(
    (widget as { singleTestimonialReviewId?: string | null }).singleTestimonialReviewId ?? null,
  );
  const [singleTestimonialVideoId, setSingleTestimonialVideoId] = useState<string | null>(
    (widget as { singleTestimonialVideoId?: string | null }).singleTestimonialVideoId ?? null,
  );
  const [singleType, setSingleType] = useState<"video" | "text">(
    widget.contentType === "VIDEO" ? "video" : "text",
  );

  // Collecting Widget state
  const [collectPosition, setCollectPosition] = useState<string>(
    (widget as { collectButtonPosition?: string | null }).collectButtonPosition ?? "bottom-right",
  );
  const [collectFreq, setCollectFreq] = useState<string>(
    (widget as { collectDisplayFreq?: string | null }).collectDisplayFreq ?? "always",
  );
  const [collectTheme, setCollectTheme] = useState<string>(
    (widget as { collectButtonTheme?: string | null }).collectButtonTheme ?? "default",
  );
  const [collectButtonColor, setCollectButtonColor] = useState<string | null>(
    (widget as { collectButtonColor?: string | null }).collectButtonColor ?? null,
  );
  const [collectMobileBehavior, setCollectMobileBehavior] = useState<string>(
    (widget as { collectMobileBehavior?: string | null }).collectMobileBehavior ?? "pill",
  );

  // Floating Widget state
  const [floatingCardStyle, setFloatingCardStyle] = useState<string>(
    (widget as { floatingCardStyle?: string | null }).floatingCardStyle ?? "dark_solid_pill",
  );
  const [floatingVariation, setFloatingVariation] = useState<string>(
    (widget as { floatingVariation?: string | null }).floatingVariation ?? "standard",
  );
  const [floatingPosition, setFloatingPosition] = useState<string>(
    (widget as { floatingPosition?: string | null }).floatingPosition ?? "bottom-right",
  );
  const [floatingRotationEnabled, setFloatingRotationEnabled] = useState<boolean>(
    (widget as { floatingRotationEnabled?: boolean | null }).floatingRotationEnabled ?? true,
  );
  const [floatingRotationIntervalSec, setFloatingRotationIntervalSec] = useState<number>(
    (widget as { floatingRotationIntervalSec?: number | null }).floatingRotationIntervalSec ?? 8,
  );
  const [floatingAccentColorMode, setFloatingAccentColorMode] = useState<string>(
    (widget as { floatingAccentColorMode?: string | null }).floatingAccentColorMode ?? "inherit",
  );
  const [floatingAccentColor, setFloatingAccentColor] = useState<string | null>(
    (widget as { floatingAccentColor?: string | null }).floatingAccentColor ?? null,
  );
  const [floatingMobileBehavior, setFloatingMobileBehavior] = useState<string>(
    (widget as { floatingMobileBehavior?: string | null }).floatingMobileBehavior ?? "show",
  );
  const [floatingApprovedOnly, setFloatingApprovedOnly] = useState<boolean>(
    (widget as { floatingApprovedOnly?: boolean | null }).floatingApprovedOnly ?? true,
  );
  const [floatingMinRating, setFloatingMinRating] = useState<number>(
    (widget as { floatingMinRating?: number | null }).floatingMinRating ?? 4,
  );
  const [floatingDisplayFrequency, setFloatingDisplayFrequency] = useState<string>(
    (widget as { floatingDisplayFrequency?: string | null }).floatingDisplayFrequency ?? "always",
  );

  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [isMobile, setIsMobile] = useState(false);
  const [showPublishDrawer, setShowPublishDrawer] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState("wordpress");
  const [copySuccess, setCopySuccess] = useState(false);

  const markUnsaved = useCallback(() => setSaveState((s) => (s === "saving" ? s : "unsaved")), []);

  // ── Setters that mark unsaved ──────────────────────────────────────────────
  function setAndMark<T>(setter: React.Dispatch<React.SetStateAction<T>>) {
    return (v: T) => {
      setter(v);
      markUnsaved();
    };
  }

  const handleContentModeChange = (mode: ContentMode) => {
    setContentMode(mode);
    const firstLayout = LAYOUT_OPTIONS[mode][0].id;
    setLayout(firstLayout);
    markUnsaved();
  };

  // ── Derived preview data ───────────────────────────────────────────────────
  const usingMockReviews = !preview?.reviews || preview.reviews.length === 0;
  const usingMockVideos = !preview?.videoTestimonials || preview.videoTestimonials.length === 0;

  const previewReviews = usingMockReviews
    ? MOCK_REVIEWS
    : preview.reviews;

  const previewVideos = usingMockVideos
    ? MOCK_VIDEOS
    : preview.videoTestimonials!.map((v) => ({
        id: v.id,
        submitterName: v.submitterName ?? "",
        videoUrl: v.videoUrl,
        durationSeconds: v.durationSeconds,
        publishedAt: v.publishedAt,
        customThumbnailUrl: v.customThumbnailUrl,
        capturedFrameUrl: v.capturedFrameUrl,
        thumbnailSource: v.thumbnailSource as "DEFAULT" | "CUSTOM" | "CAPTURED",
      }));

  // For single testimonial, use the selected item or fall back to first available
  const selectedReview = singleTestimonialReviewId
    ? availableReviews.find((r) => r.id === singleTestimonialReviewId)
    : undefined;
  const selectedVideo = singleTestimonialVideoId
    ? availableVideos.find((v) => v.id === singleTestimonialVideoId)
    : undefined;

  const singlePreviewReviews = selectedReview
    ? [{ ...selectedReview, sourceReviewUrl: null, sourceReplyText: null }]
    : previewReviews.slice(0, 1);
  const singlePreviewVideos = selectedVideo
    ? [{
        id: selectedVideo.id,
        submitterName: selectedVideo.submitterName ?? "",
        videoUrl: selectedVideo.videoUrl,
        durationSeconds: selectedVideo.durationSeconds,
        publishedAt: selectedVideo.publishedAt,
        customThumbnailUrl: selectedVideo.customThumbnailUrl,
        capturedFrameUrl: selectedVideo.capturedFrameUrl,
        thumbnailSource: selectedVideo.thumbnailSource as "DEFAULT" | "CUSTOM" | "CAPTURED",
      }]
    : previewVideos.slice(0, 1);

  // Cap the wall-of-love preview to the chosen "max reviews shown" so the live
  // preview matches what the embed renders before its "Load more" button.
  const wallPreviewReviews =
    widgetType === "WALL_OF_LOVE" ? previewReviews.slice(0, pageSize) : previewReviews;

  const previewContentType =
    widgetType === "SINGLE_TESTIMONIAL" ? (singleType === "video" ? "VIDEO" : "TEXT") : contentMode;
  const previewLayout = widgetType === "BADGE" ? "badge" : layout;

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = async (): Promise<boolean> => {
    setSaveState("saving");
    const formData = new FormData();
    formData.append("widgetId", widget.id);
    formData.append("widgetType", widgetType);
    formData.append("layout", layout);
    formData.append("contentType", previewContentType);
    formData.append("name", title);
    formData.append("pageSize", String(pageSize));
    formData.append("theme", darkTheme ? "dark" : "light");
    formData.append("badgeStyle", badgeStyle);
    if (isActive) formData.append("isActive", "on");
    if (showNav) formData.append("showNav", "on");
    if (showPagination) formData.append("showPagination", "on");
    if (showBranding) formData.append("showBranding", "on");
    if (showHeader) formData.append("showHeader", "on");
    if (showAvgRating) formData.append("showAvgRating", "on");
    if (showReviewCount) formData.append("showReviewCount", "on");
    if (showRating) formData.append("showRating", "on");
    if (showReviewerName) formData.append("showReviewerName", "on");
    if (showDate) formData.append("showDate", "on");
    if (showWriteReview) formData.append("showWriteReview", "on");
    if (showSourceLogo) formData.append("showSourceLogo", "on");
    if (widgetType === "SINGLE_TESTIMONIAL") {
      if (singleType === "video" && singleTestimonialVideoId) {
        formData.append("singleTestimonialVideoId", singleTestimonialVideoId);
      } else if (singleType === "text" && singleTestimonialReviewId) {
        formData.append("singleTestimonialReviewId", singleTestimonialReviewId);
      }
    }
    formData.append("collectDisplayFreq", collectFreq);
    formData.append("collectButtonTheme", collectTheme);
    formData.append("collectButtonColor", collectButtonColor ?? "");
    formData.append("collectMobileBehavior", collectMobileBehavior);
    formData.append("collectButtonPosition", collectPosition);
    formData.append("floatingCardStyle", floatingCardStyle);
    formData.append("floatingVariation", floatingVariation);
    formData.append("floatingPosition", floatingPosition);
    if (floatingRotationEnabled) formData.append("floatingRotationEnabled", "on");
    formData.append("floatingRotationIntervalSec", String(floatingRotationIntervalSec));
    formData.append("floatingAccentColorMode", floatingAccentColorMode);
    formData.append("floatingAccentColor", floatingAccentColor ?? "");
    formData.append("floatingMobileBehavior", floatingMobileBehavior);
    if (floatingApprovedOnly) formData.append("floatingApprovedOnly", "on");
    formData.append("floatingMinRating", String(floatingMinRating));
    formData.append("floatingDisplayFrequency", floatingDisplayFrequency);

    // Appearance colors and styling
    formData.append("primaryColor", widget.primaryColor ?? "#4338ca");
    formData.append("starColor", widget.starColor ?? "#f59e0b");
    formData.append("backgroundColor", darkTheme ? "#1e293b" : (widget.backgroundColor ?? "#ffffff"));
    formData.append("textColor", darkTheme ? "#f1f5f9" : (widget.textColor ?? "#0f172a"));
    formData.append("fontFamily", widget.fontFamily ?? "system");
    formData.append("minRating", String(widget.minRating ?? 1));
    formData.append("pageSize", String(pageSize));
    formData.append("bodyMaxChars", String(widget.bodyMaxChars ?? 280));

    try {
      await updateReviewWidget(formData);
      setSaveState("saved");
      return true;
    } catch (error) {
      // updateReviewWidget ends with redirect() which throws internally.
      // Catch it here so we stay on the customizer page — treat it as success.
      if (isRedirectError(error)) {
        setSaveState("saved");
        return true;
      }
      setSaveState("error");
      return false;
    }
  };

  const handlePublishClick = async () => {
    if (saveState === "unsaved") {
      const ok = await handleSave();
      if (!ok) return;
    }
    setShowPublishDrawer(true);
  };

  const mountId = `why-widget-${widget.publicToken}`;
  // Add token as a query param so each widget gets a distinct script URL.
  // This prevents browsers and caching plugins from deduplicating the script
  // when multiple widgets share the same src on one page.
  // Sanitize embedScriptUrl to remove any newlines that might have been introduced
  const cleanScriptUrl = embedScriptUrl.replace(/\n/g, '');
  const scriptSrc = `${cleanScriptUrl}?t=${widget.publicToken}`;
  // For COLLECTING and FLOATING widgets, only output the script tag (no mount div)
  // because the script injects these elements directly into the body
  const embedCode = widgetType === "COLLECTING" || widgetType === "FLOATING"
    ? `<script src="${scriptSrc}" data-token="${widget.publicToken}"><\/script>`
    : `<div id="${mountId}"></div><script src="${scriptSrc}" data-token="${widget.publicToken}" data-mount="#${mountId}"><\/script>`;

  const saveBtnLabel =
    saveState === "saving"
      ? "Saving…"
      : saveState === "error"
        ? "Save failed — retry"
        : saveState === "unsaved"
          ? "Save changes ·"
          : "Save changes";

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Eyebrow */}
      <div className="border-b border-slate-200 pb-4">
        <p className="text-xs font-bold uppercase tracking-[.2em] text-indigo-600">Embed Widgets</p>
        <p className="text-sm text-slate-500 mt-1">
          Add your reviews and video testimonials to your website with embeddable widgets.
        </p>
      </div>

      {/* WIDGET TYPE TABS */}
      <div className="flex border-b border-slate-200 overflow-x-auto">
        {(["WALL_OF_LOVE", "SINGLE_TESTIMONIAL", "BADGE", "COLLECTING", "FLOATING"] as WidgetTypeKey[]).map((type) => {
          const labels: Record<string, string> = {
            WALL_OF_LOVE: "🧱 Wall of Love",
            SINGLE_TESTIMONIAL: "✦ Single Testimonial",
            BADGE: "⭐ Badge",
            COLLECTING: "📥 Collecting Widget",
            FLOATING: "📍 Floating Widget",
          };
          return (
            <button
              key={type}
              type="button"
              onClick={() => {
                setWidgetType(type);
                markUnsaved();
              }}
              className={`flex-shrink-0 px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
                widgetType === type
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-500 hover:text-slate-900"
              }`}
            >
              {labels[type]}
            </button>
          );
        })}
      </div>

      {/* MAIN LAYOUT */}
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">

        {/* LEFT PANEL */}
        <div className="flex flex-col gap-4">

          {/* ── WALL OF LOVE ──────────────────────────────────────────────── */}
          {widgetType === "WALL_OF_LOVE" && (
            <>
              {/* Content Mode */}
              <SectionCard title="Content to display">
                <div className="p-3 grid grid-cols-3 gap-2">
                  {(
                    [
                      { mode: "TEXT" as ContentMode, icon: "⭐", label: "Text Reviews", desc: "Google & written reviews" },
                      { mode: "VIDEO" as ContentMode, icon: "🎬", label: "Video Testimonials", desc: "Customer video clips" },
                      { mode: "MIXED" as ContentMode, icon: "✨", label: "Reviews + Videos", desc: "Mixed wall of both" },
                    ] as const
                  ).map(({ mode, icon, label, desc }) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => handleContentModeChange(mode)}
                      className={`relative flex flex-col items-center gap-1 rounded-xl border-2 p-3 text-center transition-all ${
                        contentMode === mode
                          ? "border-indigo-600 bg-indigo-50"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      {contentMode === mode && (
                        <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-indigo-600 rounded-full text-white text-[9px] font-bold flex items-center justify-center">
                          ✓
                        </span>
                      )}
                      <span className="text-lg">{icon}</span>
                      <span className="text-xs font-bold text-slate-900 leading-tight">{label}</span>
                      <span className="text-[10px] text-slate-500 leading-tight">{desc}</span>
                    </button>
                  ))}
                </div>
              </SectionCard>

              {/* Layout Cards */}
              <SectionCard
                title={`Layout — ${contentMode === "TEXT" ? "Text Reviews" : contentMode === "VIDEO" ? "Video Testimonials" : "Reviews + Videos"}`}
              >
                <div className="p-3 grid grid-cols-2 gap-2">
                  {LAYOUT_OPTIONS[contentMode].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setLayout(opt.id);
                        markUnsaved();
                      }}
                      className={`relative rounded-xl border-2 overflow-hidden transition-all ${
                        layout === opt.id
                          ? "border-indigo-600"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      {layout === opt.id && (
                        <span className="absolute top-1.5 right-1.5 bg-indigo-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full z-10">
                          ✓
                        </span>
                      )}
                      <div
                        className="bg-slate-50 p-2 flex items-center justify-center"
                        style={{ minHeight: 68 }}
                      >
                        <LayoutMiniPreview previewKey={opt.previewKey} />
                      </div>
                      <div className="px-3 py-2 border-t border-slate-100">
                        <p className="text-xs font-bold text-slate-900">{opt.name}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </SectionCard>

              {/* Display toggles */}
              <SectionCard title="Display settings">
                <ToggleRow label="Widget header" sub="Show Google rating bar" on={showHeader} onChange={setAndMark(setShowHeader)} />
                <ToggleRow label="Star ratings" sub="On each review card" on={showRating} onChange={setAndMark(setShowRating)} />
                <ToggleRow label="Reviewer names" sub="Name and avatar" on={showReviewerName} onChange={setAndMark(setShowReviewerName)} />
                <ToggleRow label="Review dates" on={showDate} onChange={setAndMark(setShowDate)} />
                <ToggleRow label="Source logo" sub="Google G / WeHearYou mark" on={showSourceLogo} onChange={setAndMark(setShowSourceLogo)} />
                <ToggleRow label="Write review link" on={showWriteReview} onChange={setAndMark(setShowWriteReview)} />
                <ToggleRow label="Dark theme" on={darkTheme} onChange={setAndMark(setDarkTheme)} />
                <ToggleRow label="WeHearYou branding" on={showBranding} onChange={setAndMark(setShowBranding)} />
              </SectionCard>

              {/* Widget name + active */}
              <SectionCard title="Widget settings">
                <div className="p-4 space-y-4">
                  <div>
                    <p className="text-xs font-bold text-slate-500 mb-1.5">Widget title</p>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => {
                        setTitle(e.target.value);
                        markUnsaved();
                      }}
                      placeholder="e.g. Our Happy Customers"
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 mb-1.5">Max reviews shown</p>
                    <div className="flex flex-wrap gap-1.5">
                      {PAGE_SIZE_OPTIONS.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => {
                            setPageSize(opt);
                            markUnsaved();
                          }}
                          className={`min-w-[40px] rounded-lg border px-2.5 py-1.5 text-sm font-semibold transition-all ${
                            pageSize === opt
                              ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                    <p className="mt-1.5 text-[11px] text-slate-400">
                      A “Load more” button appears when the location has more reviews than this.
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Widget active</p>
                      <p className="text-xs text-slate-500">Public embed shows reviews</p>
                    </div>
                    <Toggle on={isActive} onChange={setAndMark(setIsActive)} />
                  </div>
                </div>
              </SectionCard>
            </>
          )}

          {/* ── SINGLE TESTIMONIAL ────────────────────────────────────────── */}
          {widgetType === "SINGLE_TESTIMONIAL" && (
            <>
              <SectionCard title="Testimonial type">
                <div className="p-3 grid grid-cols-2 gap-3">
                  {(
                    [
                      { type: "video" as const, icon: "🎬", label: "Video Testimonial", desc: "Embed one selected video" },
                      { type: "text" as const, icon: "⭐", label: "Text Testimonial", desc: "Stars, quote, reviewer name, source" },
                    ] as const
                  ).map(({ type, icon, label, desc }) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        setSingleType(type);
                        markUnsaved();
                      }}
                      className={`relative flex flex-col items-center gap-1.5 rounded-xl border-2 p-4 text-center transition-all ${
                        singleType === type
                          ? "border-indigo-600 bg-indigo-50"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      {singleType === type && (
                        <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-indigo-600 rounded-full text-white text-[9px] font-bold flex items-center justify-center">
                          ✓
                        </span>
                      )}
                      <span className="text-2xl">{icon}</span>
                      <span className="text-xs font-bold text-slate-900">{label}</span>
                      <span className="text-[10px] text-slate-500 leading-tight">{desc}</span>
                    </button>
                  ))}
                </div>
              </SectionCard>

              <SectionCard title={singleType === "video" ? "Select video" : "Select review"}>
                <div className="p-3 flex flex-col gap-2 max-h-64 overflow-y-auto">
                  {singleType === "video" ? (
                    availableVideos.length === 0 ? (
                      <p className="text-sm text-slate-400 text-center py-4">
                        No published video testimonials yet.
                      </p>
                    ) : (
                      availableVideos.map((v) => (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => {
                            setSingleTestimonialVideoId(v.id);
                            setSingleTestimonialReviewId(null);
                            markUnsaved();
                          }}
                          className={`flex items-center gap-3 rounded-lg border-2 p-3 text-left transition-all ${
                            singleTestimonialVideoId === v.id
                              ? "border-indigo-600 bg-indigo-50"
                              : "border-slate-200 bg-white hover:border-slate-300"
                          }`}
                        >
                          <div className="w-12 h-8 bg-slate-800 rounded flex items-center justify-center flex-shrink-0 text-white text-xs">
                            ▶
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-900 truncate">
                              {v.submitterName ?? "Unknown"}
                            </p>
                            <p className="text-xs text-slate-500">
                              {v.durationSeconds
                                ? `${Math.floor(v.durationSeconds / 60)}:${(v.durationSeconds % 60).toString().padStart(2, "0")}`
                                : ""}
                              {v.publishedAt
                                ? ` · ${new Date(v.publishedAt).toLocaleDateString()}`
                                : ""}
                            </p>
                          </div>
                          {singleTestimonialVideoId === v.id && (
                            <span className="text-xs font-bold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full flex-shrink-0">
                              Selected
                            </span>
                          )}
                        </button>
                      ))
                    )
                  ) : availableReviews.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-4">No published reviews yet.</p>
                  ) : (
                    availableReviews.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => {
                          setSingleTestimonialReviewId(r.id);
                          setSingleTestimonialVideoId(null);
                          markUnsaved();
                        }}
                        className={`flex items-start gap-3 rounded-lg border-2 p-3 text-left transition-all ${
                          singleTestimonialReviewId === r.id
                            ? "border-indigo-600 bg-indigo-50"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-amber-400 text-xs">{"★".repeat(r.rating)}</span>
                            {singleTestimonialReviewId === r.id && (
                              <span className="text-xs font-bold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full">
                                Selected
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-600 line-clamp-2">{r.body}</p>
                          <p className="text-xs font-semibold text-slate-800 mt-1">{r.reviewerName}</p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </SectionCard>

              <SectionCard title="Display settings">
                <ToggleRow label="Star rating" on={showRating} onChange={setAndMark(setShowRating)} />
                <ToggleRow label="Reviewer name" on={showReviewerName} onChange={setAndMark(setShowReviewerName)} />
                <ToggleRow label="Date" on={showDate} onChange={setAndMark(setShowDate)} />
                <ToggleRow label="Source logo" sub="Google G / WeHearYou mark" on={showSourceLogo} onChange={setAndMark(setShowSourceLogo)} />
                <ToggleRow label="Dark theme" on={darkTheme} onChange={setAndMark(setDarkTheme)} />
              </SectionCard>
            </>
          )}

          {/* ── BADGE ─────────────────────────────────────────────────────── */}
          {widgetType === "BADGE" && (
            <>
              <SectionCard title="Badge style">
                <div className="p-3 grid grid-cols-2 gap-2">
                  {BADGE_STYLES.map((bs) => (
                    <button
                      key={bs.id}
                      type="button"
                      onClick={() => {
                        setBadgeStyle(bs.id);
                        markUnsaved();
                      }}
                      className={`relative rounded-xl border-2 p-3 text-left transition-all ${
                        badgeStyle === bs.id
                          ? "border-indigo-600 bg-indigo-50"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      {badgeStyle === bs.id && (
                        <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-indigo-600 rounded-full text-white text-[9px] font-bold flex items-center justify-center">
                          ✓
                        </span>
                      )}
                      <p className="text-xs font-bold text-slate-900 mb-0.5">{bs.name}</p>
                      <p className="text-[10px] text-slate-500 leading-tight">{bs.desc}</p>
                    </button>
                  ))}
                </div>
              </SectionCard>

              <SectionCard title="Display settings">
                <ToggleRow label="Review count" on={showReviewCount} onChange={setAndMark(setShowReviewCount)} />
                <ToggleRow label="Link to Google reviews" on={showWriteReview} onChange={setAndMark(setShowWriteReview)} />
                <ToggleRow label="Dark theme" on={darkTheme} onChange={setAndMark(setDarkTheme)} />
              </SectionCard>
            </>
          )}

          {/* ── COLLECTING WIDGET ─────────────────────────────────────────── */}
          {widgetType === "COLLECTING" && (
            <>
              {/* Button Position */}
              <SectionCard title="Button position">
                <div className="p-3 grid grid-cols-2 gap-2">
                  {(
                    [
                      { id: "bottom-right", icon: "↘", label: "Bottom Right", desc: "Floating pill" },
                      { id: "bottom-left", icon: "↙", label: "Bottom Left", desc: "Floating pill" },
                      { id: "right", icon: "→", label: "Right Tab", desc: "Vertical side tab" },
                      { id: "left", icon: "←", label: "Left Tab", desc: "Vertical side tab" },
                    ] as const
                  ).map(({ id, icon, label, desc }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => { setCollectPosition(id); markUnsaved(); }}
                      className={`relative flex flex-col items-center gap-1 rounded-xl border-2 p-3 text-center transition-all ${
                        collectPosition === id
                          ? "border-indigo-600 bg-indigo-50"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      {collectPosition === id && (
                        <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-indigo-600 rounded-full text-white text-[9px] font-bold flex items-center justify-center">✓</span>
                      )}
                      <span className="text-xl">{icon}</span>
                      <span className="text-xs font-bold text-slate-900 leading-tight">{label}</span>
                      <span className="text-[10px] text-slate-500 leading-tight">{desc}</span>
                    </button>
                  ))}
                </div>
              </SectionCard>

              {/* Display Frequency */}
              <SectionCard title="Display frequency">
                <div className="p-3 flex flex-col gap-2">
                  {(
                    [
                      { id: "always", label: "Always", desc: "Show to every visitor" },
                      { id: "50pct", label: "50% of visitors", desc: "Show to half of sessions" },
                      { id: "33pct", label: "33% of visitors", desc: "Show to one in three sessions" },
                    ] as const
                  ).map(({ id, label, desc }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => { setCollectFreq(id); markUnsaved(); }}
                      className={`flex items-center justify-between rounded-lg border-2 p-3 transition-all ${
                        collectFreq === id
                          ? "border-indigo-600 bg-indigo-50"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <div className="text-left">
                        <p className="text-sm font-semibold text-slate-900">{label}</p>
                        <p className="text-xs text-slate-500">{desc}</p>
                      </div>
                      {collectFreq === id && (
                        <span className="text-xs font-bold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full flex-shrink-0">Selected</span>
                      )}
                    </button>
                  ))}
                  <p className="text-[11px] text-slate-400 px-1">Consistent per browser session using sessionStorage.</p>
                </div>
              </SectionCard>

              {/* Button Style */}
              <SectionCard title="Button style">
                <div className="p-3 grid grid-cols-3 gap-2">
                  {(
                    [
                      { id: "default", label: "Default", desc: "Solid filled" },
                      { id: "minimal", label: "Minimal", desc: "Outlined border" },
                      { id: "branded", label: "Branded", desc: "Bold brand color" },
                    ] as const
                  ).map(({ id, label, desc }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => { setCollectTheme(id); markUnsaved(); }}
                      className={`relative flex flex-col items-center gap-1 rounded-xl border-2 p-3 text-center transition-all ${
                        collectTheme === id
                          ? "border-indigo-600 bg-indigo-50"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      {collectTheme === id && (
                        <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-indigo-600 rounded-full text-white text-[9px] font-bold flex items-center justify-center">✓</span>
                      )}
                      <span className="text-xs font-bold text-slate-900">{label}</span>
                      <span className="text-[10px] text-slate-500 leading-tight">{desc}</span>
                    </button>
                  ))}
                </div>
              </SectionCard>

              {/* Button Color */}
              <SectionCard title="Button color">
                <div className="p-4 space-y-3">
                  <button
                    type="button"
                    onClick={() => { setCollectButtonColor(null); markUnsaved(); }}
                    className={`w-full flex items-center justify-between rounded-lg border-2 p-3 transition-all ${
                      collectButtonColor === null
                        ? "border-indigo-600 bg-indigo-50"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="text-left">
                      <p className="text-sm font-semibold text-slate-900">Inherit brand color</p>
                      <p className="text-xs text-slate-500">Uses the widget&apos;s primary color</p>
                    </div>
                    {collectButtonColor === null && (
                      <span className="text-xs font-bold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full flex-shrink-0">Active</span>
                    )}
                  </button>
                  <div>
                    <p className="text-xs font-bold text-slate-500 mb-1.5">Custom color override</p>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={collectButtonColor ?? widget.primaryColor ?? "#4338ca"}
                        onChange={(e) => { setCollectButtonColor(e.target.value); markUnsaved(); }}
                        className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={collectButtonColor ?? ""}
                        onChange={(e) => {
                          const v = e.target.value.trim();
                          setCollectButtonColor(/^#[0-9a-fA-F]{6}$/.test(v) ? v : null);
                          markUnsaved();
                        }}
                        placeholder="#4338ca"
                        className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-mono"
                      />
                    </div>
                  </div>
                </div>
              </SectionCard>

              {/* Mobile Behavior */}
              <SectionCard title="Mobile behavior">
                <div className="p-3 grid grid-cols-2 gap-2">
                  {(
                    [
                      { id: "pill", label: "Show on mobile", desc: "Render as pill button" },
                      { id: "hidden", label: "Hide on mobile", desc: "Don't render on small screens" },
                    ] as const
                  ).map(({ id, label, desc }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => { setCollectMobileBehavior(id); markUnsaved(); }}
                      className={`relative flex flex-col items-center gap-1 rounded-xl border-2 p-3 text-center transition-all ${
                        collectMobileBehavior === id
                          ? "border-indigo-600 bg-indigo-50"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      {collectMobileBehavior === id && (
                        <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-indigo-600 rounded-full text-white text-[9px] font-bold flex items-center justify-center">✓</span>
                      )}
                      <span className="text-xs font-bold text-slate-900">{label}</span>
                      <span className="text-[10px] text-slate-500 leading-tight">{desc}</span>
                    </button>
                  ))}
                </div>
              </SectionCard>

              {/* Active toggle */}
              <SectionCard title="Widget settings">
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Widget active</p>
                      <p className="text-xs text-slate-500">Show the collect button on embedded pages</p>
                    </div>
                    <Toggle on={isActive} onChange={setAndMark(setIsActive)} />
                  </div>
                </div>
              </SectionCard>
            </>
          )}

          {/* ── FLOATING WIDGET ──────────────────────────────────────── */}
          {widgetType === "FLOATING" && (
            <>
              {/* Card Style */}
              <SectionCard title="Card style">
                <div className="p-3 grid grid-cols-2 gap-2">
                  {(
                    [
                      { id: "dark_solid_pill", label: "Dark Solid Pill", desc: "High-contrast, always readable (default)" },
                      { id: "frosted_glass_pill", label: "Frosted Glass Pill", desc: "Modern translucent overlay" },
                      { id: "notification_compact", label: "Notification Compact", desc: "Small proof-pop notification" },
                      { id: "below_card", label: "Below Card", desc: "Reviewer info under the card" },
                    ] as const
                  ).map(({ id, label, desc }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => { setFloatingCardStyle(id); markUnsaved(); }}
                      className={`relative flex flex-col gap-1 rounded-xl border-2 p-3 text-left transition-all ${
                        floatingCardStyle === id ? "border-indigo-600 bg-indigo-50" : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      {floatingCardStyle === id && (
                        <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-indigo-600 rounded-full text-white text-[9px] font-bold flex items-center justify-center">✓</span>
                      )}
                      <span className="text-xs font-bold text-slate-900">{label}</span>
                      <span className="text-[10px] text-slate-500 leading-tight">{desc}</span>
                    </button>
                  ))}
                </div>
              </SectionCard>

              {/* Variation */}
              <SectionCard title="Variation">
                <div className="p-3 grid grid-cols-3 gap-2">
                  {(
                    [
                      { id: "compact", label: "Compact", desc: "Minimal" },
                      { id: "standard", label: "Standard", desc: "Recommended" },
                      { id: "rich", label: "Rich", desc: "2 cards desktop" },
                    ] as const
                  ).map(({ id, label, desc }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => { setFloatingVariation(id); markUnsaved(); }}
                      className={`relative flex flex-col items-center gap-1 rounded-xl border-2 p-3 text-center transition-all ${
                        floatingVariation === id ? "border-indigo-600 bg-indigo-50" : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      {floatingVariation === id && (
                        <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-indigo-600 rounded-full text-white text-[9px] font-bold flex items-center justify-center">✓</span>
                      )}
                      <span className="text-xs font-bold text-slate-900">{label}</span>
                      <span className="text-[10px] text-slate-500">{desc}</span>
                    </button>
                  ))}
                </div>
              </SectionCard>

              {/* Position */}
              <SectionCard title="Position">
                <div className="p-3 grid grid-cols-2 gap-2">
                  {(
                    [
                      { id: "bottom-right", icon: "↘", label: "Bottom Right" },
                      { id: "bottom-left", icon: "↙", label: "Bottom Left" },
                      { id: "right", icon: "→", label: "Right Edge" },
                      { id: "left", icon: "←", label: "Left Edge" },
                    ] as const
                  ).map(({ id, icon, label }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => { setFloatingPosition(id); markUnsaved(); }}
                      className={`relative flex items-center gap-2 rounded-xl border-2 p-3 transition-all ${
                        floatingPosition === id ? "border-indigo-600 bg-indigo-50" : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      {floatingPosition === id && (
                        <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-indigo-600 rounded-full text-white text-[9px] font-bold flex items-center justify-center">✓</span>
                      )}
                      <span className="text-lg">{icon}</span>
                      <span className="text-xs font-semibold text-slate-900">{label}</span>
                    </button>
                  ))}
                </div>
              </SectionCard>

              {/* Rotation */}
              <SectionCard title="Rotation">
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Auto-rotate reviews</p>
                      <p className="text-xs text-slate-500">Cycle through eligible reviews</p>
                    </div>
                    <Toggle on={floatingRotationEnabled} onChange={(v) => { setFloatingRotationEnabled(v); markUnsaved(); }} />
                  </div>
                  {floatingRotationEnabled && (
                    <div>
                      <p className="text-xs font-bold text-slate-500 mb-2">Rotation interval</p>
                      <div className="grid grid-cols-4 gap-2">
                        {([5, 8, 12, 30] as const).map((sec) => (
                          <button
                            key={sec}
                            type="button"
                            onClick={() => { setFloatingRotationIntervalSec(sec); markUnsaved(); }}
                            className={`rounded-lg border-2 p-2 text-center text-xs font-semibold transition-all ${
                              floatingRotationIntervalSec === sec ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-700 hover:border-slate-300"
                            }`}
                          >
                            {sec}s
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </SectionCard>

              {/* Accent Color */}
              <SectionCard title="Accent color">
                <div className="p-4 space-y-3">
                  <button
                    type="button"
                    onClick={() => { setFloatingAccentColorMode("inherit"); markUnsaved(); }}
                    className={`w-full flex items-center justify-between rounded-lg border-2 p-3 transition-all ${
                      floatingAccentColorMode === "inherit" ? "border-indigo-600 bg-indigo-50" : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="text-left">
                      <p className="text-sm font-semibold text-slate-900">Inherit brand color</p>
                      <p className="text-xs text-slate-500">Uses the widget&apos;s primary color</p>
                    </div>
                    {floatingAccentColorMode === "inherit" && <span className="text-xs font-bold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full">Active</span>}
                  </button>
                  <div>
                    <p className="text-xs font-bold text-slate-500 mb-1.5">Custom color</p>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={floatingAccentColor ?? widget.primaryColor ?? "#4338ca"}
                        onChange={(e) => { setFloatingAccentColor(e.target.value); setFloatingAccentColorMode("custom"); markUnsaved(); }}
                        className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={floatingAccentColor ?? ""}
                        onChange={(e) => {
                          const v = e.target.value.trim();
                          setFloatingAccentColor(/^#[0-9a-fA-F]{6}$/.test(v) ? v : null);
                          setFloatingAccentColorMode("custom");
                          markUnsaved();
                        }}
                        placeholder="#4338ca"
                        className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-mono"
                      />
                    </div>
                  </div>
                </div>
              </SectionCard>

              {/* Mobile + Frequency */}
              <SectionCard title="Mobile & frequency">
                <div className="p-3 space-y-3">
                  <div>
                    <p className="text-xs font-bold text-slate-500 mb-2">Mobile behavior</p>
                    <div className="grid grid-cols-3 gap-2">
                      {(
                        [
                          { id: "show", label: "Show", desc: "Normal" },
                          { id: "compact", label: "Compact", desc: "Force compact" },
                          { id: "hide", label: "Hide", desc: "Don't render" },
                        ] as const
                      ).map(({ id, label, desc }) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => { setFloatingMobileBehavior(id); markUnsaved(); }}
                          className={`relative flex flex-col items-center gap-0.5 rounded-xl border-2 p-2.5 text-center transition-all ${
                            floatingMobileBehavior === id ? "border-indigo-600 bg-indigo-50" : "border-slate-200 bg-white hover:border-slate-300"
                          }`}
                        >
                          {floatingMobileBehavior === id && (
                            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-indigo-600 rounded-full text-white text-[9px] font-bold flex items-center justify-center">✓</span>
                          )}
                          <span className="text-xs font-bold text-slate-900">{label}</span>
                          <span className="text-[9px] text-slate-500">{desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 mb-2">Display frequency</p>
                    <div className="flex flex-col gap-1.5">
                      {(
                        [
                          { id: "always", label: "Always", desc: "Every session" },
                          { id: "half", label: "50% of sessions", desc: "Half of visitors" },
                          { id: "third", label: "33% of sessions", desc: "One in three visitors" },
                        ] as const
                      ).map(({ id, label, desc }) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => { setFloatingDisplayFrequency(id); markUnsaved(); }}
                          className={`flex items-center justify-between rounded-lg border-2 p-2.5 transition-all ${
                            floatingDisplayFrequency === id ? "border-indigo-600 bg-indigo-50" : "border-slate-200 bg-white hover:border-slate-300"
                          }`}
                        >
                          <div className="text-left">
                            <p className="text-xs font-semibold text-slate-900">{label}</p>
                            <p className="text-[10px] text-slate-500">{desc}</p>
                          </div>
                          {floatingDisplayFrequency === id && <span className="text-[10px] font-bold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full">Selected</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </SectionCard>

              {/* Content filters */}
              <SectionCard title="Content filters">
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Approved only</p>
                      <p className="text-xs text-slate-500">Only show published/approved reviews</p>
                    </div>
                    <Toggle on={floatingApprovedOnly} onChange={(v) => { setFloatingApprovedOnly(v); markUnsaved(); }} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 mb-2">Minimum star rating</p>
                    <div className="flex gap-2">
                      {([4, 5] as const).map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => { setFloatingMinRating(r); markUnsaved(); }}
                          className={`flex-1 rounded-lg border-2 p-2 text-center text-sm font-bold transition-all ${
                            floatingMinRating === r ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-700 hover:border-slate-300"
                          }`}
                        >
                          {r}★+
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </SectionCard>

              {/* Active toggle */}
              <SectionCard title="Widget settings">
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Widget active</p>
                      <p className="text-xs text-slate-500">Show floating widget on embedded pages</p>
                    </div>
                    <Toggle on={isActive} onChange={setAndMark(setIsActive)} />
                  </div>
                </div>
              </SectionCard>
            </>
          )}

          {/* ── STICKY FOOTER ─────────────────────────────────────────────── */}
          <div className="flex flex-col gap-2 sticky bottom-0 bg-slate-50 pt-2 pb-1 border-t border-slate-200 -mx-0">
            <button
              type="button"
              onClick={handleSave}
              disabled={saveState === "saving"}
              className={`w-full rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-60 ${
                saveState === "error"
                  ? "border-red-300 bg-red-50 text-red-700"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {saveBtnLabel}
            </button>
            <button
              type="button"
              onClick={handlePublishClick}
              className="w-full rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 px-4 py-3 text-sm font-bold text-white shadow-sm hover:shadow-md transition-all"
            >
              🚀 Publish Widget
            </button>
          </div>
        </div>

        {/* RIGHT PANEL — LIVE PREVIEW */}
        <div>
          <div className="sticky top-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Live Preview</p>
                {(usingMockReviews || usingMockVideos) && widgetType !== "COLLECTING" && (
                  <p className="text-xs text-amber-600 mt-0.5">
                    Using sample data — sync reviews to see real content.
                  </p>
                )}
              </div>
              <div className="flex rounded-lg border border-slate-200 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setIsMobile(false)}
                  className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                    !isMobile ? "bg-indigo-600 text-white" : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  🖥 Desktop
                </button>
                <button
                  type="button"
                  onClick={() => setIsMobile(true)}
                  className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                    isMobile ? "bg-indigo-600 text-white" : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  📱 Mobile
                </button>
              </div>
            </div>

            {!isActive && (
              <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                ⚠ Widget is inactive — enable it in Widget settings to make it public.
              </div>
            )}

            {widget.health.status !== "healthy" && (
              <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                ⚠ {widget.health.message}
              </div>
            )}

            <div
              className={`overflow-hidden rounded-xl border border-slate-200 transition-all ${
                isMobile ? "max-w-[390px] mx-auto" : ""
              }`}
            >
              <ReviewWidgetPreview
                businessName={preview?.location.name ?? widget.location.name}
                avgRating={preview?.location.avgRating ?? widget.location.avgRating ?? 4.8}
                reviewCount={preview?.location.reviewCount ?? 5}
                reviews={
                  widgetType === "SINGLE_TESTIMONIAL" ? singlePreviewReviews : wallPreviewReviews
                }
                layout={previewLayout}
                widgetType={widgetType}
                contentType={previewContentType}
                badgeStyle={badgeStyle}
                showHeader={showHeader}
                showAvgRating={showAvgRating}
                showReviewCount={showReviewCount}
                headerAlign={widget.headerAlign ?? "left"}
                showRating={showRating}
                showReviewerName={showReviewerName}
                showDate={showDate}
                showWriteReview={showWriteReview}
                showResponses={widget.showResponses ?? false}
                showSourceLogo={showSourceLogo}
                bodyMaxChars={widget.bodyMaxChars ?? 280}
                primaryColor={widget.primaryColor ?? "#4338ca"}
                starColor={widget.starColor ?? "#f59e0b"}
                backgroundColor={darkTheme ? "#1e293b" : (widget.backgroundColor ?? "#ffffff")}
                textColor={darkTheme ? "#f1f5f9" : (widget.textColor ?? "#0f172a")}
                fontFamily={widget.fontFamily ?? "system"}
                reviewLink={preview?.location.reviewLink ?? widget.location.reviewLink ?? null}
                showNav={showNav}
                showPagination={showPagination}
                showBranding={showBranding}
                widgetTitle={title}
                videoTestimonials={
                  widgetType === "SINGLE_TESTIMONIAL" ? singlePreviewVideos : previewVideos
                }
                aiReviewSummary={preview?.location.aiReviewSummary ?? null}
                aiReviewSummaryReviewCount={preview?.location.aiReviewSummaryReviewCount ?? null}
                isMobile={isMobile}
                collectPosition={collectPosition}
                collectButtonColor={collectButtonColor}
                collectButtonTheme={collectTheme}
                collectMobileBehavior={collectMobileBehavior}
                floatingCardStyle={floatingCardStyle}
                floatingVariation={floatingVariation}
                floatingPosition={floatingPosition}
                floatingAccentColor={floatingAccentColorMode === "custom" ? (floatingAccentColor ?? widget.primaryColor ?? "#4338ca") : (widget.primaryColor ?? "#4338ca")}
              />
            </div>
          </div>
        </div>
      </div>

      {/* PUBLISH DRAWER */}
      {showPublishDrawer && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowPublishDrawer(false);
          }}
        >
          <div className="bg-white rounded-t-2xl w-full max-w-2xl mx-auto max-h-[85vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-5 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-950">🚀 Publish Widget</h2>
              <button
                type="button"
                onClick={() => setShowPublishDrawer(false)}
                className="text-slate-400 hover:text-slate-700 text-2xl leading-none"
              >
                ✕
              </button>
            </div>
            <div className="px-6 py-6 space-y-6">
              <p className="text-sm text-slate-600">
                Choose your platform for tailored install instructions, then copy the embed code.
              </p>

              {/* Platform selector */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  Select platform
                </p>
                <div className="grid grid-cols-6 gap-2">
                  {[
                    { id: "wordpress", icon: "🔷", name: "WordPress" },
                    { id: "shopify", icon: "🛍", name: "Shopify" },
                    { id: "webflow", icon: "🌊", name: "Webflow" },
                    { id: "squarespace", icon: "🟦", name: "Squarespace" },
                    { id: "wix", icon: "◼️", name: "Wix" },
                    { id: "html", icon: "🔧", name: "HTML" },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedPlatform(p.id)}
                      className={`flex flex-col items-center gap-1 rounded-xl border-2 p-2 transition-all ${
                        selectedPlatform === p.id
                          ? "border-indigo-600 bg-indigo-50"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <span className="text-xl">{p.icon}</span>
                      <span className="text-[10px] font-bold text-slate-700">{p.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Embed code */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Embed code
                </p>
                <div className="bg-slate-900 rounded-xl p-4 relative">
                  <pre className="text-xs font-mono text-sky-300 overflow-x-auto pr-16">
                    {embedCode}
                  </pre>
                  <button
                    type="button"
                    onClick={() => {
                      // Strip any newlines that may have crept into attribute values
                      const clean = embedCode.replace(/([a-z"'])(\s*\n\s*)([^\s<])/g, "$1$3");
                      navigator.clipboard.writeText(clean);
                      setCopySuccess(true);
                      setTimeout(() => setCopySuccess(false), 2000);
                    }}
                    className="absolute top-3 right-3 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                  >
                    {copySuccess ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>

              {/* Install steps */}
              <div>
                {(() => {
                  const currentPlatformSteps = getPlatformSteps(widgetType);
                  return (
                    <>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                        {currentPlatformSteps[selectedPlatform]?.title} installation
                      </p>
                      <ol className="space-y-2">
                        {currentPlatformSteps[selectedPlatform]?.steps.map((step, i) => (
                          <li key={i} className="flex gap-3">
                            <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                              {i + 1}
                            </span>
                            <span
                              className="text-sm text-slate-600"
                              dangerouslySetInnerHTML={{ __html: step }}
                            />
                          </li>
                        ))}
                      </ol>
                    </>
                  );
                })()}
                <div className="mt-4 rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800">
                  💡 <strong>Tip:</strong> Changes you make in the customizer apply automatically — you
                  won&apos;t need to re-paste the code unless you regenerate your widget token.
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowPublishDrawer(false)}
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Close
                </button>
                <a
                  href={localTestUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 text-center rounded-xl bg-slate-900 text-white px-6 py-2.5 text-sm font-bold hover:bg-slate-800 transition-colors"
                >
                  Open preview →
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
