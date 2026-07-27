"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatReviewDate, truncateReviewBody, type ReviewWithRelations } from "@/lib/reviews";
import { deleteReview, saveReviewReplyInline, generateAiReplyDraft } from "@/app/reviews/actions";

interface ReviewListItemProps {
  review: ReviewWithRelations;
  selected: boolean;
  aiReplyEnabled: boolean;
}

const TONES = ["Warm", "Professional", "Concise", "Apologetic"] as const;

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
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

function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  return (
    <span
      aria-hidden
      style={{
        width: size, height: size, borderRadius: "50%", flex: "none", display: "grid", placeItems: "center",
        background: "var(--accent-soft)", color: "var(--accent-strong)", fontWeight: 640, fontSize: Math.round(size * 0.4),
      }}
    >
      {initials(name)}
    </span>
  );
}

function StarRow({ value, size = 13 }: { value: number; size?: number }) {
  return (
    <span style={{ display: "inline-flex", gap: 1 }} aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <svg key={n} width={size} height={size} viewBox="0 0 24 24" fill={n <= value ? "var(--star)" : "var(--ink-200)"}>
          <path d="M12 3.6l2.6 5.3 5.8.85-4.2 4.1 1 5.78L12 17.9l-5.2 2.73 1-5.78-4.2-4.1 5.8-.85z" />
        </svg>
      ))}
    </span>
  );
}

