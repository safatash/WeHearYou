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
};

type WidgetTypeKey = "WALL_OF_LOVE" | "SINGLE_TESTIMONIAL" | "BADGE" | "COLLECTING";
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

const PLATFORM_STEPS: Record<string, { title: string; steps: string[] }> = {
  wordpress: {
    title: "WordPress",
    steps: [
      "In your WordPress editor, add a <strong>Custom HTML</strong> block where you want the widget.",
      "Paste the embed code into the HTML block.",
      "Click <strong>Update</strong> or <strong>Publish</strong> to save. The widget appears within seconds.",
    ],
  },
  shopify: {
    title: "Shopify",
    steps: [
      "Go to <strong>Online Store → Themes → Edit code</strong>.",
      "Open the template file for the page (e.g. <code>index.liquid</code>).",
      "Paste the embed code and save the file.",
    ],
  },
  webflow: {
    title: "Webflow",
    steps: [
      "In your Webflow project, add an <strong>Embed</strong> element to the canvas.",
      "Paste the embed code into the embed block.",
      "Publish your site.",
    ],
  },
  squarespace: {
    title: "Squarespace",
    steps: [
      "Edit your page and add a <strong>Code Block</strong>.",
      "Paste the embed code into the code block.",
      "Save and publish your changes.",
    ],
  },
  wix: {
    title: "Wix",
    steps: [
      "In the Wix Editor, add an <strong>HTML iframe</strong> element.",
      "Click <strong>Enter Code</strong> and paste the embed code.",
      "Save and publish your site.",
    ],
  },
  html: {
    title: "Custom HTML",
    steps: [
      "Copy the embed code above.",
      "Paste it into your HTML where you want the widget to appear.",
      "Deploy or save your file.",
    ],
  },
};

// ─── Backward-compat helpers ──────────────────────────────────────────────────

function deriveWidgetType(widget: { widgetType?: string | null; layout: string }): WidgetTypeKey {
  if (widget.widgetType) return widget.widgetType as WidgetTypeKey;
  if (widget.layout === "badge") return "BADGE";
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
    floating: "grid",
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
  { id: "mv1", submitterName: "Alex Rivera", videoUrl: "", durationSeconds: 42, publishedAt: new Date(Date.now() - 5 * 86400000).toISOString() },
  { id: "mv2", submitterName: "Priya Patel", videoUrl: "", durationSeconds: 65, publishedAt: new Date(Date.now() - 12 * 86400000).toISOString() },
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
    : preview.videoTestimonials!.map((v) => ({ ...v, submitterName: v.submitterName ?? "" }));

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
    ? [{ ...selectedVideo, submitterName: selectedVideo.submitterName ?? "" }]
    : previewVideos.slice(0, 1);

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

  const embedCode = `<div id="why-reviews-widget"></div>\n<script src="${embedScriptUrl}" data-token="${widget.publicToken}" data-mount="#why-reviews-widget"></script>`;

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
        {(["WALL_OF_LOVE", "SINGLE_TESTIMONIAL", "BADGE"] as WidgetTypeKey[]).map((type) => {
          const labels: Record<string, string> = {
            WALL_OF_LOVE: "🧱 Wall of Love",
            SINGLE_TESTIMONIAL: "✦ Single Testimonial",
            BADGE: "⭐ Badge",
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
        <div className="relative group flex-shrink-0 px-5 py-3 text-sm font-semibold text-slate-300 cursor-default select-none">
          📥 Collecting Widget
          <span className="ml-1.5 text-[10px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded-full font-bold uppercase">
            Soon
          </span>
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-slate-800 text-white text-xs rounded-lg px-3 py-2 w-56 text-center z-10 shadow-lg pointer-events-none">
            Collect reviews and testimonials directly from your website. Coming soon.
          </div>
        </div>
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
                {(usingMockReviews || usingMockVideos) && (
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
                  widgetType === "SINGLE_TESTIMONIAL" ? singlePreviewReviews : previewReviews
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
                  <pre className="text-xs font-mono text-sky-300 whitespace-pre-wrap break-words pr-16">
                    {embedCode}
                  </pre>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(embedCode);
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
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  {PLATFORM_STEPS[selectedPlatform]?.title} installation
                </p>
                <ol className="space-y-2">
                  {PLATFORM_STEPS[selectedPlatform]?.steps.map((step, i) => (
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
