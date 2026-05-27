"use client";

import { useState } from "react";

type RatingOption = { value: number; label: string; shortLabel: string; icon: string };

export function FunnelRatingForm({
  slug,
  submitAction,
  reviewLink,
  filterEnabled = false,
  filterThreshold = 4,
  ratingMode = "stars",
  ratingOptions,
}: {
  slug: string;
  submitAction: (formData: FormData) => Promise<void>;
  reviewLink?: string | null;
  filterEnabled?: boolean;
  filterThreshold?: number;
  ratingMode?: "stars" | "faces" | "thumbs";
  ratingOptions?: readonly RatingOption[];
}) {
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isStars = ratingMode === "stars";

  const handleRatingClick = (rating: number) => {
    if (!filterEnabled) {
      handleSubmit(rating, "");
      return;
    }
    if (rating >= filterThreshold) {
      handleSubmit(rating, "");
    } else {
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

  // Feedback view (low rating selected with filter on)
  if (selectedRating !== null && filterEnabled && selectedRating < filterThreshold) {
    return (
      <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-8 space-y-6">
        <div>
          <p className="text-lg font-semibold text-slate-900 mb-4">Rate your experience</p>
          {isStars ? (
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setSelectedRating(n)} onMouseEnter={() => setHoverRating(n)} onMouseLeave={() => setHoverRating(null)} type="button">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" className={`transition-all duration-200 ${n <= (hoverRating ?? selectedRating) ? "text-emerald-500" : "text-slate-300"}`}>
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex gap-3">
              {ratingOptions?.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSelectedRating(opt.value)}
                  type="button"
                  className={`text-3xl transition-all duration-150 ${opt.value === selectedRating ? "scale-125 opacity-100" : "opacity-50 hover:opacity-80"}`}
                >
                  {opt.icon}
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <p className="text-lg font-semibold text-slate-900 mb-4">Send a message directly to our team</p>
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

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">Name</label>
            <input type="text" placeholder="Your name" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">Email</label>
            <input type="email" placeholder="your@email.com" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100" />
          </div>
        </div>

        <button onClick={handleFeedbackSubmit} disabled={isSubmitting} className="w-full rounded-2xl bg-emerald-500 hover:bg-emerald-600 px-5 py-4 text-base font-semibold text-white shadow-sm transition disabled:opacity-60">
          {isSubmitting ? "Sending..." : "Send →"}
        </button>

        {reviewLink && (
          <div className="pt-2 border-t border-slate-200">
            <a href={reviewLink} target="_blank" rel="noopener noreferrer" className="block text-center rounded-2xl border-2 border-emerald-500 text-emerald-600 px-5 py-3 text-sm font-semibold hover:bg-emerald-50 transition">
              I prefer to write a review →
            </a>
          </div>
        )}
      </div>
    );
  }

  // Star rating view
  if (isStars) {
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
                  hoverRating !== null && rating <= hoverRating ? "text-amber-400 scale-125" : "text-slate-300"
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

  // Faces / thumbs view — emoji buttons
  const isThumbs = ratingMode === "thumbs";
  return (
    <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-8">
      <p className="text-sm font-semibold text-slate-700 text-center">Choose a rating</p>
      <div className={`mt-8 flex justify-center ${isThumbs ? "gap-10" : "gap-6 sm:gap-10"}`}>
        {ratingOptions?.map((opt) => (
          <button
            key={opt.value}
            onClick={() => handleRatingClick(opt.value)}
            onMouseEnter={() => setHoverRating(opt.value)}
            onMouseLeave={() => setHoverRating(null)}
            disabled={isSubmitting}
            type="button"
            className="flex flex-col items-center gap-2 transition-all"
          >
            <span
              className={`transition-all duration-200 select-none ${isThumbs ? "text-6xl" : "text-5xl"} ${
                hoverRating === opt.value ? "scale-125" : ""
              }`}
            >
              {opt.icon}
            </span>
            <span className={`text-xs font-medium ${hoverRating === opt.value ? "text-slate-700" : "text-slate-400"}`}>
              {opt.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
