"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatReviewDate, stars, truncateReviewBody, type ReviewWithRelations } from "@/lib/reviews";
import { deleteReview, saveReviewReply, generateAiReplyDraft } from "@/app/reviews/actions";

interface ReviewListItemProps {
  review: ReviewWithRelations;
  selected: boolean;
  aiReplyEnabled: boolean;
}

const AVATAR_COLORS = [
  { bg: "bg-amber-100", text: "text-amber-700" },
  { bg: "bg-cyan-100", text: "text-cyan-700" },
  { bg: "bg-rose-100", text: "text-rose-700" },
  { bg: "bg-violet-100", text: "text-violet-700" },
  { bg: "bg-emerald-100", text: "text-emerald-700" },
  { bg: "bg-blue-100", text: "text-blue-700" },
  { bg: "bg-orange-100", text: "text-orange-700" },
  { bg: "bg-teal-100", text: "text-teal-700" },
];

function avatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash) + name.charCodeAt(i);
    hash = hash & hash;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

function timeAgo(date: Date | null): string {
  if (!date) return "";
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return formatReviewDate(date);
}

export function ReviewListItem({ review, selected, aiReplyEnabled }: ReviewListItemProps) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(selected);
  const [selectedTone, setSelectedTone] = useState<string>("Warm");
  const [replyText, setReplyText] = useState(review.replyDraft ?? "");
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasReply = !!(review.replyPublishedAt || review.replySentAt || review.sourceReplyText);
  const color = avatarColor(review.reviewerName);

  const statusBadge = hasReply
    ? { label: "Replied", dot: "bg-emerald-500", pill: "bg-emerald-50 text-emerald-700" }
    : (review.rating ?? 5) < 4
    ? { label: "Needs attention", dot: "bg-red-500", pill: "bg-red-50 text-red-700" }
    : { label: "Needs reply", dot: "bg-amber-500", pill: "bg-amber-50 text-amber-700" };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!showDeleteDialog) { setShowDeleteDialog(true); return; }
    setIsDeleting(true);
    try {
      await deleteReview(review.id);
      setTimeout(() => router.refresh(), 400);
    } catch {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleOpenOnGoogle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (review.sourceReviewUrl) window.open(review.sourceReviewUrl, "_blank");
  };

  const handleDraftReply = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsGenerating(true);
    try {
      const result = await generateAiReplyDraft(review.id);
      if (result.success && result.draft) setReplyText(result.draft);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePostReply = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!replyText.trim()) return;
    setIsSubmitting(true);
    try {
      const fd = new FormData();
      fd.set("reviewId", review.id);
      fd.set("replyDraft", replyText.trim());
      fd.set("markSent", "true");
      fd.set("sendToGoogle", "false");
      await saveReviewReply(fd);
      setIsExpanded(false);
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div
        className={`relative rounded-xl border bg-white shadow-sm transition overflow-hidden cursor-pointer ${
          isExpanded ? "border-slate-300 ring-1 ring-slate-200" : "border-slate-200 hover:border-slate-300"
        }`}
        onClick={() => setIsExpanded((v) => !v)}
      >
        {/* Left accent bar */}
        <div className="absolute inset-y-0 left-0 w-1 bg-orange-400 rounded-l-xl" />

        <div className="pl-5 pr-4 pt-4 pb-4">
          {/* Row 1: Avatar + Name + Stars + Source + Status badge */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${color.bg} ${color.text}`}>
                {initials(review.reviewerName)}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-slate-900 text-sm">{review.reviewerName}</span>
                  <span className="text-amber-400 text-sm tracking-tight">{stars(review.rating ?? 0)}</span>
                  {review.source === "GOOGLE" && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                      {/* Google G icon */}
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                      Google
                    </span>
                  )}
                </div>
                {/* Row 2: Location + time */}
                <div className="flex items-center gap-1 mt-0.5">
                  {review.location && (
                    <>
                      <svg className="w-3 h-3 text-slate-400 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                      </svg>
                      <span className="text-xs text-slate-500">{review.location.name}</span>
                      <span className="text-xs text-slate-300">·</span>
                    </>
                  )}
                  <span className="text-xs text-slate-500">{timeAgo(review.reviewedAt)}</span>
                </div>
              </div>
            </div>

            {/* Status badge */}
            <span className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusBadge.pill}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${statusBadge.dot}`} />
              {statusBadge.label}
            </span>
          </div>

          {/* Review body */}
          <p className="mt-3 text-sm text-slate-700 leading-relaxed">{truncateReviewBody(review.body, 220)}</p>

          {/* Action buttons */}
          <div className="mt-3 flex items-center gap-1 flex-wrap">
            <button
              onClick={(e) => { e.stopPropagation(); setIsExpanded(true); }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-teal-700 transition"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 14 4 9 9 4" /><path d="M20 20v-7a4 4 0 0 0-4-4H4" />
              </svg>
              Reply
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>
              </svg>
              Flag
            </button>
            <button
              onClick={handleOpenOnGoogle}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
              Open on Google
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-red-500 hover:bg-red-50 transition disabled:opacity-50"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
              </svg>
              Delete
            </button>
          </div>

          {/* Owner reply section (for already-replied reviews) */}
          {hasReply && review.sourceReplyText && !isExpanded && (
            <div className="mt-3 rounded-lg bg-slate-50 border border-slate-100 px-3 py-2.5">
              <p className="text-xs font-medium text-teal-600 mb-1 flex items-center gap-1">
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 14 4 9 9 4" /><path d="M20 20v-7a4 4 0 0 0-4-4H4" />
                </svg>
                Owner reply · {timeAgo(review.replyPublishedAt ?? review.replySentAt)}
              </p>
              <p className="text-sm text-slate-700">{review.sourceReplyText}</p>
            </div>
          )}
        </div>

        {/* Expanded reply section */}
        {isExpanded && (
          <div
            className="border-t border-slate-100 bg-slate-50/60 px-5 pt-4 pb-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* AI suggestion header row */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                <svg className="w-3.5 h-3.5 text-teal-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
                </svg>
                AI suggestion
              </div>
              <div className="flex items-center gap-2">
                {/* Tone buttons */}
                <div className="flex items-center rounded-lg border border-slate-200 bg-white overflow-hidden">
                  {["Warm", "Professional", "Concise", "Apologetic"].map((tone) => (
                    <button
                      key={tone}
                      onClick={(e) => { e.stopPropagation(); setSelectedTone(tone); }}
                      className={`px-3 py-1.5 text-xs font-semibold border-r border-slate-200 last:border-r-0 transition ${
                        selectedTone === tone
                          ? "bg-slate-900 text-white"
                          : "bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {tone}
                    </button>
                  ))}
                </div>
                {/* Draft reply button */}
                <button
                  onClick={handleDraftReply}
                  disabled={isGenerating}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700 transition disabled:opacity-60"
                >
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
                  </svg>
                  {isGenerating ? "Drafting…" : "Draft reply"}
                </button>
              </div>
            </div>

            {/* Reply textarea */}
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              placeholder="Write a reply, or generate a draft above…"
              rows={4}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400/30 focus:border-teal-400 transition resize-none"
            />

            {/* Footer row */}
            <div className="mt-3 flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                Posts publicly as the owner
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); setIsExpanded(false); }}
                  className="rounded-lg px-4 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePostReply}
                  disabled={isSubmitting || !replyText.trim()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-teal-700 transition disabled:opacity-50"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                  </svg>
                  {isSubmitting ? "Posting…" : "Post reply"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowDeleteDialog(false)}>
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3 mb-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-100">
                <svg className="w-4 h-4 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900">Delete this review?</h2>
                <p className="text-sm text-slate-500 mt-0.5">This will remove this review from your inbox.</p>
              </div>
            </div>
            <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 mb-4">
              <p className="font-medium">{review.reviewerName}{review.location && ` · ${review.location.name}`}</p>
              <p className="text-xs text-slate-500 mt-1 line-clamp-2">{review.body}</p>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowDeleteDialog(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition">
                Cancel
              </button>
              <button onClick={handleDelete} disabled={isDeleting} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition disabled:opacity-50">
                {isDeleting ? "Deleting…" : "Delete review"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
