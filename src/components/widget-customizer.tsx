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

  const embedCode = `<div id="why-reviews-widget"></div>\n<script src="${embedScriptUrl}" data-token="${widget.publicToken}" data-mount="#why-reviews-widget"></script>`;

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);

    const formData = new FormData();
    formData.append("widgetId", widget.id);
    formData.append("layout", layout);
    formData.append("name", title);
    formData.append("theme", darkTheme ? "dark" : "light");
    formData.append("isActive", isActive ? "on" : "off");

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
      {/* Layout Options Section */}
      <div className="rounded-2xl border border-slate-200 bg-white p-8">
        <h3 className="text-xl font-bold text-slate-950 mb-2">Layout options</h3>
        <p className="text-slate-600 mb-6">Select the layout for the widget</p>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
          {LAYOUT_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setLayout(option.value)}
              type="button"
              className={`relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 p-6 cursor-pointer transition-all hover:shadow-md ${
                layout === option.value
                  ? "border-indigo-600 bg-indigo-50"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <span className="text-3xl">
                {option.value === "carousel" ? "⟲" :
                 option.value === "slider" ? "→" :
                 option.value === "badge" ? "◉" :
                 option.value === "grid" ? "⊞" :
                 option.value === "list" ? "≡" : "⊟"}
              </span>
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-900">{option.label}</p>
                <p className="text-xs text-slate-500 mt-1">{option.description}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Main Content - Two Column */}
        <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr] pt-8 border-t border-slate-200">
          {/* Left Column - Configuration */}
          <form onSubmit={handleSave} className="space-y-6">
            {/* Edit Widget Options */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h4 className="text-base font-semibold text-slate-900 mb-5">Edit widget</h4>

              <div className="space-y-5">
                {/* Active Status */}
                <div className="flex items-start justify-between pb-5 border-b border-slate-200">
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">Widget status</p>
                    <p className="text-sm text-slate-600">
                      {isActive ? "Widget is active and will render publicly" : "Widget is inactive and will not render publicly"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsActive(!isActive)}
                    className={`ml-4 w-10 h-6 rounded-full transition-colors ${
                      isActive ? "bg-emerald-600" : "bg-slate-200"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition-all ${
                        isActive ? "translate-x-5" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                {/* Dark Theme Toggle */}
                <div className="flex items-start justify-between pb-5 border-b border-slate-200">
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">Dark theme</p>
                    <p className="text-sm text-slate-600">Use the dark version of the layout.</p>
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
                <div className="pb-5 border-b border-slate-200">
                  <p className="font-semibold text-slate-900 mb-2">Title</p>
                  <p className="text-sm text-slate-600 mb-3">Set the title to display at the top of your widget.</p>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Our Happy Clients!"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-normal"
                  />
                </div>

                {/* Navigation Arrows */}
                <div className="flex items-start justify-between pb-5 border-b border-slate-200">
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">Navigation arrows</p>
                    <p className="text-sm text-slate-600">Show arrows for navigation.</p>
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
                    <p className="text-sm text-slate-600">Display pagination controls below the widget.</p>
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
                <div className="flex items-start justify-between pb-5 border-b border-slate-200">
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">WeHearYou branding</p>
                    <p className="text-sm text-slate-600">Keep the WeHearYou branding visible in the widget.</p>
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

                {/* Display Options Header */}
                <div className="pt-5">
                  <p className="font-semibold text-slate-900 mb-4 text-sm uppercase tracking-wide text-slate-600">
                    Display options
                  </p>
                </div>

                {/* Show Header */}
                <div className="flex items-start justify-between pb-5 border-b border-slate-200">
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">Widget header</p>
                    <p className="text-sm text-slate-600">Display the Google Reviews header with rating.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowHeader(!showHeader)}
                    className={`ml-4 w-10 h-6 rounded-full transition-colors ${
                      showHeader ? "bg-indigo-600" : "bg-slate-200"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition-all ${
                        showHeader ? "translate-x-5" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                {/* Show Avg Rating */}
                <div className="flex items-start justify-between pb-5 border-b border-slate-200">
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">Average rating</p>
                    <p className="text-sm text-slate-600">Show the average rating in the header.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAvgRating(!showAvgRating)}
                    className={`ml-4 w-10 h-6 rounded-full transition-colors ${
                      showAvgRating ? "bg-indigo-600" : "bg-slate-200"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition-all ${
                        showAvgRating ? "translate-x-5" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                {/* Show Review Count */}
                <div className="flex items-start justify-between pb-5 border-b border-slate-200">
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">Review count</p>
                    <p className="text-sm text-slate-600">Show the total number of reviews.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowReviewCount(!showReviewCount)}
                    className={`ml-4 w-10 h-6 rounded-full transition-colors ${
                      showReviewCount ? "bg-indigo-600" : "bg-slate-200"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition-all ${
                        showReviewCount ? "translate-x-5" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                {/* Show Rating */}
                <div className="flex items-start justify-between pb-5 border-b border-slate-200">
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">Star ratings</p>
                    <p className="text-sm text-slate-600">Display star ratings on each review.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowRating(!showRating)}
                    className={`ml-4 w-10 h-6 rounded-full transition-colors ${
                      showRating ? "bg-indigo-600" : "bg-slate-200"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition-all ${
                        showRating ? "translate-x-5" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                {/* Show Reviewer Name */}
                <div className="flex items-start justify-between pb-5 border-b border-slate-200">
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">Reviewer names</p>
                    <p className="text-sm text-slate-600">Show reviewer names and avatars.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowReviewerName(!showReviewerName)}
                    className={`ml-4 w-10 h-6 rounded-full transition-colors ${
                      showReviewerName ? "bg-indigo-600" : "bg-slate-200"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition-all ${
                        showReviewerName ? "translate-x-5" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                {/* Show Date */}
                <div className="flex items-start justify-between pb-5 border-b border-slate-200">
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">Review dates</p>
                    <p className="text-sm text-slate-600">Show the date each review was posted.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowDate(!showDate)}
                    className={`ml-4 w-10 h-6 rounded-full transition-colors ${
                      showDate ? "bg-indigo-600" : "bg-slate-200"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition-all ${
                        showDate ? "translate-x-5" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                {/* Show Write Review */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">Write review button</p>
                    <p className="text-sm text-slate-600">Display a button to write a new review.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowWriteReview(!showWriteReview)}
                    className={`ml-4 w-10 h-6 rounded-full transition-colors ${
                      showWriteReview ? "bg-indigo-600" : "bg-slate-200"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition-all ${
                        showWriteReview ? "translate-x-5" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <button
              type="submit"
              disabled={isSaving}
              className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 px-4 py-3 text-sm font-semibold text-white transition-colors"
            >
              {isSaving ? "Saving..." : "Save changes"}
            </button>

            {/* Embed Section */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h4 className="text-sm font-semibold text-slate-900 mb-4">Embed code</h4>
              <textarea
                readOnly
                value={embedCode}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono mb-3 h-20"
              />
              <div className="flex gap-2">
                <CopyButton value={embedCode} label="Copy" copiedLabel="Copied!" />
                <a
                  href={localTestUrl}
                  className="flex-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 transition-colors text-center"
                >
                  Test page
                </a>
              </div>
            </div>
          </form>

          {/* Right Column - Preview */}
          <div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 sticky top-6">
              <h3 className="text-base font-semibold text-slate-950 mb-2">Live preview</h3>
              <p className="text-sm text-slate-600 mb-6">See how your widget will look on your website</p>

              {!isActive ? (
                <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  ⚠ Widget is inactive. Turn it on above to make it public.
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
                  reviewCount={preview?.location.reviewCount ?? 5}
                  reviews={(preview?.reviews && preview.reviews.length > 0) ? preview.reviews : MOCK_REVIEWS}
                  layout={layout}
                  showHeader={widget.showHeader !== false}
                  showAvgRating={widget.showAvgRating !== false}
                  showReviewCount={widget.showReviewCount !== false}
                  headerAlign={widget.headerAlign ?? "left"}
                  showRating={widget.showRating !== false}
                  showReviewerName={widget.showReviewerName !== false}
                  showDate={widget.showDate !== false}
                  showWriteReview={widget.showWriteReview !== false}
                  showResponses={widget.showResponses ?? false}
                  bodyMaxChars={widget.bodyMaxChars ?? 280}
                  primaryColor={widget.primaryColor ?? "#4338ca"}
                  starColor={widget.starColor ?? "#f59e0b"}
                  backgroundColor={widget.backgroundColor ?? "#ffffff"}
                  textColor={widget.textColor ?? "#0f172a"}
                  fontFamily={widget.fontFamily ?? "system"}
                  reviewLink={preview?.location.reviewLink ?? widget.location.reviewLink ?? null}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
