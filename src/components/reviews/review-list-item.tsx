"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { buildReviewReplyDraft, formatReviewDate, stars, truncateReviewBody, type ReviewWithRelations } from "@/lib/reviews";
import { deleteReview, saveReviewReply, generateAiReplyDraft } from "@/app/reviews/actions";

interface ReviewListItemProps {
  review: ReviewWithRelations;
  selected: boolean;
  aiReplyEnabled: boolean;
}

export function ReviewListItem({
  review,
  selected,
  aiReplyEnabled,
}: ReviewListItemProps) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(selected);
  const [selectedTone, setSelectedTone] = useState<string | null>(null);
  const [replyText, setReplyText] = useState(review.replyDraft || "");
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // Handler: Delete review
  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!showDeleteDialog) {
      setShowDeleteDialog(true);
      return;
    }

    setIsDeleting(true);
    try {
      await deleteReview(review.id);
      setToastMessage("Review deleted successfully");
      setTimeout(() => {
        router.refresh();
      }, 500);
    } catch (error) {
      setToastMessage(
        error instanceof Error ? error.message : "Failed to delete review"
      );
      setShowDeleteDialog(false);
      setIsDeleting(false);
    }
  };

  // Handler: Flag review
  const handleFlag = (e: React.MouseEvent) => {
    e.stopPropagation();
    setToastMessage("Review flagged for review");
    console.log("Flag review:", review.id);
  };

  // Handler: Open on Google
  const handleOpenOnGoogle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (review.sourceReviewUrl) {
      window.open(review.sourceReviewUrl, "_blank");
    } else {
      setToastMessage("No Google URL available for this review");
    }
  };

  // Handler: Regenerate AI draft
  const handleRegenerate = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsGenerating(true);
    try {
      const result = await generateAiReplyDraft(review.id);
      if (result.success && result.draft) {
        setReplyText(result.draft);
        setToastMessage("AI draft regenerated successfully");
      } else {
        setToastMessage(result.error || "Failed to regenerate draft");
      }
    } catch (error) {
      setToastMessage(error instanceof Error ? error.message : "Failed to regenerate draft");
    } finally {
      setIsGenerating(false);
    }
  };

  // Handler: Post reply
  const handlePostReply = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!replyText.trim()) return;

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.set("reviewId", review.id);
      formData.set("replyDraft", replyText.trim());
      formData.set("markSent", "true");
      formData.set("sendToGoogle", review.source === "GOOGLE" ? "false" : "false");

      await saveReviewReply(formData);
      setToastMessage("Reply saved successfully");
      setIsExpanded(false);
      router.refresh();
    } catch (error) {
      setToastMessage(error instanceof Error ? error.message : "Failed to save reply");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={`rounded-2xl border-l-4 border-l-orange-500 border bg-white shadow-sm transition-colors cursor-pointer ${
        isExpanded ? "border-slate-300" : "border-slate-200 hover:border-slate-300"
      }`}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      {/* Header section */}
      <div className="p-4">
        {/* First line: Avatar, Name, Stars, Google badge, Status badge */}
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-orange-100 text-sm font-bold text-orange-600">
              {getAvatarInitials()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-semibold text-slate-900">{review.reviewerName}</p>
                <p className="text-xs text-amber-500 flex-shrink-0">{stars(review.rating ?? 0)}</p>
                {review.source === "GOOGLE" && (
                  <span className="flex-shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                    Google
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Status badge on right */}
          <div
            className={`flex-shrink-0 inline-flex items-center gap-1 rounded-full ${statusBadge.color} px-2 py-1 text-[10px] font-semibold ${statusBadge.textColor}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${statusBadge.dotColor}`}></span>
            {statusBadge.label}
          </div>
        </div>

        {/* Second line: Location and time */}
        <div className="flex items-center gap-2 mb-3">
          {review.location && (
            <>
              <span className="text-slate-400">📍</span>
              <p className="text-xs text-slate-600">{review.location.name}</p>
              <span className="text-slate-300">•</span>
            </>
          )}
          <p className="text-xs text-slate-500">{formatTimeAgo(review.reviewedAt)}</p>
        </div>

        {/* Review body */}
        <p className="mt-3 text-sm leading-5 text-slate-700">{truncateReviewBody(review.body, 220)}</p>

        {/* Action buttons */}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            className="rounded-lg bg-teal-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-teal-700 transition flex items-center gap-1.5"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(true);
            }}
          >
            <span>↩</span>
            Reply
          </button>
          <button
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition flex items-center gap-1.5"
            onClick={handleFlag}
          >
            <span>🚩</span>
            Flag
          </button>
          {review.source === "GOOGLE" && (
            <button
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition flex items-center gap-1.5"
              onClick={handleOpenOnGoogle}
            >
              <span>↗</span>
              Open on Google
            </button>
          )}
          <button
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-50 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            <span>🗑</span>
            {showDeleteDialog ? "Confirm Delete" : "Delete"}
          </button>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      {showDeleteDialog && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={(e) => {
            e.stopPropagation();
            setShowDeleteDialog(false);
          }}
        >
          <div
            className="bg-white rounded-2xl shadow-xl p-6 max-w-sm mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-slate-900 mb-3">Delete this review?</h2>

            <div className="space-y-2 mb-6 text-sm text-slate-600">
              <p>
                <span className="font-semibold text-slate-900">{review.reviewerName}</span>
                {review.location && ` • ${review.location.name}`}
              </p>
              <p className="text-slate-500">{stars(review.rating ?? 0)}</p>
              <p className="italic text-slate-600">"{truncateReviewBody(review.body, 150)}"</p>
            </div>

            <p className="text-xs text-slate-500 mb-6">
              This will permanently remove this review from your inbox.
            </p>

            <div className="flex gap-3 justify-end">
              <button
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteDialog(false);
                }}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete review"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Expanded section */}
      {isExpanded && (
        <div className="border-t border-slate-200 p-4">
          {/* AI Suggestion header with sparkle icon */}
          <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <span>✨</span>
            AI suggestion
          </h3>

          {/* Tone buttons and Draft reply button on same line */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <div className="flex flex-wrap gap-2">
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
            <button
              className="ml-auto rounded-lg bg-teal-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-teal-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleRegenerate}
              disabled={isGenerating}
            >
              {isGenerating ? "Regenerating..." : "Draft reply"}
            </button>
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

            {/* Checkbox for posting publicly */}
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                className="rounded border-slate-300"
                defaultChecked={true}
              />
              Posts publicly as the owner
            </label>

            {/* Cancel and Post buttons */}
            <div className="flex gap-2 justify-end">
              <button
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(false);
                }}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handlePostReply}
                disabled={isSubmitting || !replyText.trim()}
              >
                {isSubmitting ? "Saving..." : "Post reply"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-4 left-4 right-4 z-40 rounded-2xl border px-4 py-3 text-sm shadow-sm ${
            toastMessage.includes("successfully") || toastMessage.includes("flagged")
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-amber-200 bg-amber-50 text-amber-800"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-3">
            <p>{toastMessage}</p>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="font-semibold opacity-70 hover:opacity-100"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
