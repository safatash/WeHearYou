"use client";

import { useState } from "react";
import type { ReactNode } from "react";

export function FunnelRatingForm({
  slug,
  submitAction,
  reviewLink,
  filterEnabled = false,
  filterThreshold = 4,
}: {
  slug: string;
  submitAction: (formData: FormData) => Promise<void>;
  reviewLink?: string | null;
  filterEnabled?: boolean;
  filterThreshold?: number;
}) {
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRatingClick = (rating: number) => {
    // If filter is OFF, all ratings submit directly without feedback form
    if (!filterEnabled) {
      handleSubmit(rating, "");
      return;
    }

    // If filter is ON, use threshold to decide
    if (rating >= filterThreshold) {
      // Rating meets threshold - submit directly
      handleSubmit(rating, "");
    } else {
      // Rating below threshold - show feedback form
      setSelectedRating(rating);
    }
  };

  const handleSubmit = async (rating: number, feedbackText: string) => {
    setIsSubmitting(true);
    const formData = new FormData();
    formData.append("slug", slug);
    formData.append("rating", String(rating));
    if (feedbackText) {
      formData.append("feedback", feedbackText);
    }
    await submitAction(formData);
  };

  const handleFeedbackSubmit = async () => {
    if (selectedRating !== null) {
      await handleSubmit(selectedRating, feedback);
    }
  };

  if (selectedRating !== null && filterEnabled && selectedRating < filterThreshold) {
    return (
      <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-8 space-y-6">
        {/* Rating Display */}
        <div>
          <p className="text-lg font-semibold text-slate-900 mb-4">Rate your experience</p>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((rating) => (
              <button
                key={rating}
                onClick={() => setSelectedRating(rating)}
                onMouseEnter={() => setHoverRating(rating)}
                onMouseLeave={() => setHoverRating(null)}
                type="button"
              >
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className={`transition-all duration-200 ${
                    rating <= selectedRating ? "text-emerald-500" : "text-slate-300"
                  }`}
                >
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              </button>
            ))}
          </div>
        </div>

        {/* Message Section */}
        <div>
          <p className="text-lg font-semibold text-slate-900 mb-4">
            Send a message directly to our team
          </p>
          <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm text-slate-600 leading-relaxed">
              We're sorry you had a bad experience. You can use this form to contact our customer service team and give us an opportunity to resolve any problem or complaint you have before leaving a review.
            </p>
          </div>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Your message..."
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 min-h-24"
          />
        </div>

        {/* Form Fields */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">Name</label>
            <input
              type="text"
              placeholder="Your name"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">Email</label>
            <input
              type="email"
              placeholder="your@email.com"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>
        </div>

        {/* Primary Button */}
        <button
          onClick={handleFeedbackSubmit}
          disabled={isSubmitting}
          className="w-full rounded-2xl bg-emerald-500 hover:bg-emerald-600 px-5 py-4 text-base font-semibold text-white shadow-sm transition disabled:opacity-60"
        >
          {isSubmitting ? "Sending..." : "Send →"}
        </button>

        {/* Secondary Link */}
        {reviewLink && (
          <div className="pt-2 border-t border-slate-200">
            <a
              href={reviewLink}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-center rounded-2xl border-2 border-emerald-500 text-emerald-600 px-5 py-3 text-sm font-semibold hover:bg-emerald-50 transition"
            >
              I prefer to write a review →
            </a>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-8">
      <p className="text-sm font-semibold text-slate-700 text-center">Choose a rating</p>
      <div className="mt-8 flex justify-center gap-4 sm:gap-6">
        {[1, 2, 3, 4, 5].map((rating) => (
          <button
            key={rating}
            onClick={() => handleRatingClick(rating)}
            onMouseEnter={() => setHoverRating(rating)}
            onMouseLeave={() => setHoverRating(null)}
            disabled={isSubmitting}
            type="button"
            className="transition-all"
          >
            <svg
              width="60"
              height="60"
              viewBox="0 0 24 24"
              fill="currentColor"
              className={`transition-all duration-200 ${
                hoverRating !== null && rating <= hoverRating
                  ? "text-amber-400 scale-125"
                  : rating <= (hoverRating ?? -1)
                  ? "text-amber-400"
                  : "text-slate-300"
              } disabled:opacity-60`}
            >
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
}
