"use client";

import { useState } from "react";
import { submitReviewRating } from "./actions";

type RatingOption = { value: number; label: string; shortLabel: string; icon: string };

export function TokenRatingForm({
  token,
  ratingMode = "stars",
  ratingOptions,
}: {
  token: string;
  ratingMode?: "stars" | "faces" | "thumbs";
  ratingOptions?: readonly RatingOption[];
}) {
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClick = async (rating: number) => {
    setIsSubmitting(true);
    const formData = new FormData();
    formData.append("token", token);
    formData.append("rating", String(rating));
    formData.append("ratingMode", ratingMode ?? "stars");
    await submitReviewRating(formData);
  };

  if (ratingMode === "stars") {
    return (
      <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-8">
        <p className="text-sm font-semibold text-slate-700 text-center">Choose a rating</p>
        <div className="mt-8 flex justify-center gap-4 sm:gap-6">
          {[1, 2, 3, 4, 5].map((rating) => (
            <button
              key={rating}
              onClick={() => handleClick(rating)}
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

  const isThumbs = ratingMode === "thumbs";
  return (
    <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-8">
      <p className="text-sm font-semibold text-slate-700 text-center">Choose a rating</p>
      <div className={`mt-8 flex justify-center ${isThumbs ? "gap-10" : "gap-6 sm:gap-10"}`}>
        {ratingOptions?.map((opt) => (
          <button
            key={opt.value}
            onClick={() => handleClick(opt.value)}
            onMouseEnter={() => setHoverRating(opt.value)}
            onMouseLeave={() => setHoverRating(null)}
            disabled={isSubmitting}
            type="button"
            className="flex flex-col items-center gap-2 transition-all"
          >
            <span
              className={`select-none transition-all duration-200 ${isThumbs ? "text-6xl" : "text-5xl"} ${
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
