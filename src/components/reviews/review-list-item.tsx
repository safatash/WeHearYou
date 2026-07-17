"use client";

import { useState } from "react";
import { formatReviewDate, stars, truncateReviewBody, type ReviewWithRelations } from "@/lib/reviews";

interface ReviewListItemProps {
  review: ReviewWithRelations;
  selected: boolean;
  filterHref: string;
  aiReplyEnabled: boolean;
}

export function ReviewListItem({
  review,
  selected,
  filterHref,
  aiReplyEnabled,
}: ReviewListItemProps) {
  const [isExpanded, setIsExpanded] = useState(selected);
  const [selectedTone, setSelectedTone] = useState<string | null>(null);
  const [replyText, setReplyText] = useState(review.replyDraft || "");

  // Helper: Extract initials from reviewer name
  const getAvatarInitials = () => {
    const names = review.reviewerName.trim().split(/\s+/);
    if (names.length >= 2) {
      return (names[0]?.[0] || "") + (names[1]?.[0] || "");
    }
    return review.reviewerName.charAt(0).toUpperCase();
  };

  // Helper: Determine status badge
  const getStatusBadge = () => {
    if (review.replyPublishedAt || review.replySentAt) {
      return {
        label: "Replied",
        color: "bg-emerald-50",
        textColor: "text-emerald-700",
        dotColor: "bg-emerald-600",
      };
    }
    if (review.rating && review.rating < 4) {
      return {
        label: "Needs attention",
        color: "bg-red-50",
        textColor: "text-red-700",
        dotColor: "bg-red-600",
      };
    }
    return {
      label: "Needs reply",
      color: "bg-amber-50",
      textColor: "text-amber-700",
      dotColor: "bg-amber-600",
    };
  };

  // Helper: Format time ago
  const formatTimeAgo = (date: Date | null): string => {
    if (!date) return "No date";

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return formatReviewDate(date);
  };

  const statusBadge = getStatusBadge();
  const toneOptions = ["Warm", "Professional", "Concise", "Apologetic"];

  return (
    <div
      className={`rounded-2xl border border-l-4 border-l-teal-600 bg-white shadow-sm transition-colors cursor-pointer ${
        isExpanded ? "border-slate-300" : "border-slate-200 hover:border-slate-300"
      }`}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      {/* Header section */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          {/* Avatar, name, and stars */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-700">
              {getAvatarInitials()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-semibold text-slate-900">{review.reviewerName}</p>
                {review.source === "GOOGLE" && (
                  <span className="flex-shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                    Google
                  </span>
                )}
              </div>
              <p className="text-xs text-amber-500 mt-0.5">{stars(review.rating ?? 0)}</p>
            </div>
          </div>

          {/* Time and status badge */}
          <div className="flex flex-shrink-0 flex-col items-end gap-2">
            <p className="text-xs text-slate-400">{formatTimeAgo(review.reviewedAt)}</p>
            <div
              className={`inline-flex items-center gap-1 rounded-full ${statusBadge.color} px-2 py-1 text-[10px] font-semibold ${statusBadge.textColor}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${statusBadge.dotColor}`}></span>
              {statusBadge.label}
            </div>
          </div>
        </div>

        {/* Location and review date if available */}
        {review.location && (
          <p className="mt-2 text-xs text-slate-500">{review.location.name}</p>
        )}

        {/* Review body */}
        <p className="mt-3 text-sm leading-5 text-slate-700">{truncateReviewBody(review.body, 220)}</p>

        {/* Action buttons */}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            className="rounded-lg bg-teal-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-teal-700 transition"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(true);
            }}
          >
            Reply
          </button>
          <button
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
            onClick={(e) => e.stopPropagation()}
          >
            Flag
          </button>
          {review.source === "GOOGLE" && (
            <button
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
              onClick={(e) => e.stopPropagation()}
            >
              Open on Google
            </button>
          )}
          <button
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-50 transition"
            onClick={(e) => e.stopPropagation()}
          >
            Delete
          </button>
        </div>
      </div>

      {/* Expanded section */}
      {isExpanded && aiReplyEnabled && (
        <div className="border-t border-slate-200 p-4">
          {/* AI Suggestion header */}
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-900">AI Suggestion</h3>
            <button
              className="text-xs font-semibold text-teal-600 hover:text-teal-700 transition"
              onClick={(e) => e.stopPropagation()}
            >
              Regenerate
            </button>
          </div>

          {/* Tone buttons */}
          <div className="flex flex-wrap gap-2 mb-4">
            {toneOptions.map((tone) => (
              <button
                key={tone}
                className={`rounded-lg border px-3 py-1.5 text-sm font-semibold transition ${
                  selectedTone === tone
                    ? "border-teal-600 bg-teal-50 text-teal-700"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedTone(tone);
                }}
              >
                {tone}
              </button>
            ))}
          </div>

          {/* Reply form */}
          <div className="space-y-3">
            <textarea
              value={replyText}
              onChange={(e) => {
                e.stopPropagation();
                setReplyText(e.target.value);
              }}
              onClick={(e) => e.stopPropagation()}
              placeholder="Write a reply, or generate a draft above…"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-500 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-400/20 transition"
              rows={4}
            />

            {/* Cancel and Post buttons */}
            <div className="flex gap-2 justify-end">
              <button
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(false);
                }}
              >
                Cancel
              </button>
              <button
                className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 transition"
                onClick={(e) => e.stopPropagation()}
              >
                Post reply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
