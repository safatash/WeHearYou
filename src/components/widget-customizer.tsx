"use client";

import { useState } from "react";
import { CopyButton } from "@/components/copy-button";
import { ReviewWidgetPreview } from "@/components/review-widget-preview";
import { updateReviewWidget } from "@/app/widgets/actions";

const LAYOUT_OPTIONS: Array<{ value: string; label: string; description: string }> = [
  { value: "carousel", label: "Carousel", description: "Rotating slides with navigation arrows" },
  { value: "slider", label: "Slider", description: "Horizontal scrolling reviews" },
  { value: "badge", label: "Badge", description: "Compact rating display" },
  { value: "grid", label: "Grid", description: "Multi-column card layout" },
  { value: "list", label: "List", description: "Vertical stacked reviews" },
  { value: "masonry", label: "Masonry", description: "Pinterest-style layout" },
  { value: "video", label: "Video", description: "Video testimonials showcase" },
];

// Mock reviews for preview when no real data is available
const MOCK_REVIEWS = [
  {
    id: "1",
    reviewerName: "Sarah Johnson",
    reviewerPhotoUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop",
    rating: 5,
    body: "Absolutely fantastic service! The team went above and beyond our expectations. Highly recommend!",
    reviewedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "2",
    reviewerName: "Michael Chen",
    reviewerPhotoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop",
    rating: 5,
    body: "Great experience from start to finish. Professional, reliable, and affordable. Will definitely work with them again.",
    reviewedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "3",
    reviewerName: "Emily Rodriguez",
    reviewerPhotoUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop",
    rating: 4,
    body: "Very satisfied with the results. Quick turnaround and excellent communication throughout.",
    reviewedAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "4",
    reviewerName: "David Thompson",
    reviewerPhotoUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop",
    rating: 5,
    body: "Best in the business. Attention to detail is unmatched. Exceeded all our requirements.",
    reviewedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "5",
    reviewerName: "Jessica Martinez",
    reviewerPhotoUrl: "https://images.unsplash.com/photo-1517046220482-f154ef686b18?w=400&h=400&fit=crop",
    rating: 5,
    body: "Outstanding customer service. They really care about their clients and it shows in their work.",
    reviewedAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

interface WidgetCustomizerProps {
  widget: any;
  preview: any;
  embedScriptUrl: string;
  localTestUrl: string;
}

export function WidgetCustomizer({
  widget,
  preview,
  embedScriptUrl,
  localTestUrl,
}: WidgetCustomizerProps) {
  const [layout, setLayout] = useState(widget.layout);
  const [darkTheme, setDarkTheme] = useState(widget.theme === "dark");
  const [title, setTitle] = useState(widget.name);
  const [showNav, setShowNav] = useState(true);
  const [showPagination, setShowPagination] = useState(true);
  const [showBranding, setShowBranding] = useState(true);
  const [isActive, setIsActive] = useState(widget.isActive);
  const [isSaving, setIsSaving] = useState(false);
  const [showHeader, setShowHeader] = useState(widget.showHeader !== false);
  const [showAvgRating, setShowAvgRating] = useState(widget.showAvgRating !== false);
  const [showReviewCount, setShowReviewCount] = useState(widget.showReviewCount !== false);
  const [showRating, setShowRating] = useState(widget.showRating !== false);
  const [showReviewerName, setShowReviewerName] = useState(widget.showReviewerName !== false);
  const [showDate, setShowDate] = useState(widget.showDate !== false);
  const [showWriteReview, setShowWriteReview] = useState(widget.showWriteReview !== false);
  const [showEmbedModal, setShowEmbedModal] = useState(false);

  // Generate dynamic embed code that reflects current selections
  const getEmbedCode = () => {
    const dataAttrs = [
      `data-token="${widget.publicToken}"`,
      `data-mount="#why-reviews-widget"`,
      `data-layout="${layout}"`,
      `data-theme="${darkTheme ? 'dark' : 'light'}"`,
      `data-show-nav="${showNav}"`,
      `data-show-pagination="${showPagination}"`,
      `data-show-branding="${showBranding}"`,
      `data-show-header="${showHeader}"`,
      `data-show-rating="${showRating}"`,
      `data-show-reviewer-name="${showReviewerName}"`,
      `data-show-date="${showDate}"`,
      `data-show-write-review="${showWriteReview}"`,
    ].join('\n  ');

    return `<div id="why-reviews-widget"></div>\n<script\n  src="${embedScriptUrl}"\n  ${dataAttrs}\n></script>`;
  };

  const embedCode = getEmbedCode();

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);

    const formData = new FormData();
    formData.append("widgetId", widget.id);
    formData.append("layout", layout);
    formData.append("name", title);
    formData.append("theme", darkTheme ? "dark" : "light");
    formData.append("isActive", isActive ? "on" : "off");

    // Layout controls
    if (showNav) formData.append("showNav", "on");
    if (showPagination) formData.append("showPagination", "on");
    if (showBranding) formData.append("showBranding", "on");

    // Display properties
    if (showHeader) formData.append("showHeader", "on");
    if (showAvgRating) formData.append("showAvgRating", "on");
    if (showReviewCount) formData.append("showReviewCount", "on");
    if (showRating) formData.append("showRating", "on");
    if (showReviewerName) formData.append("showReviewerName", "on");
    if (showDate) formData.append("showDate", "on");
    if (showWriteReview) formData.append("showWriteReview", "on");

    try {
      await updateReviewWidget(formData);
      // Optionally show a success message
    } catch (error) {
      console.error("Failed to save widget:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* LAYOUT SELECTION GALLERY */}
      <div className="rounded-lg border border-slate-200 bg-white p-3 overflow-hidden">
        <div className="mb-2">
          <h3 className="text-xs font-bold text-slate-950 uppercase tracking-wide">Layout</h3>
        </div>

        <div className="w-full overflow-x-auto pb-0.5 -mx-3 px-3">
          <div className="flex gap-2 w-max">
            {LAYOUT_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setLayout(option.value)}
                type="button"
                className={`relative flex-shrink-0 w-28 h-auto flex flex-col items-center justify-center gap-1 rounded-md border-2 p-2 cursor-pointer transition-all hover:shadow-sm ${
                  layout === option.value
                    ? "border-indigo-600 bg-indigo-50"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <span className="text-2xl">
                  {option.value === "carousel" ? "⟲" :
                   option.value === "slider" ? "→" :
                   option.value === "badge" ? "◉" :
                   option.value === "grid" ? "⊞" :
                   option.value === "list" ? "≡" :
                   option.value === "video" ? "▶" : "⊟"}
                </span>
                <div className="text-center">
                  <p className="text-xs font-semibold text-slate-900 leading-tight">{option.label}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* MAIN CONFIGURATION AREA - Three Column */}
      <div className="grid gap-6 lg:grid-cols-[0.75fr_2fr] pt-2">
        {/* LEFT PANEL - Settings */}
        <form onSubmit={handleSave} className="space-y-6">
          {/* BASIC SETTINGS */}
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h4 className="text-sm font-semibold text-slate-900 mb-5 uppercase tracking-wide">Basic Settings</h4>

            <div className="space-y-5">
              {/* Active */}
              <div className="flex items-start justify-between pb-5 border-b border-slate-200">
                <div className="flex-1">
                  <p className="font-semibold text-slate-900">Widget active</p>
                  <p className="text-sm text-slate-600">Public embed shows reviews</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsActive(!isActive)}
                  className={`ml-4 w-10 h-6 rounded-full transition-colors ${
                    isActive ? "bg-indigo-600" : "bg-slate-200"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-all ${
                      isActive ? "translate-x-5" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {/* Theme */}
              <div className="flex items-start justify-between pb-5 border-b border-slate-200">
                <div className="flex-1">
                  <p className="font-semibold text-slate-900">Dark theme</p>
                  <p className="text-sm text-slate-600">Use dark colors</p>
                </div>
                <button
                  type="button"
                  onClick={() => setDarkTheme(!darkTheme)}
                  className={`ml-4 w-10 h-6 rounded-full transition-colors ${
                    darkTheme ? "bg-indigo-600" : "bg-slate-200"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-all ${
                      darkTheme ? "translate-x-5" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {/* Title */}
              <div>
                <p className="font-semibold text-slate-900 mb-2">Widget title</p>
                <p className="text-sm text-slate-600 mb-3">Display at the top of your widget</p>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Our Happy Clients!"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-normal"
                />
              </div>
            </div>
          </div>

          {/* LAYOUT CONTROLS */}
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h4 className="text-sm font-semibold text-slate-900 mb-5 uppercase tracking-wide">Layout Controls</h4>

            <div className="space-y-5">
              {/* Navigation Arrows */}
              <div className="flex items-start justify-between pb-5 border-b border-slate-200">
                <div className="flex-1">
                  <p className="font-semibold text-slate-900">Navigation arrows</p>
                  <p className="text-sm text-slate-600">Show navigation controls</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowNav(!showNav)}
                  className={`ml-4 w-10 h-6 rounded-full transition-colors ${
                    showNav ? "bg-indigo-600" : "bg-slate-200"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-all ${
                      showNav ? "translate-x-5" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {/* Pagination */}
              <div className="flex items-start justify-between pb-5 border-b border-slate-200">
                <div className="flex-1">
                  <p className="font-semibold text-slate-900">Pagination</p>
                  <p className="text-sm text-slate-600">Show pagination controls</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPagination(!showPagination)}
                  className={`ml-4 w-10 h-6 rounded-full transition-colors ${
                    showPagination ? "bg-indigo-600" : "bg-slate-200"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-all ${
                      showPagination ? "translate-x-5" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {/* Branding */}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-semibold text-slate-900">WeHearYou branding</p>
                  <p className="text-sm text-slate-600">Show branding footer</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowBranding(!showBranding)}
                  className={`ml-4 w-10 h-6 rounded-full transition-colors ${
                    showBranding ? "bg-indigo-600" : "bg-slate-200"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-all ${
                      showBranding ? "translate-x-5" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* DISPLAY OPTIONS */}
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h4 className="text-sm font-semibold text-slate-900 mb-5 uppercase tracking-wide">Display Options</h4>

            <div className="space-y-4 text-sm">
              {/* Show Header */}
              <div className="flex items-center justify-between">
                <label className="flex-1 cursor-pointer">
                  <p className="font-semibold text-slate-900">Widget header</p>
                  <p className="text-slate-600">Show Google rating header</p>
                </label>
                <button
                  type="button"
                  onClick={() => setShowHeader(!showHeader)}
                  className={`ml-4 w-8 h-5 rounded-full transition-colors flex-shrink-0 ${
                    showHeader ? "bg-indigo-600" : "bg-slate-200"
                  }`}
                >
                  <div
                    className={`w-3 h-3 rounded-full bg-white transition-all mt-1 ${
                      showHeader ? "translate-x-4" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {/* Show Rating */}
              <div className="flex items-center justify-between">
                <label className="flex-1 cursor-pointer">
                  <p className="font-semibold text-slate-900">Star ratings</p>
                  <p className="text-slate-600">Show stars on reviews</p>
                </label>
                <button
                  type="button"
                  onClick={() => setShowRating(!showRating)}
                  className={`ml-4 w-8 h-5 rounded-full transition-colors flex-shrink-0 ${
                    showRating ? "bg-indigo-600" : "bg-slate-200"
                  }`}
                >
                  <div
                    className={`w-3 h-3 rounded-full bg-white transition-all mt-1 ${
                      showRating ? "translate-x-4" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {/* Show Reviewer Name */}
              <div className="flex items-center justify-between">
                <label className="flex-1 cursor-pointer">
                  <p className="font-semibold text-slate-900">Reviewer names</p>
                  <p className="text-slate-600">Show names & avatars</p>
                </label>
                <button
                  type="button"
                  onClick={() => setShowReviewerName(!showReviewerName)}
                  className={`ml-4 w-8 h-5 rounded-full transition-colors flex-shrink-0 ${
                    showReviewerName ? "bg-indigo-600" : "bg-slate-200"
                  }`}
                >
                  <div
                    className={`w-3 h-3 rounded-full bg-white transition-all mt-1 ${
                      showReviewerName ? "translate-x-4" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {/* Show Date */}
              <div className="flex items-center justify-between">
                <label className="flex-1 cursor-pointer">
                  <p className="font-semibold text-slate-900">Review dates</p>
                  <p className="text-slate-600">Show when reviewed</p>
                </label>
                <button
                  type="button"
                  onClick={() => setShowDate(!showDate)}
                  className={`ml-4 w-8 h-5 rounded-full transition-colors flex-shrink-0 ${
                    showDate ? "bg-indigo-600" : "bg-slate-200"
                  }`}
                >
                  <div
                    className={`w-3 h-3 rounded-full bg-white transition-all mt-1 ${
                      showDate ? "translate-x-4" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {/* Show Write Review */}
              <div className="flex items-center justify-between">
                <label className="flex-1 cursor-pointer">
                  <p className="font-semibold text-slate-900">Write review button</p>
                  <p className="text-slate-600">Let users add reviews</p>
                </label>
                <button
                  type="button"
                  onClick={() => setShowWriteReview(!showWriteReview)}
                  className={`ml-4 w-8 h-5 rounded-full transition-colors flex-shrink-0 ${
                    showWriteReview ? "bg-indigo-600" : "bg-slate-200"
                  }`}
                >
                  <div
                    className={`w-3 h-3 rounded-full bg-white transition-all mt-1 ${
                      showWriteReview ? "translate-x-4" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* EMBED CODE BUTTON */}
          <button
            type="button"
            onClick={() => setShowEmbedModal(true)}
            className="w-full rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition-colors"
          >
            View Embed Code
          </button>

          {/* SAVE BUTTON */}
          <button
            type="submit"
            disabled={isSaving}
            className="w-full rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 disabled:opacity-50 px-4 py-3 text-sm font-semibold text-white transition-all shadow-sm hover:shadow-md"
          >
            {isSaving ? "Saving..." : "Save changes"}
          </button>
        </form>

        {/* RIGHT PANEL - Live Preview */}
        <div>
          <div className="rounded-xl border border-slate-200 bg-white p-6 sticky top-6">
            <h3 className="text-sm font-semibold text-slate-950 mb-1 uppercase tracking-wide">Live Preview</h3>
            <p className="text-xs text-slate-600 mb-6">See how your widget will look</p>

            {!isActive ? (
              <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                ⚠ Widget is inactive. Toggle &ldquo;Widget active&rdquo; and save to make it public.
              </div>
            ) : null}

            {widget.health.status !== "healthy" ? (
              <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                ⚠ Not fully ready. {widget.health.message}
              </div>
            ) : null}

            <div className="overflow-hidden rounded-lg border border-slate-200">
              <ReviewWidgetPreview
                businessName={preview?.location.name ?? widget.location.name}
                avgRating={preview?.location.avgRating ?? widget.location.avgRating ?? 4.8}
                reviewCount={preview?.reviewCount ?? 5}
                reviews={(preview?.reviews && preview.reviews.length > 0) ? preview.reviews : MOCK_REVIEWS}
                layout={layout}
                showHeader={showHeader}
                showAvgRating={showAvgRating}
                showReviewCount={showReviewCount}
                headerAlign={widget.headerAlign ?? "left"}
                showRating={showRating}
                showReviewerName={showReviewerName}
                showDate={showDate}
                showWriteReview={showWriteReview}
                showResponses={widget.showResponses ?? false}
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
              />
            </div>
          </div>
        </div>
      </div>

      {/* EMBED CODE MODAL */}
      {showEmbedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-5 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-950">Ready to embed!</h2>
              <button
                type="button"
                onClick={() => setShowEmbedModal(false)}
                className="text-slate-500 hover:text-slate-700 text-2xl leading-none"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="px-6 py-6 space-y-6">
              {/* Instructions */}
              <div>
                <h3 className="text-base font-semibold text-slate-900 mb-2">Copy and paste the code into your website</h3>
                <p className="text-sm text-slate-600">This includes all your current settings (layout, theme, display options, etc.)</p>
              </div>

              {/* Embed Code */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">HTML Code</p>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 overflow-x-auto">
                  <pre className="text-xs font-mono text-slate-900 whitespace-pre-wrap break-words">
                    {embedCode}
                  </pre>
                </div>
                <div className="flex gap-2">
                  <CopyButton value={embedCode} label="Copy code" copiedLabel="Copied!" />
                  <a
                    href={localTestUrl}
                    className="flex-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 transition-colors text-center"
                  >
                    Test page
                  </a>
                </div>
              </div>

              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">How to use:</h4>
                <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                  <li>Copy the code above</li>
                  <li>Go to your website's HTML editor or theme customizer</li>
                  <li>Paste the code where you want the widget to appear</li>
                  <li>Save your changes</li>
                </ol>
              </div>

              {/* Note */}
              <div className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-4">
                <p>
                  <strong>💡 Note:</strong> The embed code includes data attributes that reflect your current configuration. When you change settings in this panel, the embed code updates automatically. You'll need to re-copy and paste the updated code to apply new changes to your website.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-white border-t border-slate-200 px-6 py-4 flex justify-end">
              <button
                type="button"
                onClick={() => setShowEmbedModal(false)}
                className="rounded-lg bg-slate-100 hover:bg-slate-200 px-6 py-2 text-sm font-semibold text-slate-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