function GoogleG({ size = 11 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

const replyIcon = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 14 4 9 9 4" /><path d="M20 20v-7a4 4 0 0 0-4-4H4" />
  </svg>
);

export function ReviewListItem({ review, selected }: ReviewListItemProps) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(selected);
  const [selectedTone, setSelectedTone] = useState<string>("Warm");
  const [replyText, setReplyText] = useState(review.replyDraft ?? "");
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);

  const hasReply = !!(review.replyPublishedAt || review.replySentAt || review.sourceReplyText);
  const negative = (review.rating ?? 5) < 4;

  const status = hasReply
    ? { label: "Replied", cls: "badge-success", dot: "var(--success)" }
    : negative
    ? { label: "Needs attention", cls: "badge-danger", dot: "var(--danger)" }
    : { label: "Needs reply", cls: "badge-warning", dot: "var(--warning)" };

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

  const handleOpenExternal = (e: React.MouseEvent) => {
    e.stopPropagation();
    let url: string | null = null;
    if (review.source === "GOOGLE") {
      url =
        review.sourceReviewUrl ??
        (review.location?.googlePlaceId
          ? `https://search.google.com/local/reviews?placeid=${encodeURIComponent(review.location.googlePlaceId)}`
          : null);
    } else if (review.source === "INTERNAL") {
      url = review.location?.slug ? `/b/${review.location.slug}` : null;
    } else {
      url = review.sourceReviewUrl ?? null;
    }
    if (url) window.open(url, "_blank");
  };

  const externalButtonLabel =
    review.source === "GOOGLE"
      ? "Open on Google"
      : review.source === "INTERNAL"
      ? "View on WeHearYou"
      : review.sourceReviewUrl
      ? "View original"
      : null;

  const hasExternalUrl =
    review.source === "GOOGLE"
      ? !!(review.sourceReviewUrl || review.location?.googlePlaceId)
      : review.source === "INTERNAL"
      ? !!review.location?.slug
      : !!review.sourceReviewUrl;

  const handleDraftReply = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsGenerating(true);
    try {
      const result = await generateAiReplyDraft(review.id, selectedTone);
      if (result.success && result.draft) setReplyText(result.draft);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePostReply = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!replyText.trim()) return;
    setIsSubmitting(true);
    setPostError(null);
    try {
      const fd = new FormData();
      fd.set("reviewId", review.id);
      fd.set("replyDraft", replyText.trim());
      const result = await saveReviewReplyInline(fd);
      if (result.success) {
        setIsExpanded(false);
        router.refresh();
      } else {
        setPostError(result.error ?? "Failed to post reply");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div
        onClick={() => setIsExpanded((v) => !v)}
        style={{
          position: "relative", borderRadius: "var(--r-md)", background: "var(--white)", overflow: "hidden", cursor: "pointer",
          border: `1px solid ${isExpanded ? "var(--ink-300)" : "var(--ink-150)"}`,
          boxShadow: isExpanded ? "var(--shadow-sm)" : "var(--shadow-xs)",
          transition: "border-color .14s, box-shadow .14s",
        }}
      >
        {/* Left status rail — only for reviews still needing a reply */}
        {!hasReply && (
          <span style={{ position: "absolute", left: 0, top: 14, bottom: 14, width: 3, borderRadius: 3, background: negative ? "var(--danger)" : "var(--warning)" }} />
        )}

        <div style={{ padding: 16, paddingLeft: 18 }}>
          {/* Row 1: avatar + name + stars + source, status badge on the right */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
              <Avatar name={review.reviewerName} size={36} />
              <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 13.5, fontWeight: 620, color: "var(--ink-900)" }}>{review.reviewerName}</span>
                  <StarRow value={review.rating ?? 0} size={13} />
                  {review.source === "GOOGLE" && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--ink-400)" }}>
                      <GoogleG size={11} />Google
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2, fontSize: 11.5, color: "var(--ink-400)" }}>
                  {review.location && (
                    <>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style={{ flex: "none" }}>
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                      </svg>
                      <span>{review.location.name}</span>
                      <span>·</span>
                    </>
                  )}
                  <span>{timeAgo(review.reviewedAt)}</span>
                </div>
              </div>
            </div>

            <span className={`badge ${status.cls}`} style={{ flex: "none" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: status.dot }} />
              {status.label}
            </span>
          </div>

          {/* Review body */}
          <p style={{ fontSize: 13.3, lineHeight: 1.55, color: "var(--ink-700)", margin: "12px 0 0" }}>
            {truncateReviewBody(review.body, 220)}
          </p>

          {/* Owner reply (collapsed, already replied) */}
          {hasReply && review.sourceReplyText && !isExpanded && (
            <div style={{ borderLeft: "2px solid var(--accent-border)", paddingLeft: 12, marginTop: 12 }}>
              <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--accent-strong)", marginBottom: 3, display: "flex", alignItems: "center", gap: 5 }}>
                {replyIcon}Owner reply · {timeAgo(review.replyPublishedAt ?? review.replySentAt)}
              </div>
              <p style={{ fontSize: 12.8, color: "var(--ink-600)", lineHeight: 1.5 }}>{review.sourceReplyText}</p>
            </div>
          )}

          {/* Action buttons */}
          {!hasReply ? (
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 12 }}>
              <button type="button" className="btn btn-primary btn-sm" onClick={(e) => { e.stopPropagation(); setIsExpanded(true); }}>
                {replyIcon}Reply
              </button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={(e) => e.stopPropagation()}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>
                </svg>
                Flag
              </button>
              {hasExternalUrl && externalButtonLabel && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={handleOpenExternal}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                  </svg>
                  {externalButtonLabel}
                </button>
              )}
              <button type="button" className="btn btn-ghost btn-sm" style={{ color: "var(--danger)" }} onClick={handleDelete} disabled={isDeleting}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                </svg>
                Delete
              </button>
            </div>
          ) : (
            <button type="button" className="btn btn-ghost btn-sm" style={{ color: "var(--danger)", marginTop: 10 }} onClick={handleDelete} disabled={isDeleting}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
              </svg>
              Delete
            </button>
          )}
        </div>

        {/* Expanded reply composer */}
        {isExpanded && !hasReply && (
          <div
            className="anim-up"
            onClick={(e) => e.stopPropagation()}
            style={{ borderTop: "1px solid var(--ink-150)", background: "var(--ink-50)", padding: "14px 16px 16px 18px" }}
          >
            {/* AI suggestion header */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 11, flexWrap: "wrap" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
              </svg>
              <span style={{ fontSize: 12, color: "var(--ink-500)" }}>AI suggestion</span>
              <div className="seg" style={{ marginLeft: "auto" }}>
                {TONES.map((tone) => (
                  <button key={tone} type="button" data-active={selectedTone === tone} onClick={(e) => { e.stopPropagation(); setSelectedTone(tone); }}>
                    {tone}
                  </button>
                ))}
              </div>
              <button type="button" className="btn btn-soft btn-sm" onClick={handleDraftReply} disabled={isGenerating}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
                </svg>
                {isGenerating ? "Drafting…" : replyText ? "Regenerate" : "Draft reply"}
              </button>
            </div>

            {/* Reply textarea */}
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              placeholder="Write a reply, or generate a draft above…"
              rows={4}
              style={{
                width: "100%", border: "1px solid var(--ink-200)", borderRadius: "var(--r-sm)", resize: "vertical",
                padding: "11px 12px", fontSize: 13.3, fontFamily: "inherit", color: "var(--ink-800)", background: "var(--white)",
                outline: "none", lineHeight: 1.55,
              }}
            />

            {postError && <p style={{ fontSize: 12, color: "var(--danger)", fontWeight: 540, margin: "8px 0 0" }}>{postError}</p>}

            {/* Footer */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 11, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11.5, color: "var(--ink-400)", display: "inline-flex", alignItems: "center", gap: 5 }}>
                <GoogleG size={13} />Posts publicly as the owner
              </span>
              <button type="button" className="btn btn-ghost btn-sm" style={{ marginLeft: "auto" }} onClick={(e) => { e.stopPropagation(); setIsExpanded(false); }}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary btn-sm" onClick={handlePostReply} disabled={isSubmitting || !replyText.trim()}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
                {isSubmitting ? "Posting…" : "Post reply"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      {showDeleteDialog && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(13,13,18,.4)", display: "grid", placeItems: "center", zIndex: 50, padding: 16 }}
          onClick={() => setShowDeleteDialog(false)}
        >
          <div className="card anim-up" style={{ maxWidth: 400, width: "100%", padding: 22, boxShadow: "var(--shadow-pop)" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
              <span style={{ width: 36, height: 36, borderRadius: "50%", flex: "none", display: "grid", placeItems: "center", background: "var(--danger-soft)", color: "var(--danger)" }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </span>
              <div style={{ minWidth: 0 }}>
                <h2 style={{ fontSize: 15.5, fontWeight: 660, color: "var(--ink-900)" }}>Delete this review?</h2>
                <p style={{ fontSize: 13, color: "var(--ink-500)", marginTop: 2 }}>This will remove this review from your inbox.</p>
              </div>
            </div>
            <div style={{ borderRadius: "var(--r-sm)", border: "1px solid var(--ink-150)", background: "var(--ink-50)", padding: "10px 12px", marginBottom: 16 }}>
              <p style={{ fontSize: 13, fontWeight: 560, color: "var(--ink-800)" }}>
                {review.reviewerName}{review.location && ` · ${review.location.name}`}
              </p>
              <p style={{ fontSize: 12, color: "var(--ink-500)", marginTop: 4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                {review.body}
              </p>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowDeleteDialog(false)}>Cancel</button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ background: "var(--danger)" }}
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting…" : "Delete review"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
